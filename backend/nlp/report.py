"""
nlp/report.py - Incident Report Generation using google/flan-t5-base
"""
import time
from typing import Dict, List, Optional
from transformers import pipeline, Pipeline
from loguru import logger
from config import settings, DEVICE


REPORT_PROMPT_TEMPLATE = """Generate a structured surveillance incident report based on the following events:

Events:
{events_summary}

Format the report as:
INCIDENT REPORT
Date/Time: [datetime]
Cameras Involved: [cameras]
Subject Description: [physical description]
Activity Observed: [description of events]
Anomaly Level: [low/medium/high]
Recommended Action: [action]
"""


class IncidentReportGenerator:
    """
    Generates structured incident reports from surveillance events using Flan-T5.
    """

    def __init__(self):
        logger.info(f"Loading report generation model: {settings.REPORT_MODEL}")
        device_id = 0 if str(DEVICE) == "cuda" else -1
        self.generator: Pipeline = pipeline(
            "text2text-generation",
            model=settings.REPORT_MODEL,
            tokenizer=settings.REPORT_MODEL,
            device=device_id,
        )
        logger.info("✅ IncidentReportGenerator ready.")

    def _format_events(self, events: List[Dict]) -> str:
        """Format events list into a readable string for the prompt."""
        lines = []
        for i, e in enumerate(events, 1):
            ts = e.get("timestamp", "unknown time")
            cam = e.get("camera_id", "unknown camera")
            activity = e.get("activity_type", "detected")
            attrs = e.get("attributes", {})
            gender = attrs.get("gender", "") if attrs else ""
            color = attrs.get("color", "") if attrs else ""
            anomaly_score = e.get("anomaly_score", 0.0)
            lines.append(
                f"{i}. [{ts}] Camera {cam}: {gender} person in {color} clothing, "
                f"activity={activity}, anomaly_score={anomaly_score:.2f}"
            )
        return "\n".join(lines)

    def generate(
        self,
        events: List[Dict],
        person_id: Optional[str] = None,
        max_length: int = 512,
        severity_hint: Optional[str] = None,
    ) -> Dict:
        """
        Generate a structured incident report from a list of event records.

        Returns:
            {"report_text": str, "severity": str, "latency_ms": float}
        """
        if not events:
            return {"report_text": "No events provided for report generation.", "severity": "low"}

        events_summary = self._format_events(events[:20])  # limit for token budget
        prompt = REPORT_PROMPT_TEMPLATE.format(events_summary=events_summary)
        if person_id:
            prompt = f"Person ID: {person_id[:8]}\n" + prompt

        t0 = time.perf_counter()
        outputs = self.generator(
            prompt,
            max_new_tokens=max_length,
            num_beams=4,
            early_stopping=True,
            no_repeat_ngram_size=3,
        )
        latency_ms = (time.perf_counter() - t0) * 1000
        report_text = outputs[0]["generated_text"]

        # Determine severity from anomaly scores
        scores = [e.get("anomaly_score", 0.0) for e in events]
        avg_anomaly = sum(scores) / max(len(scores), 1)
        if avg_anomaly > 0.8:
            severity = "critical"
        elif avg_anomaly > 0.6:
            severity = "high"
        elif avg_anomaly > 0.3:
            severity = "medium"
        else:
            severity = "low"

        severity = severity_hint or severity
        logger.info(f"Report generated in {latency_ms:.1f}ms | severity={severity}")

        return {
            "report_text": report_text,
            "severity": severity,
            "event_count": len(events),
            "avg_anomaly_score": round(avg_anomaly, 4),
            "latency_ms": round(latency_ms, 2),
            "person_id": person_id,
        }
