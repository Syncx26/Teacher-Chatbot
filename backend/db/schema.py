import sqlite3
from pathlib import Path
from config import DB_PATH

# Ensure the directory exists (important for Railway Volume path /app/data/)
Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)


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

            CREATE TABLE IF NOT EXISTS custom_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                topic_id TEXT NOT NULL,
                label TEXT NOT NULL,
                description TEXT DEFAULT '',
                difficulty TEXT DEFAULT 'intermediate',
                reason TEXT DEFAULT '',
                insert_after_week INTEGER DEFAULT 0,
                subtopics TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS student_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                memory_type TEXT NOT NULL,
                topic TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_memory_user
                ON student_memory(user_id, updated_at);

            CREATE TABLE IF NOT EXISTS curriculums (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                goal TEXT NOT NULL,
                weeks_json TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_curriculum_user
                ON curriculums(user_id, is_active);
        """)

    # Migrate papers table — idempotent ALTER TABLE guards
    with get_conn() as conn:
        for sql in [
            "ALTER TABLE papers ADD COLUMN topic TEXT DEFAULT 'ai'",
            "ALTER TABLE papers ADD COLUMN doi TEXT DEFAULT NULL",
            "ALTER TABLE papers ADD COLUMN citation_count INTEGER DEFAULT NULL",
        ]:
            try:
                conn.execute(sql)
            except Exception:
                pass
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, paper_id)
            );
            CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
        """)
