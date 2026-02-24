from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import asyncio
from typing import List
from pydantic import BaseModel
from loguru import logger

from vision.stream_manager import stream_manager

router = APIRouter(prefix="/api/v1/streams", tags=["Streams"])

class StreamCreateRequest(BaseModel):
    camera_id: str
    source: str  # e.g. '0', 'rtsp://...', 'http://...'

@router.post("/add")
async def add_stream(request: StreamCreateRequest):
    """Start a new background stream"""
    stream_manager.add_stream(request.camera_id, request.source)
    return {"status": "added", "camera_id": request.camera_id}

@router.delete("/{camera_id}")
async def remove_stream(camera_id: str):
    """Stop a background stream"""
    stream_manager.remove_stream(camera_id)
    return {"status": "removed", "camera_id": camera_id}

@router.get("/")
async def list_streams():
    """Get active streams"""
    return {"streams": list(stream_manager.streams.keys())}

@router.get("/results")
async def stream_results():
    """Get the latest inference results for all active streams"""
    return stream_manager.results

@router.get("/feed/{camera_id}")
async def video_feed(camera_id: str, request: Request):
    """
    Multipart MJPEG video feed for `<img>` tags.
    """
    # If a feed is requested but not added, try a local fallback
    if camera_id not in stream_manager.streams:
        # Fallback to local webcam '0' for demo purposes
        stream_manager.add_stream(camera_id, "0")

    async def frame_generator():
        while True:
            if await request.is_disconnected():
                logger.info(f"Client disconnected from feed {camera_id}")
                break
                
            frame = stream_manager.get_frame(camera_id)
            if frame is None:
                await asyncio.sleep(0.1)
                continue
            
            # Yield multipart boundary + image bytes
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            
            # Target ~30fps
            await asyncio.sleep(0.033)

    return StreamingResponse(
        frame_generator(), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
