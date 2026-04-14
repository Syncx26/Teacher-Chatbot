"""
SQLAlchemy ORM models for Mastermind.
All IDs that appear in URLs are UUIDs (str). Internal join-only tables use Integer PKs.
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, JSON, Text, Enum
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)           # Clerk user ID
    email = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=True)
    language = Column(String, default="en")         # ISO 639-1 code
    english_level = Column(String, default="fluent")  # "simple" | "fluent"
    timezone = Column(String, default="UTC")
    created_at = Column(DateTime, default=datetime.utcnow)

    curricula = relationship("Curriculum", back_populates="user")
    push_subs = relationship("PushSubscription", back_populates="user")


class Curriculum(Base):
    __tablename__ = "curricula"

    id = Column(String, primary_key=True)           # UUID
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=False)
    duration_weeks = Column(Integer, nullable=False)
    weekday_minutes = Column(Integer, default=20)
    weekend_minutes = Column(Integer, default=0)
    opus_json = Column(JSON, nullable=False)         # raw Opus output
    status = Column(String, default="active")       # active | paused | complete
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="curricula")
    sessions = relationship("Session", back_populates="curriculum", order_by="Session.scheduled_date")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)           # UUID
    curriculum_id = Column(String, ForeignKey("curricula.id"), nullable=False)
    week_number = Column(Integer, nullable=False)
    day_number = Column(Integer, nullable=False)
    scheduled_date = Column(Date, nullable=True)    # assigned lazily
    is_weekend = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="pending")      # pending | in_progress | done

    curriculum = relationship("Curriculum", back_populates="sessions")
    cards = relationship("Card", back_populates="session", order_by="Card.position")


class Card(Base):
    __tablename__ = "cards"

    id = Column(String, primary_key=True)           # UUID (used in share URLs)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    position = Column(Integer, nullable=False)
    card_type = Column(String, nullable=False)       # concept|exercise|checkpoint|explore|review
    content_json = Column(JSON, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    session = relationship("Session", back_populates="cards")


class SRQueue(Base):
    """Spaced repetition queue — one row per card review event."""
    __tablename__ = "sr_queue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    card_id = Column(String, ForeignKey("cards.id"), nullable=False)
    due_date = Column(Date, nullable=False)
    interval_days = Column(Float, default=1.0)
    ease_factor = Column(Float, default=2.5)
    repetitions = Column(Integer, default=0)
    last_grade = Column(Integer, nullable=True)     # 0-5 SM-2 grade


class ExploreCache(Base):
    __tablename__ = "explore_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    cache_date = Column(Date, nullable=False)
    cards_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class CostLog(Base):
    __tablename__ = "cost_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    usd_cost = Column(Float, default=0.0)
    task = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    endpoint = Column(Text, nullable=False, unique=True)
    keys_json = Column(JSON, nullable=False)        # {p256dh, auth}
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="push_subs")


def init_db(engine):
    Base.metadata.create_all(engine)
