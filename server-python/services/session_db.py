import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
import json
import uuid

class SessionDatabase:
    def __init__(self, db_path: str = None):
        from config import DATA_DIR
        if db_path is None:
            db_path = str(DATA_DIR / "sessions.db")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_tables()
        print(f"[SessionDB] 初始化完成，数据库: {db_path}")

    def _init_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                metadata TEXT
            )
        """)

        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                metadata TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        """)

        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_session
            ON messages(session_id, timestamp)
        """)

        self.conn.commit()

    def create_session(self, session_id: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
        if session_id is None:
            session_id = str(uuid.uuid4())[:8]

        now = datetime.now()
        if name is None:
            name = f"会话 {session_id}"

        try:
            self.conn.execute(
                "INSERT INTO sessions (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (session_id, name, now, now)
            )
            self.conn.commit()
            return {
                "id": session_id,
                "name": name,
                "created_at": now,
                "updated_at": now
            }
        except sqlite3.IntegrityError:
            return self.get_session(session_id)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT id, name, created_at, updated_at, metadata FROM sessions WHERE id = ?",
            (session_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "created_at": row[2],
                "updated_at": row[3],
                "metadata": json.loads(row[4]) if row[4] else {}
            }
        return None

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT id, name, created_at, updated_at, metadata FROM sessions ORDER BY updated_at DESC"
        )
        sessions = []
        for row in cursor.fetchall():
            sessions.append({
                "id": row[0],
                "name": row[1],
                "created_at": row[2],
                "updated_at": row[3],
                "metadata": json.loads(row[4]) if row[4] else {}
            })
        return sessions

    def delete_session(self, session_id: str) -> bool:
        self.conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        self.conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        self.conn.commit()
        return True

    def update_session_name(self, session_id: str, name: str) -> bool:
        now = datetime.now()
        self.conn.execute(
            "UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?",
            (name, now, session_id)
        )
        self.conn.commit()
        return True

    def add_message(self, session_id: str, role: str, content: str, metadata: Dict = None) -> int:
        now = datetime.now()
        cursor = self.conn.execute(
            """INSERT INTO messages (session_id, role, content, timestamp, metadata)
               VALUES (?, ?, ?, ?, ?)""",
            (session_id, role, content, now, json.dumps(metadata) if metadata else None)
        )
        self.conn.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (now, session_id)
        )
        self.conn.commit()
        return cursor.lastrowid

    def get_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            """SELECT id, role, content, timestamp, metadata
               FROM messages
               WHERE session_id = ?
               ORDER BY timestamp ASC
               LIMIT ?""",
            (session_id, limit)
        )
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "id": row[0],
                "role": row[1],
                "content": row[2],
                "timestamp": row[3],
                "metadata": json.loads(row[4]) if row[4] else None
            })
        return messages

    def get_message_count(self, session_id: str) -> int:
        cursor = self.conn.execute(
            "SELECT COUNT(*) FROM messages WHERE session_id = ?",
            (session_id,)
        )
        return cursor.fetchone()[0]

    def cleanup_old_sessions(self, hours: int = 168):
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(hours=hours)

        cursor = self.conn.execute(
            "SELECT id FROM sessions WHERE updated_at < ?",
            (cutoff,)
        )
        old_session_ids = [row[0] for row in cursor.fetchall()]

        for sid in old_session_ids:
            self.conn.execute("DELETE FROM messages WHERE session_id = ?", (sid,))
            self.conn.execute("DELETE FROM sessions WHERE id = ?", (sid,))

        self.conn.commit()
        print(f"[SessionDB] 清理了 {len(old_session_ids)} 个过期会话")
        return len(old_session_ids)

    def close(self):
        self.conn.close()


_db: Optional[SessionDatabase] = None

def get_session_db() -> SessionDatabase:
    global _db
    if _db is None:
        _db = SessionDatabase()
    return _db


def init_session_db():
    get_session_db()


def session_exists(session_id: str) -> bool:
    return get_session_db().get_session(session_id) is not None


def get_or_create_session(session_id: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
    if session_id:
        existing = get_session_db().get_session(session_id)
        if existing:
            return existing
    return get_session_db().create_session(session_id, name)


def add_message_to_session(session_id: str, role: str, content: str, metadata: Dict = None):
    if not session_exists(session_id):
        get_session_db().create_session(session_id)
    return get_session_db().add_message(session_id, role, content, metadata)


def get_session_messages(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    return get_session_db().get_messages(session_id, limit)


def delete_session(session_id: str) -> bool:
    return get_session_db().delete_session(session_id)


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    return get_session_db().get_session(session_id)


def create_session(session_id: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
    return get_session_db().create_session(session_id, name)


def get_message_count(session_id: str) -> int:
    return get_session_db().get_message_count(session_id)


def update_session_name(session_id: str, name: str) -> bool:
    return get_session_db().update_session_name(session_id, name)


def add_message(session_id: str, role: str, content: str, metadata: Dict = None):
    return get_session_db().add_message(session_id, role, content, metadata)


def get_messages(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    return get_session_db().get_messages(session_id, limit)


def get_all_sessions() -> List[Dict[str, Any]]:
    return get_session_db().get_all_sessions()