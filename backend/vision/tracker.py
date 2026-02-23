"""
vision/tracker.py - Multi-Object Tracking using ByteTrack algorithm
Assigns persistent track IDs across frames for each camera.
"""
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from loguru import logger
from config import settings


@dataclass
class Track:
    track_id: int
    bbox: List[float]       # [x1, y1, x2, y2]
    score: float
    age: int = 0
    hits: int = 1
    time_since_update: int = 0
    state: str = "active"   # active | lost | removed
    history: List[List[float]] = field(default_factory=list)

    def update(self, bbox: List[float], score: float):
        self.bbox = bbox
        self.score = score
        self.hits += 1
        self.age += 1
        self.time_since_update = 0
        self.state = "active"
        self.history.append(bbox)
        if len(self.history) > 30:
            self.history.pop(0)

    def predict(self):
        """Simple linear prediction (extend with Kalman for production)."""
        self.time_since_update += 1
        self.age += 1
        if self.time_since_update > settings.TRACK_BUFFER:
            self.state = "removed"
        elif self.time_since_update > 5:
            self.state = "lost"


def iou(boxA: List[float], boxB: List[float]) -> float:
    """Compute Intersection over Union between two [x1,y1,x2,y2] boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter = max(0, xB - xA) * max(0, yB - yA)
    areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    union = areaA + areaB - inter
    return inter / (union + 1e-6)


class ByteTracker:
    """
    Simplified ByteTrack-style multi-object tracker.
    Uses two-stage matching: high-confidence detections first, then low-confidence.
    One instance per camera.
    """

    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.tracks: List[Track] = []
        self._next_id = 1
        self.frame_id = 0
        logger.info(f"ByteTracker initialized for camera: {camera_id}")

    def _new_track(self, bbox: List[float], score: float) -> Track:
        t = Track(track_id=self._next_id, bbox=bbox, score=score, history=[bbox])
        self._next_id += 1
        return t

    def _match(
        self,
        detections: List[Dict],
        threshold: float = 0.5,
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """
        Greedy IoU matching between active tracks and detections.
        Returns: (matched pairs), (unmatched track indices), (unmatched det indices)
        """
        active = [i for i, t in enumerate(self.tracks) if t.state != "removed"]
        if not active or not detections:
            return [], active, list(range(len(detections)))

        iou_matrix = np.zeros((len(active), len(detections)))
        for i, ti in enumerate(active):
            for j, det in enumerate(detections):
                iou_matrix[i, j] = iou(self.tracks[ti].bbox, det["bbox"])

        matched, unmatched_tracks, unmatched_dets = [], list(active), list(range(len(detections)))
        while True:
            if iou_matrix.size == 0:
                break
            flat_idx = np.argmax(iou_matrix)
            ti_local, di = divmod(flat_idx, iou_matrix.shape[1])
            if iou_matrix[ti_local, di] < threshold:
                break
            ti_global = active[ti_local]
            matched.append((ti_global, di))
            unmatched_tracks.remove(ti_global)
            unmatched_dets.remove(di)
            iou_matrix[ti_local, :] = -1
            iou_matrix[:, di] = -1

        return matched, unmatched_tracks, unmatched_dets

    def update(self, detections: List[Dict]) -> List[Dict]:
        """
        Update tracker with new detections.

        Args:
            detections: list of {"bbox": [...], "score": float}

        Returns:
            tracked_objects: list of {"track_id": int, "bbox": [...], "score": float, "state": str}
        """
        self.frame_id += 1

        # Predict existing tracks
        for t in self.tracks:
            t.predict()

        # Remove permanently dead tracks
        self.tracks = [t for t in self.tracks if t.state != "removed"]

        # High confidence detections
        high_dets = [d for d in detections if d["score"] >= settings.TRACK_THRESH]
        low_dets = [d for d in detections if d["score"] < settings.TRACK_THRESH]

        # Stage 1: Match high-confidence detections
        matched, unmatched_tracks, unmatched_high = self._match(high_dets, threshold=settings.MATCH_THRESH)
        for ti, di in matched:
            self.tracks[ti].update(high_dets[di]["bbox"], high_dets[di]["score"])

        # Stage 2: Match remaining tracks with low-confidence detections
        remaining_unmatched = [ti for ti in unmatched_tracks if self.tracks[ti].state == "lost"]
        if remaining_unmatched and low_dets:
            low_iou_matrix = np.zeros((len(remaining_unmatched), len(low_dets)))
            for i, ti in enumerate(remaining_unmatched):
                for j, det in enumerate(low_dets):
                    low_iou_matrix[i, j] = iou(self.tracks[ti].bbox, det["bbox"])
            for i, ti in enumerate(remaining_unmatched):
                best_j = int(np.argmax(low_iou_matrix[i]))
                if low_iou_matrix[i, best_j] > 0.5:
                    self.tracks[ti].update(low_dets[best_j]["bbox"], low_dets[best_j]["score"])

        # Create new tracks for unmatched high-confidence detections
        for di in unmatched_high:
            self.tracks.append(self._new_track(high_dets[di]["bbox"], high_dets[di]["score"]))

        # Return active tracks
        return [
            {
                "track_id": t.track_id,
                "bbox": t.bbox,
                "score": t.score,
                "state": t.state,
                "age": t.age,
                "hits": t.hits,
            }
            for t in self.tracks
            if t.state == "active"
        ]


class TrackerManager:
    """Manages one ByteTracker per camera."""

    def __init__(self):
        self._trackers: Dict[str, ByteTracker] = {}

    def get_tracker(self, camera_id: str) -> ByteTracker:
        if camera_id not in self._trackers:
            self._trackers[camera_id] = ByteTracker(camera_id)
        return self._trackers[camera_id]

    def update(self, camera_id: str, detections: List[Dict]) -> List[Dict]:
        return self.get_tracker(camera_id).update(detections)

    def reset(self, camera_id: str):
        if camera_id in self._trackers:
            del self._trackers[camera_id]
