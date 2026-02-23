"""
routes/vision_routes.py - Vision API endpoints:
  POST /process-frame  (single frame inference)
  GET  /live-feed      (WebSocket stream)
  GET  /cameras        (list active cameras)
"""
import asyncio
import base64
import json
import os
import tempfile
import time
import uuid
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from PIL import Image
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from database import crud
from database.models import ActivityType

router = APIRouter(prefix="/api/v1", tags=["Vision"])


# ── Request / Response Models ─────────────────────────────────────────────────

class FrameProcessRequest(BaseModel):
    camera_id: str
    image_b64: str              # base64-encoded JPEG/PNG
    run_attributes: bool = True
    run_reid: bool = True
    reid_threshold: float = 0.85


class FrameProcessResponse(BaseModel):
    camera_id: str
    frame_id: int
    person_count: int
    persons: list
    latency: dict
    fps: float
    timestamp: float


# ── Dependency: get vision pipeline singleton ──────────────────────────────────

def get_pipeline():
    from app import vision_pipeline
    return vision_pipeline


def get_movement_graph():
    from app import movement_graph
    return movement_graph


# ── POST /process-frame ───────────────────────────────────────────────────────

@router.post("/process-frame", response_model=FrameProcessResponse, summary="Process a single camera frame")
async def process_frame(
    request: FrameProcessRequest,
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    graph=Depends(get_movement_graph),
):
    """
    Submit a single camera frame for full vision pipeline processing.
    Returns detected persons with tracking IDs, ReID matches, and attributes.
    """
    try:
        result = pipeline.process_frame(
            image_input=request.image_b64,
            camera_id=request.camera_id,
            run_attributes=request.run_attributes,
            run_reid=request.run_reid,
            reid_threshold=request.reid_threshold,
        )
    except Exception as e:
        logger.error(f"Vision pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Persist events to database
    for person in result.get("persons", []):
        person_id_str = person.get("assigned_person_id")
        if not person_id_str:
            continue
        try:
            person_uuid = uuid.UUID(person_id_str)
        except ValueError:
            continue

        # Upsert person record
        db_person = await crud.get_person(db, person_uuid)
        if db_person is None and person.get("is_new_person"):
            db_person = await crud.create_person(
                db,
                faiss_id=person.get("faiss_id"),
                attributes=person.get("attributes"),
            )

        if db_person:
            await crud.update_person_last_seen(db, db_person.id)
            await crud.create_event(
                db,
                person_id=db_person.id,
                camera_id=request.camera_id,
                activity_type=ActivityType.DETECTED,
                bounding_box={"x1": person["bbox"][0], "y1": person["bbox"][1],
                               "x2": person["bbox"][2], "y2": person["bbox"][3]},
                confidence=person.get("score"),
                track_id=person.get("track_id"),
                raw_metadata={"reid_matches": person.get("reid_matches", [])},
            )

            # Update movement graph
            graph.add_observation(
                person_id=str(db_person.id),
                camera_id=request.camera_id,
                timestamp=result["timestamp"],
            )

    return JSONResponse(content=result)


# ── POST /process-frame/upload (multipart form data) ─────────────────────────

@router.post("/process-frame/upload", summary="Upload image file for processing")
async def process_frame_upload(
    camera_id: str = Form(...),
    run_attributes: bool = Form(True),
    run_reid: bool = Form(True),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    pipeline=Depends(get_pipeline),
    graph=Depends(get_movement_graph),
):
    """Submit a frame via multipart file upload."""
    content = await image.read()
    b64 = base64.b64encode(content).decode()
    # Reuse main endpoint logic via internal call
    from routes.vision_routes import process_frame, FrameProcessRequest
    req = FrameProcessRequest(
        camera_id=camera_id,
        image_b64=b64,
        run_attributes=run_attributes,
        run_reid=run_reid,
    )
    return await process_frame(req, db, pipeline, graph)


# ── POST /analyze-video ──────────────────────────────────────────────────────

@router.post("/analyze-video", summary="Upload a video file and stream per-frame detection results via SSE")
async def analyze_video(
    camera_id: str = Form("VIDEO-UPLOAD"),
    frame_interval: int = Form(5),
    run_attributes: bool = Form(True),
    run_reid: bool = Form(True),
    video: UploadFile = File(...),
    pipeline=Depends(get_pipeline),
):
    """
    Upload a video file. Frames are sampled every `frame_interval` frames.
    Results are streamed back as Server-Sent Events (SSE).

    SSE event format:
      data: {"type": "frame",   "frame_id": int, "timestamp_sec": float, ...}
      data: {"type": "summary", "total_frames": int, "unique_persons": int, ...}
      data: {"type": "error",   "message": str}
    """
    # Read video bytes into a temp file (cv2 needs a real path on Windows)
    content = await video.read()
    suffix = os.path.splitext(video.filename or ".mp4")[1] or ".mp4"

    async def event_stream():
        tmp_path = None
        try:
            import cv2
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                yield f"data: {json.dumps({'type': 'error', 'message': 'Cannot open video file'})}\n\n"
                return

            fps_native  = cap.get(cv2.CAP_PROP_FPS) or 25.0
            total_raw   = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            total_sampled = max(1, total_raw // max(1, frame_interval))

            # Metadata handshake
            yield f"data: {json.dumps({'type': 'meta', 'total_sampled': total_sampled, 'fps_native': fps_native, 'total_frames_raw': total_raw})}\n\n"

            raw_idx        = 0
            processed_idx  = 0
            unique_ids     = set()
            peak_count     = 0
            t_video_start  = time.time()

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if raw_idx % max(1, frame_interval) == 0:
                    # Convert BGR → RGB → PIL
                    import numpy as np
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(rgb)
                    timestamp_sec = round(raw_idx / fps_native, 3)

                    try:
                        result = pipeline.process_frame(
                            image_input=pil_img,
                            camera_id=camera_id,
                            run_attributes=run_attributes,
                            run_reid=run_reid,
                        )
                    except Exception as e:
                        logger.warning(f"Frame {raw_idx} error: {e}")
                        raw_idx += 1
                        continue

                    persons = result.get("persons", [])
                    for p in persons:
                        pid = p.get("assigned_person_id")
                        if pid:
                            unique_ids.add(pid)
                    peak_count = max(peak_count, len(persons))

                    # Slim down persons payload for SSE
                    slim_persons = [
                        {
                            "track_id":   p.get("track_id"),
                            "bbox":       p.get("bbox"),
                            "score":      round(p.get("score", 0), 3),
                            "is_new":     p.get("is_new_person", False),
                            "attributes": p.get("attributes", {}),
                            "reid_sim":   round(p["reid_matches"][0]["similarity"], 3)
                                          if p.get("reid_matches") else None,
                        }
                        for p in persons
                    ]

                    event = {
                        "type":          "frame",
                        "frame_id":      processed_idx,
                        "raw_frame":     raw_idx,
                        "timestamp_sec": timestamp_sec,
                        "person_count":  len(persons),
                        "persons":       slim_persons,
                        "latency_ms":    round(result["latency"]["total_ms"], 1),
                        "progress":      round((processed_idx + 1) / total_sampled * 100, 1),
                    }
                    yield f"data: {json.dumps(event)}\n\n"
                    processed_idx += 1

                    # Yield control so FastAPI can flush the buffer
                    await asyncio.sleep(0)

                raw_idx += 1

            cap.release()
            duration_sec = round(time.time() - t_video_start, 2)

            summary = {
                "type":             "summary",
                "total_frames_processed": processed_idx,
                "unique_person_count":     len(unique_ids),
                "peak_person_count":       peak_count,
                "duration_sec":            duration_sec,
                "video_duration_sec":      round(total_raw / fps_native, 2),
            }
            yield f"data: {json.dumps(summary)}\n\n"
            logger.info(f"Video analysis done — {processed_idx} frames, {len(unique_ids)} unique persons")

        except Exception as e:
            logger.error(f"analyze_video error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":      "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":         "keep-alive",
        },
    )


# ── GET /cameras ──────────────────────────────────────────────────────────────

@router.get("/cameras", summary="List active cameras and their status")
async def list_cameras(pipeline=Depends(get_pipeline), graph=Depends(get_movement_graph)):
    summary = graph.get_movement_summary()
    trackers = list(pipeline.tracker_manager._trackers.keys())
    fps_data = {cam: pipeline._compute_fps(cam) for cam in trackers}
    return {
        "active_cameras": trackers,
        "fps_per_camera": fps_data,
        "movement_graph_summary": summary,
    }


# ── WebSocket /live-feed ──────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, ws: WebSocket):
        self.active_connections.remove(ws)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: dict):
        import json
        msg = json.dumps(data)
        for conn in self.active_connections:
            try:
                await conn.send_text(msg)
            except Exception:
                pass


ws_manager = ConnectionManager()


@router.websocket("/live-feed")
async def live_feed_websocket(websocket: WebSocket, pipeline=Depends(get_pipeline)):
    """
    WebSocket endpoint for realtime surveillance feed.
    Client sends: {"camera_id": str, "image_b64": str}
    Server broadcasts processed results to all connected clients.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            camera_id = data.get("camera_id", "cam-0")
            image_b64 = data.get("image_b64", "")
            if not image_b64:
                await websocket.send_json({"error": "No image provided"})
                continue
            result = pipeline.process_frame(
                image_input=image_b64,
                camera_id=camera_id,
                run_attributes=data.get("run_attributes", False),
                run_reid=data.get("run_reid", True),
            )
            await websocket.send_json(result)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
