"""
routes/nlp_routes.py - NLP API endpoints:
  GET  /search              (semantic search over surveillance logs)
  POST /ask                 (QA over logs)
  GET  /report/{person_id}  (generate incident report)
  GET  /anomalies           (get anomalous persons)
"""
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from database import crud

router = APIRouter(prefix="/api/v1", tags=["NLP & Intelligence"])


# ── Dependency helpers ─────────────────────────────────────────────────────────

def get_search_engine():
    from app import search_engine
    return search_engine


def get_qa_system():
    from app import qa_system
    return qa_system


def get_report_generator():
    from app import report_generator
    return report_generator


def get_summarizer():
    from app import summarizer
    return summarizer


def get_movement_graph():
    from app import movement_graph
    return movement_graph


# ── Request models ──────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    score_threshold: float = 0.35


class AskRequest(BaseModel):
    question: str
    camera_id: Optional[str] = None
    person_id: Optional[str] = None
    context: Optional[str] = None


# ── GET /search ───────────────────────────────────────────────────────────────

@router.get("/search", summary="Semantic search over surveillance logs")
async def semantic_search(
    q: str = Query(..., description="Natural language search query"),
    top_k: int = Query(10, ge=1, le=50),
    score_threshold: float = Query(0.35, ge=0.0, le=1.0),
    search_engine=Depends(get_search_engine),
):
    """
    Search across all indexed surveillance events using natural language.
    Example: "person in red jacket near camera 3"
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    results = search_engine.search(query=q, top_k=top_k, score_threshold=score_threshold)
    return {
        "query": q,
        "results": results,
        "total": len(results),
    }


# ── POST /ask ─────────────────────────────────────────────────────────────────

@router.post("/ask", summary="Ask a natural language question about surveillance data")
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
    qa=Depends(get_qa_system),
):
    """
    Extractive QA over recent surveillance events.
    Example: "Which camera last detected person 123abc?"
    """
    events = []
    if request.context:
        # Use provided context directly
        result = qa.answer(question=request.question, context=request.context)
    else:
        # Fetch recent events from DB
        if request.person_id:
            try:
                pid = uuid.UUID(request.person_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid person_id UUID")
            db_events = await crud.get_events_for_person(db, pid, limit=30)
        else:
            db_events = await crud.get_recent_events(db, camera_id=request.camera_id, limit=50)

        # Convert to dicts
        events = [
            {
                "event_id": str(e.event_id),
                "person_id": str(e.person_id),
                "camera_id": e.camera_id,
                "timestamp": str(e.timestamp),
                "activity_type": e.activity_type.value,
                "anomaly_score": e.anomaly_score or 0.0,
                "bounding_box": e.bounding_box or {},
            }
            for e in db_events
        ]
        result = qa.answer(question=request.question, events=events)

    return {
        "question": request.question,
        **result,
        "events_used": len(events),
    }


# ── GET /report/{person_id} ───────────────────────────────────────────────────

@router.get("/report/{person_id}", summary="Generate and store an incident report for a person")
async def generate_report(
    person_id: str,
    db: AsyncSession = Depends(get_db),
    report_gen=Depends(get_report_generator),
    _summarizer=Depends(get_summarizer),
):
    """Generate a structured incident report for a tracked person."""
    try:
        pid = uuid.UUID(person_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid person_id UUID")

    person = await crud.get_person(db, pid)
    if not person:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")

    events = await crud.get_events_for_person(db, pid, limit=30)
    if not events:
        raise HTTPException(status_code=404, detail="No events found for this person")

    events_dicts = [
        {
            "event_id": str(e.event_id),
            "camera_id": e.camera_id,
            "timestamp": str(e.timestamp),
            "activity_type": e.activity_type.value,
            "anomaly_score": e.anomaly_score or 0.0,
            "attributes": person.attributes or {},
        }
        for e in events
    ]

    # Generate report
    report_result = report_gen.generate(events=events_dicts, person_id=person_id)
    summary_result = _summarizer.summarize(events=events_dicts)

    # Store report in DB
    camera_ids = list({e["camera_id"] for e in events_dicts})
    db_report = await crud.create_incident_report(
        db,
        person_id=pid,
        report_text=report_result["report_text"],
        summary=summary_result["summary"],
        severity=report_result.get("severity", "medium"),
        camera_ids=camera_ids,
    )

    return {
        "report_id": str(db_report.report_id),
        "person_id": person_id,
        "generated_at": str(db_report.generated_at),
        "severity": db_report.severity,
        "summary": summary_result["summary"],
        "report_text": report_result["report_text"],
        "cameras_involved": camera_ids,
        "event_count": len(events),
        "latency_ms": report_result.get("latency_ms"),
    }


# ── GET /anomalies ────────────────────────────────────────────────────────────

@router.get("/anomalies", summary="Get persons with anomalous movement patterns")
async def get_anomalies(
    threshold: float = Query(0.75, ge=0.0, le=1.0),
    graph=Depends(get_movement_graph),
):
    anomalies = graph.get_all_anomalies(threshold=threshold)
    return {
        "threshold": threshold,
        "anomalous_persons": anomalies,
        "count": len(anomalies),
    }


# ── GET /persons ───────────────────────────────────────────────────────────────

@router.get("/persons", summary="List all tracked persons")
async def list_persons(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    persons = await crud.get_all_persons(db, limit=limit, offset=offset)
    return {
        "persons": [
            {
                "id": str(p.id),
                "first_seen": str(p.first_seen),
                "last_seen": str(p.last_seen),
                "faiss_id": p.faiss_id,
                "attributes": p.attributes,
            }
            for p in persons
        ],
        "total": len(persons),
    }
