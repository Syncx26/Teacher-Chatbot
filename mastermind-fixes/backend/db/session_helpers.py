"""
Session scheduling helpers and spaced-repetition review card builder.
"""
import uuid
from datetime import date, timedelta
from sqlalchemy.orm import Session as DBSession
from db.schema import Session, SRQueue, Card


def is_off_day(d: date) -> bool:
    """Return True if the date is a weekend day (Saturday or Sunday)."""
    return d.weekday() >= 5  # 5=Saturday, 6=Sunday


def get_or_create_session(curriculum_id: str, today: date, db: DBSession) -> Session | None:
    """
    Return today's session for this curriculum.
    If no session has been assigned today's date yet, assign the next pending
    session whose is_weekend flag matches today, then return it.
    """
    # Check if a session is already scheduled for today
    existing = (
        db.query(Session)
        .filter(
            Session.curriculum_id == curriculum_id,
            Session.scheduled_date == today,
        )
        .first()
    )
    if existing:
        return existing

    # Find the next pending session whose weekend flag matches today
    is_weekend_today = is_off_day(today)
    pending = (
        db.query(Session)
        .filter(
            Session.curriculum_id == curriculum_id,
            Session.status == "pending",
            Session.scheduled_date.is_(None),
            Session.is_weekend == is_weekend_today,
        )
        .order_by(Session.week_number, Session.day_number)
        .first()
    )
    if pending:
        pending.scheduled_date = today
        db.commit()
        db.refresh(pending)
    return pending


def build_review_card(sr: SRQueue, db: DBSession) -> dict:
    """
    Convert an SRQueue row into a card dict suitable for the frontend.
    Loads the original card content and wraps it as a review card.
    """
    original: Card | None = db.query(Card).filter(Card.id == sr.card_id).first()
    if not original:
        return {}

    return {
        "id": f"review_{sr.id}",
        "card_type": "review",
        "original_card_id": sr.card_id,
        "due_date": sr.due_date.isoformat(),
        "ease_factor": sr.ease_factor,
        "repetitions": sr.repetitions,
        "content": original.content_json,
    }


def parse_and_save_curriculum(curriculum_id: str, opus_json: dict, db: DBSession) -> None:
    """
    Convert the Opus curriculum JSON into Session and Card rows.
    Assigns real calendar dates to sessions by matching is_weekend flag to
    actual calendar days starting from today.
    All IDs are UUIDs.
    """
    today = date.today()
    day_offset = 0

    for week in opus_json.get("weeks", []):
        week_num = week.get("week_number", 1)
        for day in week.get("days", []):
            is_weekend = day.get("is_weekend", False)

            # Advance day_offset until we land on a day matching the is_weekend flag
            while is_off_day(today + timedelta(days=day_offset)) != is_weekend:
                day_offset += 1

            scheduled_date = today + timedelta(days=day_offset)
            day_offset += 1  # move past this day for the next iteration

            session_id = str(uuid.uuid4())
            session = Session(
                id=session_id,
                curriculum_id=curriculum_id,
                week_number=week_num,
                day_number=day.get("day_number", 1),
                scheduled_date=scheduled_date,
                is_weekend=is_weekend,
                status="pending",
            )
            db.add(session)

            for position, raw_card in enumerate(day.get("cards", [])):
                card = Card(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    position=position,
                    card_type=raw_card.get("type", "concept"),
                    content_json=raw_card,
                )
                db.add(card)

    db.commit()
