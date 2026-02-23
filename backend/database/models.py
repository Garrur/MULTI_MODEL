"""
database/models.py - SQLAlchemy ORM models for Surveillance System
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Text, Integer, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database.session import Base
import enum


class ActivityType(str, enum.Enum):
    DETECTED = "detected"
    TRACKED = "tracked"
    REID_MATCH = "reid_match"
    ANOMALY = "anomaly"
    LOITERING = "loitering"
    RUNNING = "running"
    FIGHTING = "fighting"
    TRESPASSING = "trespassing"


class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    video_filename = Column(String(255), nullable=False)
    thumbnail_path = Column(String(500), nullable=True)
    
    # Analysis Summary Stats
    duration_sec = Column(Float, nullable=False, default=0.0)
    frames_processed = Column(Integer, nullable=False, default=0)
    unique_persons = Column(Integer, nullable=False, default=0)
    peak_count = Column(Integer, nullable=False, default=0)

    def __repr__(self):
        return f"<AnalysisSession id={self.id} video={self.video_filename}>"


class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ReID embedding reference
    faiss_id = Column(Integer, nullable=True, unique=True)
    embedding_version = Column(String(50), default="vit-base-patch16-224")

    # Attributes from CLIP
    attributes = Column(JSON, nullable=True)  # {"clothing": [...], "colors": [...]}
    thumbnail_path = Column(String(500), nullable=True)
    track_ids = Column(JSON, default=list)  # list of all track IDs assigned cross-camera

    events = relationship("Event", back_populates="person", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Person id={self.id} first_seen={self.first_seen}>"


class Event(Base):
    __tablename__ = "events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    activity_type = Column(Enum(ActivityType), default=ActivityType.DETECTED, nullable=False)

    # Spatial & tracking info
    bounding_box = Column(JSON, nullable=True)       # {"x1": f, "y1": f, "x2": f, "y2": f}
    confidence = Column(Float, nullable=True)
    track_id = Column(Integer, nullable=True)
    location_zone = Column(String(128), nullable=True)

    # Additional metadata
    anomaly_score = Column(Float, default=0.0)
    raw_metadata = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)        # NLP-generated description

    person = relationship("Person", back_populates="events")

    def __repr__(self):
        return f"<Event {self.event_id} person={self.person_id} cam={self.camera_id} type={self.activity_type}>"


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    report_text = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    severity = Column(String(20), default="medium")  # low / medium / high / critical
    camera_ids = Column(JSON, default=list)
    model_version = Column(String(50), default="flan-t5-base")
