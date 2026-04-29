from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class ChatMode(str, Enum):
    HYBRID = "hybrid"
    AGENT = "agent"
    KNOWLEDGE = "knowledge"


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    mode: ChatMode = ChatMode.HYBRID
    model: Optional[str] = None
    clarification_id: Optional[str] = None
    original_query: Optional[str] = None
    attachments: Optional[List[dict]] = None
    group_id: Optional[str] = None


class ClarificationOption(BaseModel):
    label: str
    value: str


class ChatResponse(BaseModel):
    type: str = "text"
    content: Optional[str] = None
    intent: Optional[str] = None
    tools: Optional[List[str]] = None
    reasoning: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[ClarificationOption]] = None
    clarification_id: Optional[str] = None
    original_query: Optional[str] = None
    error: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class SessionCreate(BaseModel):
    name: Optional[str] = None


class ModelInfo(BaseModel):
    id: str
    name: str
    protocol: str
    supports_multimodal: bool = False
    description: Optional[str] = None
    url: Optional[str] = None
    modelId: Optional[str] = None
    apiKey: Optional[str] = None
    published: bool = True


class ModelSwitch(BaseModel):
    model_id: str


class FileUploadResponse(BaseModel):
    success: bool
    file_id: str
    filename: str
    filepath: str
    size: int
    mime_type: Optional[str] = None


class SkillInfo(BaseModel):
    name: str
    description: str
    category: str
    tools: List[str] = []


class SkillProcessRequest(BaseModel):
    file: dict
    model: Optional[str] = "minimax-m2.5"
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None