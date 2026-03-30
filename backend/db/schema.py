import sqlite3
from config import DB_PATH


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                current_week INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS milestones (
                user_id TEXT NOT NULL,
                week INTEGER NOT NULL,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, week)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                model_tier TEXT DEFAULT NULL,
                confidence_score INTEGER DEFAULT NULL,
                confidence_json TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sprint_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                topic_id TEXT NOT NULL,
                subtopic_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'done')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS papers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                arxiv_id TEXT UNIQUE,
                title TEXT NOT NULL,
                authors TEXT,
                abstract TEXT,
                url TEXT,
                published_date TEXT,
                source TEXT,
                topics TEXT,
                fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS paper_summaries (
                paper_id INTEGER PRIMARY KEY REFERENCES papers(id),
                summary_md TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS paper_refresh_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                papers_added INTEGER DEFAULT 0
            );
        """)
