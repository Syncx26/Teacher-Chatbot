"""
Session factory and context manager for safe DB access.
Import get_db wherever you need a SQLAlchemy session.
"""
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL
from db.schema import Base

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
DBSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@contextmanager
def get_db():
    db = DBSession()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(engine)

    # Idempotent column migrations — safe to re-run on every startup
    _migrations = [
        "ALTER TABLE users ADD COLUMN push_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN push_hour INTEGER DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN digest_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN digest_day INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN digest_hour INTEGER DEFAULT 8",
        "ALTER TABLE curricula ADD COLUMN completed_at TIMESTAMP DEFAULT NULL",
        "ALTER TABLE curricula ADD COLUMN emoji TEXT DEFAULT NULL",
    ]

    with engine.connect() as conn:
        for sql in _migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                conn.rollback()  # column already exists — skip
