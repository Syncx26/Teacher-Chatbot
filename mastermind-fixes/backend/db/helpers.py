"""
Session factory and context manager for safe DB access.
Import get_db wherever you need a SQLAlchemy session.
"""
from contextlib import contextmanager
from sqlalchemy import create_engine
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
