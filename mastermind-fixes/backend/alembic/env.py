import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from logging.config import fileConfig
from sqlalchemy import create_engine
from alembic import context
from db.schema import Base
from config import DATABASE_URL

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata


def run_migrations_online():
    connectable = create_engine(DATABASE_URL)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


def run_migrations_offline():
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
