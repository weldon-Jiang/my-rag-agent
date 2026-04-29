import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 3030
    debug: bool = False

    api_key: str = ""
    api_base_url: str = "https://api.minimax.chat/v1"
    default_model: str = "minimax-m2.5"
    ai_timeout: int = 120
    ai_max_retries: int = 3

    chroma_db_path: str = "./data/chroma_db"
    embedding_model: str = "text-embedding-ada-002"

    session_expire_hours: int = 168
    max_session_messages: int = 100

    rate_limit_requests: int = 60
    rate_limit_window: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


BASE_DIR = Path(__file__).resolve().parent.parent
settings = get_settings()

KNOWLEDGE_DIR = os.getenv("KNOWLEDGE_DIR", str(BASE_DIR / "knowledge"))
DATA_DIR = os.getenv("DATA_DIR", str(BASE_DIR / "data"))
TEMP_DIR = os.getenv("TEMP_DIR", str(BASE_DIR / "temp"))
PORT = settings.port
HOST = settings.host

API_KEY = settings.api_key
API_BASE_URL = settings.api_base_url

CHROMA_DB_PATH = settings.chroma_db_path

SESSION_EXPIRE_HOURS = settings.session_expire_hours
MAX_SESSION_MESSAGES = settings.max_session_messages

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"}

os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(CHROMA_DB_PATH, exist_ok=True)