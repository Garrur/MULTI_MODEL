"""
nlp/summarizer.py - Surveillance log summarization using facebook/bart-large-cnn
"""
import time
from typing import List, Dict
from transformers import pipeline, Pipeline
from loguru import logger
from config import settings, DEVICE


class SurveillanceSummarizer:
    """Abstractive summarization of surveillance event logs using BART."""

    def __init__(self):
        logger.info(f"Loading summarization model: {settings.SUMMARIZER_MODEL}")
        device_id = 0 if str(DEVICE) == "cuda" else -1
        self.summarizer: Pipeline = pipeline(
            "summarization",
            model=settings.SUMMARIZER_MODEL,
            tokenizer=settings.SUMMARIZER_MODEL,
            device=device_id,
        )
        logger.info("✅ SurveillanceSummarizer ready.")

    def _events_to_text(self, events: List[Dict]) -> str:
        parts = []
        for e in events:
            ts = e.get("timestamp", "")
            cam = e.get("camera_id", "")
            activity = e.get("activity_type", "")
            anomaly = e.get("anomaly_score", 0.0)
            attrs = e.get("attributes", {})
            gender = attrs.get("gender", "") if attrs else ""
            color = attrs.get("color", "") if attrs else ""
            parts.append(
                f"Camera {cam} at {ts}: {gender} person in {color} clothing observed {activity} "
                f"with anomaly score {anomaly:.2f}."
            )
        return " ".join(parts)

    def summarize(
        self,
        events: List[Dict],
        min_length: int = 30,
        max_length: int = 200,
    ) -> Dict:
        """Summarize a list of surveillance events."""
        if not events:
            return {"summary": "No events to summarize.", "latency_ms": 0}

        text = self._events_to_text(events[:30])
        # BART max input is ~1024 tokens
        text = text[:3000]

        t0 = time.perf_counter()
        result = self.summarizer(
            text,
            min_length=min_length,
            max_length=max_length,
            do_sample=False,
        )
        latency_ms = (time.perf_counter() - t0) * 1000
        summary = result[0]["summary_text"]
        logger.debug(f"Summarized {len(events)} events in {latency_ms:.1f}ms")
        return {
            "summary": summary,
            "event_count": len(events),
            "latency_ms": round(latency_ms, 2),
        }

    def summarize_text(self, text: str, min_length: int = 30, max_length: int = 150) -> str:
        """Summarize arbitrary text string."""
        text = text[:3000]
        result = self.summarizer(text, min_length=min_length, max_length=max_length, do_sample=False)
        return result[0]["summary_text"]
