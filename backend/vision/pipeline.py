"""
vision/pipeline.py - Full Vision Inference Pipeline
Orchestrates detection → tracking → ReID → attribute recognition per frame
"""
import time
import base64
import numpy as np
import uuid
from io import BytesIO
from PIL import Image
from typing import Dict, List, Optional, Any
from loguru import logger

from vision.detector import PersonDetector
from vision.tracker import TrackerManager
from vision.reid import PersonReID
from vision.attributes import AttributeRecognizer
from config import settings


class VisionPipeline:
    """
    End-to-end vision pipeline for a single frame from a camera.
    Components initialized lazily (singletons shared across requests).
    """

    def __init__(self):
        logger.info("Initializing VisionPipeline...")
        self.detector = PersonDetector()
        self.tracker_manager = TrackerManager()
        self.reid = PersonReID()
        self.attributes = AttributeRecognizer()
        self._frame_counts: Dict[str, int] = {}
        self._fps_timers: Dict[str, List[float]] = {}
        logger.info("✅ VisionPipeline ready.")

    def _decode_image(self, image_input: Any) -> Image.Image:
        """Accept PIL Image, numpy array, bytes, or base64 string."""
        if isinstance(image_input, Image.Image):
            return image_input.convert("RGB")
        if isinstance(image_input, np.ndarray):
            return Image.fromarray(image_input).convert("RGB")
        if isinstance(image_input, bytes):
            return Image.open(BytesIO(image_input)).convert("RGB")
        if isinstance(image_input, str):
            # base64 encoded
            data = base64.b64decode(image_input)
            return Image.open(BytesIO(data)).convert("RGB")
        raise ValueError(f"Unsupported image type: {type(image_input)}")

    def _compute_fps(self, camera_id: str) -> float:
        """Compute rolling FPS over last 30 frames."""
        now = time.perf_counter()
        if camera_id not in self._fps_timers:
            self._fps_timers[camera_id] = []
        self._fps_timers[camera_id].append(now)
        if len(self._fps_timers[camera_id]) > 30:
            self._fps_timers[camera_id].pop(0)
        times = self._fps_timers[camera_id]
        if len(times) < 2:
            return 0.0
        return round((len(times) - 1) / (times[-1] - times[0]), 2)

    def process_frame(
        self,
        image_input: Any,
        camera_id: str,
        run_attributes: bool = True,
        run_reid: bool = True,
        reid_threshold: float = 0.85,
    ) -> Dict:
        """
        Full pipeline for a single frame.

        Args:
            image_input: PIL Image | numpy array | bytes | base64 str
            camera_id: unique camera identifier
            run_attributes: whether to run CLIP attribute recognition
            run_reid: whether to run ReID matching
            reid_threshold: cosine similarity threshold for ReID

        Returns:
            Result dict with detections, tracks, reid matches, attributes, and latency breakdown.
        """
        t_start = time.perf_counter()

        # 1. Decode image
        image = self._decode_image(image_input)
        w, h = image.size

        # 2. Detection
        detections, det_ms = self.detector.detect(image)

        # 3. Tracking
        t_track = time.perf_counter()
        tracks = self.tracker_manager.update(camera_id, detections)
        track_ms = (time.perf_counter() - t_track) * 1000

        # 4. Per-person: ReID + Attributes
        persons_data = []
        for track in tracks:
            bbox = track["bbox"]
            # Crop person region
            try:
                crop = PersonDetector.crop_person(image, bbox)
                if crop.width < 10 or crop.height < 10:
                    continue
            except Exception:
                continue

            person_entry: Dict = {
                "track_id": track["track_id"],
                "bbox": bbox,
                "score": track["score"],
                "camera_id": camera_id,
                "reid_matches": [],
                "attributes": {},
                "is_new_person": False,
                "assigned_person_id": None,
            }

            # 4a. ReID — try to match against gallery
            if run_reid:
                t_reid = time.perf_counter()
                reid_matches = self.reid.search(crop, top_k=3, similarity_threshold=reid_threshold)
                person_entry["reid_matches"] = reid_matches
                person_entry["reid_ms"] = round((time.perf_counter() - t_reid) * 1000, 2)

                if reid_matches:
                    person_entry["assigned_person_id"] = reid_matches[0]["person_id"]
                else:
                    # New person — register in gallery with temporary UUID
                    new_pid = str(uuid.uuid4())
                    faiss_id = self.reid.add_person(crop, new_pid, camera_id)
                    person_entry["assigned_person_id"] = new_pid
                    person_entry["is_new_person"] = True
                    person_entry["faiss_id"] = faiss_id
                    
                    import os
                    os.makedirs("static/thumbnails", exist_ok=True)
                    try:
                        crop.save(f"static/thumbnails/{new_pid}.jpg", "JPEG", quality=85)
                    except Exception as e:
                        logger.warning(f"Failed to save thumbnail for {new_pid}: {e}")

            # 4b. Attribute recognition
            if run_attributes:
                t_attr = time.perf_counter()
                attrs = self.attributes.recognize(crop)
                person_entry["attributes"] = attrs
                person_entry["attr_ms"] = round((time.perf_counter() - t_attr) * 1000, 2)

                # Also store visual embedding for attribute-based search
                if run_reid:
                    self.attributes.add_to_gallery(crop, person_entry["assigned_person_id"])

            persons_data.append(person_entry)

        total_ms = (time.perf_counter() - t_start) * 1000
        fps = self._compute_fps(camera_id)
        self._frame_counts[camera_id] = self._frame_counts.get(camera_id, 0) + 1

        return {
            "camera_id": camera_id,
            "frame_id": self._frame_counts[camera_id],
            "image_size": {"width": w, "height": h},
            "persons": persons_data,
            "person_count": len(persons_data),
            "detection_count": len(detections),
            "latency": {
                "detection_ms": round(det_ms, 2),
                "tracking_ms": round(track_ms, 2),
                "total_ms": round(total_ms, 2),
            },
            "fps": fps,
            "timestamp": time.time(),
        }
