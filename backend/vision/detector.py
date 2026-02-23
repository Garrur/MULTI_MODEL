"""
vision/detector.py - Person Detection using facebook/detr-resnet-50
"""
import time
import torch
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from transformers import DetrImageProcessor, DetrForObjectDetection
from loguru import logger
from config import settings, DEVICE


class PersonDetector:
    """
    DETR-based person detector.
    Returns bounding boxes, confidence scores, and processing latency.
    """

    PERSON_LABEL = "person"
    COCO_LABEL_MAP = None  # populated after model loads

    def __init__(self):
        logger.info(f"Loading detection model: {settings.DETECTION_MODEL}")
        self.processor = DetrImageProcessor.from_pretrained(settings.DETECTION_MODEL)
        self.model = DetrForObjectDetection.from_pretrained(settings.DETECTION_MODEL)
        self.model.to(DEVICE)
        self.model.eval()

        # Build label → id map
        self.id2label = self.model.config.id2label
        self.person_label_ids = [
            k for k, v in self.id2label.items() if v.lower() == self.PERSON_LABEL
        ]
        logger.info(f"✅ PersonDetector ready on {DEVICE}. Person class ids: {self.person_label_ids}")

    @torch.inference_mode()
    def detect(
        self,
        image: Image.Image,
        confidence_threshold: Optional[float] = None,
    ) -> Tuple[List[Dict], float]:
        """
        Detect persons in a PIL image.

        Returns:
            detections: list of {"bbox": [x1,y1,x2,y2], "score": float, "label": "person"}
            latency_ms: inference time in milliseconds
        """
        threshold = confidence_threshold or settings.DETECTION_CONFIDENCE

        t0 = time.perf_counter()
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
        outputs = self.model(**inputs)
        t1 = time.perf_counter()
        latency_ms = (t1 - t0) * 1000

        # Post-process to original image size
        target_sizes = torch.tensor([image.size[::-1]], device=DEVICE)  # (H, W)
        results = self.processor.post_process_object_detection(
            outputs, threshold=threshold, target_sizes=target_sizes
        )[0]

        detections = []
        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            label_id = label.item()
            if label_id in self.person_label_ids:
                x1, y1, x2, y2 = box.tolist()
                detections.append({
                    "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                    "score": round(score.item(), 4),
                    "label": "person",
                })

        logger.debug(f"Detected {len(detections)} persons in {latency_ms:.1f}ms")
        return detections, latency_ms

    def detect_batch(
        self,
        images: List[Image.Image],
        confidence_threshold: Optional[float] = None,
    ) -> List[Tuple[List[Dict], float]]:
        """Batch detection for multiple frames."""
        return [self.detect(img, confidence_threshold) for img in images]

    @staticmethod
    def crop_person(image: Image.Image, bbox: List[float]) -> Image.Image:
        """Crop a person region from image given bbox [x1, y1, x2, y2]."""
        x1, y1, x2, y2 = [int(v) for v in bbox]
        return image.crop((x1, y1, x2, y2))
