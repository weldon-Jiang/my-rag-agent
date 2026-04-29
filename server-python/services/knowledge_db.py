import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
import json
import uuid

class KnowledgeDatabase:
    def __init__(self, db_path: str = None):
        from config import DATA_DIR
        if db_path is None:
            db_path = str(DATA_DIR / "knowledge.db")
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_tables()
        print(f"[KnowledgeDB] 初始化完成，数据库: {db_path}")

    def _init_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        """)

        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_files (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT,
                file_size INTEGER,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                FOREIGN KEY (group_id) REFERENCES knowledge_groups(id) ON DELETE CASCADE
            )
        """)

        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_files_group
            ON knowledge_files(group_id)
        """)

        self.conn.commit()

    def create_group(self, name: str, description: str = None) -> Dict[str, Any]:
        group_id = str(uuid.uuid4())[:8]
        now = datetime.now()
        self.conn.execute(
            "INSERT INTO knowledge_groups (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (group_id, name, description, now, now)
        )
        self.conn.commit()
        return {
            "id": group_id,
            "name": name,
            "description": description,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "is_active": 1
        }

    def get_all_groups(self) -> List[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT id, name, description, created_at, updated_at, is_active FROM knowledge_groups WHERE is_active = 1 ORDER BY created_at DESC"
        )
        groups = []
        for row in cursor.fetchall():
            groups.append({
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "created_at": row[3],
                "updated_at": row[4],
                "is_active": row[5]
            })
        return groups

    def get_group(self, group_id: str) -> Optional[Dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT id, name, description, created_at, updated_at, is_active FROM knowledge_groups WHERE id = ?",
            (group_id,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "created_at": row[3],
                "updated_at": row[4],
                "is_active": row[5]
            }
        return None

    def update_group(self, group_id: str, name: str = None, description: str = None) -> bool:
        updates = []
        params = []
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.now())
            params.append(group_id)
            self.conn.execute(
                f"UPDATE knowledge_groups SET {', '.join(updates)} WHERE id = ?",
                params
            )
            self.conn.commit()
            return True
        return False

    def delete_group(self, group_id: str) -> bool:
        self.conn.execute(
            "UPDATE knowledge_groups SET is_active = 0 WHERE id = ?",
            (group_id,)
        )
        self.conn.commit()
        return True

    def add_file(self, group_id: str, filename: str, original_name: str, file_path: str, file_type: str = None, file_size: int = 0) -> Dict[str, Any]:
        file_id = str(uuid.uuid4())[:8]
        now = datetime.now()
        self.conn.execute(
            """INSERT INTO knowledge_files
               (id, group_id, filename, original_name, file_path, file_type, file_size, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (file_id, group_id, filename, original_name, file_path, file_type, file_size, now, now)
        )
        self.conn.commit()
        return {
            "id": file_id,
            "group_id": group_id,
            "filename": filename,
            "original_name": original_name,
            "file_path": file_path,
            "file_type": file_type,
            "file_size": file_size,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }

    def get_files_by_group(self, group_id: str = None) -> List[Dict[str, Any]]:
        if group_id:
            cursor = self.conn.execute(
                """SELECT id, group_id, filename, original_name, file_path, file_type, file_size, created_at, updated_at
                   FROM knowledge_files WHERE group_id = ? ORDER BY created_at DESC""",
                (group_id,)
            )
        else:
            cursor = self.conn.execute(
                """SELECT id, group_id, filename, original_name, file_path, file_type, file_size, created_at, updated_at
                   FROM knowledge_files ORDER BY created_at DESC"""
            )
        files = []
        for row in cursor.fetchall():
            files.append({
                "id": row[0],
                "group_id": row[1],
                "filename": row[2],
                "original_name": row[3],
                "file_path": row[4],
                "file_type": row[5],
                "file_size": row[6],
                "created_at": row[7],
                "updated_at": row[8]
            })
        return files

    def delete_file(self, file_id: str) -> bool:
        self.conn.execute("DELETE FROM knowledge_files WHERE id = ?", (file_id,))
        self.conn.commit()
        return True

    def get_group_file_count(self, group_id: str) -> int:
        cursor = self.conn.execute(
            "SELECT COUNT(*) FROM knowledge_files WHERE group_id = ?",
            (group_id,)
        )
        return cursor.fetchone()[0] if cursor else 0

    def close(self):
        self.conn.close()


_knowledge_db: Optional[KnowledgeDatabase] = None

def get_knowledge_db() -> KnowledgeDatabase:
    global _knowledge_db
    if _knowledge_db is None:
        _knowledge_db = KnowledgeDatabase()
    return _knowledge_db

def create_group(name: str, description: str = None) -> Dict[str, Any]:
    return get_knowledge_db().create_group(name, description)

def get_all_groups() -> List[Dict[str, Any]]:
    return get_knowledge_db().get_all_groups()

def get_group(group_id: str) -> Optional[Dict[str, Any]]:
    return get_knowledge_db().get_group(group_id)

def update_group(group_id: str, name: str = None, description: str = None) -> bool:
    return get_knowledge_db().update_group(group_id, name, description)

def delete_group(group_id: str) -> bool:
    return get_knowledge_db().delete_group(group_id)

def add_file_to_group(group_id: str, filename: str, original_name: str, file_path: str, file_type: str = None, file_size: int = 0) -> Dict[str, Any]:
    return get_knowledge_db().add_file(group_id, filename, original_name, file_path, file_type, file_size)

def get_files_by_group(group_id: str = None) -> List[Dict[str, Any]]:
    return get_knowledge_db().get_files_by_group(group_id)

def delete_file(file_id: str) -> bool:
    return get_knowledge_db().delete_file(file_id)

def get_group_file_count(group_id: str) -> int:
    from config import KNOWLEDGE_DIR
    import os

    count = 0
    group_dir = os.path.join(KNOWLEDGE_DIR, group_id)
    if os.path.exists(group_dir) and os.path.isdir(group_dir):
        count = len([f for f in os.listdir(group_dir) if os.path.isfile(os.path.join(group_dir, f))])

    return count
