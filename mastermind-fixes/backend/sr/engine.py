"""
SM-2 spaced repetition engine.
Grade scale: 0=blackout, 1=wrong, 2=wrong-but-close, 3=correct-hard, 4=correct, 5=easy
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session as DBSession
from db.schema import SRQueue


def _sm2(ease: float, interval: float, reps: int, grade: int) -> tuple[float, float, int]:
    """
    Returns (new_ease, new_interval_days, new_reps).
    Implements the original SM-2 algorithm.
    """
    if grade >= 3:
        if reps == 0:
            new_interval = 1.0
        elif reps == 1:
            new_interval = 6.0
        else:
            new_interval = round(interval * ease, 1)
        new_reps = reps + 1
    else:
        new_interval = 1.0
        new_reps = 0

    new_ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    new_ease = max(1.3, new_ease)

    return new_ease, new_interval, new_reps


def record_review(card_id: str, user_id: str, grade: int, db: DBSession) -> dict:
    """
    Upsert the SRQueue row for (user_id, card_id) and compute next due date.
    grade: 0-5 (see SM-2 scale above)
    Returns the updated queue row as a dict.
    """
    sr = (
        db.query(SRQueue)
        .filter(SRQueue.user_id == user_id, SRQueue.card_id == card_id)
        .first()
    )

    if sr is None:
        sr = SRQueue(
            user_id=user_id,
            card_id=card_id,
            interval_days=1.0,
            ease_factor=2.5,
            repetitions=0,
            due_date=date.today(),
        )
        db.add(sr)

    new_ease, new_interval, new_reps = _sm2(
        sr.ease_factor, sr.interval_days, sr.repetitions, grade
    )

    sr.ease_factor = new_ease
    sr.interval_days = new_interval
    sr.repetitions = new_reps
    sr.last_grade = grade
    sr.due_date = date.today() + timedelta(days=int(new_interval))

    db.commit()
    db.refresh(sr)

    return {
        "card_id": card_id,
        "due_date": sr.due_date.isoformat(),
        "interval_days": sr.interval_days,
        "ease_factor": sr.ease_factor,
        "repetitions": sr.repetitions,
    }


def get_due_cards(user_id: str, db: DBSession) -> list[SRQueue]:
    """Return all SRQueue rows due today or earlier for this user."""
    return (
        db.query(SRQueue)
        .filter(SRQueue.user_id == user_id, SRQueue.due_date <= date.today())
        .order_by(SRQueue.due_date)
        .all()
    )
