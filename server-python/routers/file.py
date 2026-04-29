from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import uuid
import aiofiles
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from config import TEMP_DIR, ALLOWED_EXTENSIONS, KNOWLEDGE_DIR

router = APIRouter()


class FileInfo(BaseModel):
    file_id: str
    filename: str
    size: int
    mime_type: Optional[str] = None
    updated_at: Optional[str] = None
    path: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None


@router.get("/", response_model=List[FileInfo])
async def list_files():
    files = []
    for filename in os.listdir(TEMP_DIR):
        filepath = os.path.join(TEMP_DIR, filename)
        if os.path.isfile(filepath):
            file_id = filename.split("_")[0] if "_" in filename else filename
            files.append(FileInfo(
                file_id=file_id,
                filename=filename,
                size=os.path.getsize(filepath)
            ))
    return files


@router.get("/knowledge/", response_model=List[FileInfo])
async def list_knowledge_files():
    from services.knowledge_db import get_knowledge_db

    db = get_knowledge_db()
    cursor = db.conn.execute("""
        SELECT f.id, f.filename, f.file_size, f.file_path, f.group_id, g.name as group_name
        FROM knowledge_files f
        LEFT JOIN knowledge_groups g ON f.group_id = g.id
    """)
    rows = cursor.fetchall()

    files = []
    for row in rows:
        file_id, filename, file_size, file_path, group_id, group_name = row
        if file_path and os.path.exists(file_path):
            stat = os.stat(file_path)
            files.append(FileInfo(
                file_id=file_id,
                filename=filename,
                size=file_size or stat.st_size,
                updated_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                path=str(file_path),
                group_id=group_id,
                group_name=group_name if group_id != 'ALL' else '全局'
            ))
    return files


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), group_id: Optional[str] = Query(None)):
    print(f"[File Router] 上传文件: {file.filename}, group_id: {group_id}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}。支持的类型: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if group_id:
        group_dir = os.path.join(KNOWLEDGE_DIR, group_id)
        os.makedirs(group_dir, exist_ok=True)
        filepath = os.path.join(group_dir, file.filename)
    else:
        os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
        filepath = os.path.join(KNOWLEDGE_DIR, file.filename)

    counter = 1
    original_filepath = filepath
    saved_filename = file.filename
    while os.path.exists(filepath):
        name = Path(filepath).stem
        filepath = os.path.join(os.path.dirname(original_filepath), f"{name}_{counter}{ext}")
        saved_filename = f"{name}_{counter}{ext}"
        counter += 1

    try:
        async with aiofiles.open(filepath, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        file_size = os.path.getsize(filepath)

        from services.knowledge_db import add_file_to_group

        file_group_id = group_id if group_id else 'ALL'

        add_file_to_group(
            group_id=file_group_id,
            filename=saved_filename,
            original_name=file.filename,
            file_path=str(filepath),
            file_type=ext[1:] if ext.startswith('.') else ext,
            file_size=file_size
        )

        return {
            "success": True,
            "file_id": saved_filename,
            "filename": file.filename,
            "filepath": filepath,
            "size": file_size,
            "group_id": group_id,
            "mime_type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")


@router.get("/{file_id}")
async def download_file(file_id: str, filename: str):
    filepath = os.path.join(TEMP_DIR, f"{file_id}_{filename}")

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="文件不存在")


@router.post("/knowledge/sync")
async def sync_knowledge_files():
    """同步知识库文件记录，删除数据库中文件不存在的记录"""
    from services.knowledge_db import get_knowledge_db

    db = get_knowledge_db()
    cursor = db.conn.execute("SELECT id, group_id, filename, file_path FROM knowledge_files")
    all_files = cursor.fetchall()

    deleted_count = 0
    missing_files = []

    for row in all_files:
        file_id, group_id, filename, file_path = row
        if file_path and not os.path.exists(file_path):
            db.conn.execute("DELETE FROM knowledge_files WHERE id = ?", (file_id,))
            deleted_count += 1
            missing_files.append(filename)

    if deleted_count > 0:
        db.conn.commit()

    return {
        "success": True,
        "deleted_count": deleted_count,
        "missing_files": missing_files,
        "message": f"已清理 {deleted_count} 个不存在的文件记录"
    }


@router.delete("/knowledge/{filename}")
async def delete_knowledge_file(filename: str):
    from services.knowledge_db import get_knowledge_db

    db = get_knowledge_db()
    cursor = db.conn.execute("SELECT id, file_path FROM knowledge_files WHERE filename = ?", (filename,))
    row = cursor.fetchone()

    if row:
        file_id, file_path = row
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        db.conn.execute("DELETE FROM knowledge_files WHERE id = ?", (file_id,))
        db.conn.commit()
        return {"success": True, "message": "文件已删除"}

    for group_id in os.listdir(KNOWLEDGE_DIR):
        group_dir = os.path.join(KNOWLEDGE_DIR, group_id)
        if os.path.isdir(group_dir):
            filepath = os.path.join(group_dir, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                cursor = db.conn.execute("SELECT id FROM knowledge_files WHERE file_path = ?", (filepath,))
                row = cursor.fetchone()
                if row:
                    db.conn.execute("DELETE FROM knowledge_files WHERE id = ?", (row[0],))
                    db.conn.commit()
                return {"success": True, "message": "文件已删除"}

    raise HTTPException(status_code=404, detail="文件不存在")