"""
database/crud.py - CRUD operations for Persons, Events, and Incident Reports
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, desc
from database.models import Person, Event, IncidentReport, ActivityType
from loguru import logger


# ─── Person Operations ────────────────────────────────────────────────────────

async def create_person(
    db: AsyncSession,
    faiss_id: Optional[int] = None,
    attributes: Optional[Dict] = None,
    thumbnail_path: Optional[str] = None,
) -> Person:
    person = Person(
        faiss_id=faiss_id,
        attributes=attributes or {},
        thumbnail_path=thumbnail_path,
        track_ids=[],
    )
    db.add(person)
    await db.flush()
    logger.info(f"Created person: {person.id}")
    return person


async def get_person(db: AsyncSession, person_id: uuid.UUID) -> Optional[Person]:
    result = await db.execute(select(Person).where(Person.id == person_id))
    return result.scalar_one_or_none()


async def get_all_persons(db: AsyncSession, limit: int = 100, offset: int = 0) -> List[Person]:
    result = await db.execute(
        select(Person).order_by(desc(Person.last_seen)).limit(limit).offset(offset)
    )
    return result.scalars().all()


async def update_person_last_seen(db: AsyncSession, person_id: uuid.UUID) -> None:
    await db.execute(
        update(Person).where(Person.id == person_id).values(last_seen=datetime.utcnow())
    )


async def update_person_faiss_id(db: AsyncSession, person_id: uuid.UUID, faiss_id: int) -> None:
    await db.execute(
        update(Person).where(Person.id == person_id).values(faiss_id=faiss_id)
    )


async def update_person_attributes(db: AsyncSession, person_id: uuid.UUID, attributes: Dict) -> None:
    await db.execute(
        update(Person).where(Person.id == person_id).values(attributes=attributes)
    )


# ─── Event Operations ─────────────────────────────────────────────────────────

async def create_event(
    db: AsyncSession,
    person_id: uuid.UUID,
    camera_id: str,
    activity_type: ActivityType = ActivityType.DETECTED,
    bounding_box: Optional[Dict] = None,
    confidence: Optional[float] = None,
    track_id: Optional[int] = None,
    location_zone: Optional[str] = None,
    anomaly_score: float = 0.0,
    description: Optional[str] = None,
    raw_metadata: Optional[Dict] = None,
) -> Event:
    event = Event(
        person_id=person_id,
        camera_id=camera_id,
        activity_type=activity_type,
        bounding_box=bounding_box,
        confidence=confidence,
        track_id=track_id,
        location_zone=location_zone,
        anomaly_score=anomaly_score,
        description=description,
        raw_metadata=raw_metadata or {},
    )
    db.add(event)
    await db.flush()
    return event


async def get_events_for_person(
    db: AsyncSession,
    person_id: uuid.UUID,
    limit: int = 50,
) -> List[Event]:
    result = await db.execute(
        select(Event)
        .where(Event.person_id == person_id)
        .order_by(desc(Event.timestamp))
        .limit(limit)
    )
    return result.scalars().all()


async def get_recent_events(
    db: AsyncSession,
    camera_id: Optional[str] = None,
    limit: int = 100,
) -> List[Event]:
    query = select(Event).order_by(desc(Event.timestamp)).limit(limit)
    if camera_id:
        query = query.where(Event.camera_id == camera_id)
    result = await db.execute(query)
    return result.scalars().all()


async def get_anomaly_events(db: AsyncSession, threshold: float = 0.75, limit: int = 50) -> List[Event]:
    result = await db.execute(
        select(Event)
        .where(Event.anomaly_score >= threshold)
        .order_by(desc(Event.timestamp))
        .limit(limit)
    )
    return result.scalars().all()


# ─── Incident Report Operations ───────────────────────────────────────────────

async def create_incident_report(
    db: AsyncSession,
    person_id: Optional[uuid.UUID],
    report_text: str,
    summary: Optional[str] = None,
    severity: str = "medium",
    camera_ids: Optional[List[str]] = None,
) -> IncidentReport:
    report = IncidentReport(
        person_id=person_id,
        report_text=report_text,
        summary=summary,
        severity=severity,
        camera_ids=camera_ids or [],
    )
    db.add(report)
    await db.flush()
    return report


async def get_report(db: AsyncSession, report_id: uuid.UUID) -> Optional[IncidentReport]:
    result = await db.execute(select(IncidentReport).where(IncidentReport.report_id == report_id))
    return result.scalar_one_or_none()


async def get_reports_for_person(db: AsyncSession, person_id: uuid.UUID) -> List[IncidentReport]:
    result = await db.execute(
        select(IncidentReport)
        .where(IncidentReport.person_id == person_id)
        .order_by(desc(IncidentReport.generated_at))
    )
    return result.scalars().all()
