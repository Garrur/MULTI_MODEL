"""
nlp/qa.py - Question Answering over Surveillance Logs using deepset/roberta-base-squad2
"""
import time
from typing import Optional, Dict, List
from transformers import pipeline, Pipeline
from loguru import logger
from config import settings, DEVICE


class SurveillanceQA:
    """
    Extractive QA system. Given a question and a context built from
    surveillance logs/events, extracts the most relevant answer span.
    """

    def __init__(self):
        logger.info(f"Loading QA model: {settings.QA_MODEL}")
        device_id = 0 if str(DEVICE) == "cuda" else -1
        self.qa_pipeline: Pipeline = pipeline(
            "question-answering",
            model=settings.QA_MODEL,
            tokenizer=settings.QA_MODEL,
            device=device_id,
        )
        logger.info("✅ SurveillanceQA ready.")

    def _build_context(self, events: List[Dict]) -> str:
        """Build a natural language context string from event records."""
        lines = []
        for e in events:
            ts = e.get("timestamp", "unknown time")
            cam = e.get("camera_id", "unknown camera")
            activity = e.get("activity_type", "detected")
            person_id = str(e.get("person_id", "unknown"))[:8]
            attrs = e.get("attributes", {})
            desc = e.get("description", "")
            attr_str = ""
            if attrs:
                gender = attrs.get("gender", "")
                color = attrs.get("color", "")
                clothing = ", ".join([c.get("label", "") for c in attrs.get("clothing", [])[:2]])
                attr_str = f"({gender}, {color} clothing, {clothing})"
            line = f"At {ts}, camera {cam} detected person {person_id} {attr_str} with activity: {activity}."
            if desc:
                line += f" {desc}"
            lines.append(line)
        return " ".join(lines)

    def answer(
        self,
        question: str,
        events: Optional[List[Dict]] = None,
        context: Optional[str] = None,
        top_k: int = 3,
    ) -> Dict:
        """
        Answer a natural language question about surveillance data.

        Args:
            question: User's question
            events: List of event dicts (auto-builds context)
            context: Pre-built context string
            top_k: Number of answer candidates

        Returns:
            {"answer": str, "score": float, "start": int, "end": int, "context": str, "latency_ms": float}
        """
        if context is None:
            if not events:
                return {"answer": "No surveillance data available to answer from.", "score": 0.0}
            context = self._build_context(events)

        if not context.strip():
            return {"answer": "No context available.", "score": 0.0}

        # Truncate context to model max (512 tokens ≈ ~2000 chars)
        context = context[:4000]

        t0 = time.perf_counter()
        result = self.qa_pipeline(
            question=question,
            context=context,
            top_k=top_k,
            handle_impossible_answer=True,
        )
        latency_ms = (time.perf_counter() - t0) * 1000

        if isinstance(result, list):
            best = result[0]
        else:
            best = result

        logger.debug(f"QA answered '{question[:50]}' in {latency_ms:.1f}ms | score={best.get('score', 0):.3f}")
        return {
            "answer": best.get("answer", ""),
            "score": round(best.get("score", 0.0), 4),
            "start": best.get("start", 0),
            "end": best.get("end", 0),
            "context_used": context[:500] + "..." if len(context) > 500 else context,
            "latency_ms": round(latency_ms, 2),
            "all_answers": result if isinstance(result, list) else [result],
        }
