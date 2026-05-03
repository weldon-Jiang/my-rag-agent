from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Optional
from pydantic import BaseModel

from models.schemas import SessionResponse, SessionCreate
from services.session_db import (
    init_session_db,
    get_all_sessions as db_get_all_sessions,
    get_session as db_get_session,
    create_session as db_create_session,
    delete_session as db_delete_session,
    get_messages as db_get_messages,
    add_message as db_add_message,
    get_message_count as db_get_message_count,
    update_session_name as db_update_session_name
)

router = APIRouter()

init_session_db()


@router.get("/", response_model=List[SessionResponse])
async def get_sessions():
    sessions = db_get_all_sessions()
    result = []
    for session in sessions:
        message_count = db_get_message_count(session["id"])
        result.append(SessionResponse(
            id=session["id"],
            name=session["name"],
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            message_count=message_count
        ))
    return result


@router.post("/", response_model=SessionResponse)
async def create_session(data: SessionCreate):
    session = db_create_session(name=data.name)
    return SessionResponse(
        id=session["id"],
        name=session["name"],
        created_at=session["created_at"],
        updated_at=session["updated_at"],
        message_count=0
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    message_count = db_get_message_count(session_id)
    return SessionResponse(
        id=session["id"],
        name=session["name"],
        created_at=session["created_at"],
        updated_at=session["updated_at"],
        message_count=message_count
    )


@router.put("/{session_id}/")
async def update_session(session_id: str, data: SessionCreate):
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db_update_session_name(session_id, data.name)
    updated_session = db_get_session(session_id)
    message_count = db_get_message_count(session_id)

    return SessionResponse(
        id=updated_session["id"],
        name=updated_session["name"],
        created_at=updated_session["created_at"],
        updated_at=updated_session["updated_at"],
        message_count=message_count
    )


@router.delete("/{session_id}/")
async def delete_session_endpoint(session_id: str):
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db_delete_session(session_id)
    return {"success": True, "message": "Session deleted"}


@router.get("/{session_id}/messages")
async def get_session_messages(session_id: str, limit: int = 50):
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db_get_messages(session_id, limit)
    result = []
    for m in messages:
        msg_dict = {"role": m["role"], "content": m["content"], "timestamp": str(m["timestamp"])}
        if m.get("metadata") and isinstance(m["metadata"], dict):
            if "source" in m["metadata"]:
                msg_dict["source"] = m["metadata"]["source"]
            if "thinking" in m["metadata"]:
                msg_dict["thinking"] = m["metadata"]["thinking"]
            if "tools" in m["metadata"]:
                msg_dict["tools"] = m["metadata"]["tools"]
        result.append(msg_dict)
    return {"session_id": session_id, "messages": result}


class MessageCreate(BaseModel):
    role: str
    content: str
    metadata: Optional[Dict] = None


@router.post("/{session_id}/messages")
async def add_session_message(session_id: str, message: MessageCreate):
    """添加消息到会话"""
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    add_message_to_session(session_id, message.role, message.content, message.metadata)
    return {"success": True}


def add_message_to_session(session_id: str, role: str, content: str, metadata: Dict = None):
    print(f"[Session] 添加消息 - session: {session_id}, role: {role}, content长度: {len(content)}")
    result = db_add_message(session_id, role, content, metadata)
    print(f"[Session] 消息已保存")
    return result


def get_session_messages_list(session_id: str, limit: int = 20):
    print(f"[Session] 获取会话消息 - session: {session_id}, limit: {limit}")
    messages = db_get_messages(session_id, limit)
    result = []
    for m in messages:
        msg_dict = {"role": m["role"], "content": m["content"], "timestamp": str(m["timestamp"])}
        if m.get("metadata") and isinstance(m["metadata"], dict):
            if "source" in m["metadata"]:
                msg_dict["source"] = m["metadata"]["source"]
            if "thinking" in m["metadata"]:
                msg_dict["thinking"] = m["metadata"]["thinking"]
            if "tools" in m["metadata"]:
                msg_dict["tools"] = m["metadata"]["tools"]
        result.append(msg_dict)
    print(f"[Session] 返回 {len(result)} 条消息")
    return result