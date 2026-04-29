from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional
import time
import asyncio

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


class ComponentHealth(BaseModel):
    status: str
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    status: str
    timestamp: float
    uptime_seconds: float
    version: str
    components: Dict[str, ComponentHealth]
    system: Optional[Dict[str, Any]] = None


router = APIRouter()
_start_time = time.time()


async def check_ai_service() -> ComponentHealth:
    start = time.time()
    try:
        from config import API_KEY, API_BASE_URL
        if not API_KEY:
            return ComponentHealth(status="degraded", message="API key not configured")
        if not API_BASE_URL:
            return ComponentHealth(status="degraded", message="API base URL not configured")

        latency = (time.time() - start) * 1000
        return ComponentHealth(status="healthy", latency_ms=latency)
    except Exception as e:
        return ComponentHealth(status="unhealthy", message=str(e))


async def check_vector_store() -> ComponentHealth:
    start = time.time()
    try:
        from services.vector_service import get_vector_store
        vs = get_vector_store()
        count = vs.get_count()
        latency = (time.time() - start) * 1000
        return ComponentHealth(
            status="healthy",
            latency_ms=latency,
            details={"document_count": count, "collection": vs.collection_name}
        )
    except Exception as e:
        return ComponentHealth(status="unhealthy", message=str(e))


async def check_database() -> ComponentHealth:
    start = time.time()
    try:
        from services.session_db import get_session_db
        db = get_session_db()
        sessions = db.get_all_sessions()
        latency = (time.time() - start) * 1000
        return ComponentHealth(
            status="healthy",
            latency_ms=latency,
            details={"session_count": len(sessions)}
        )
    except Exception as e:
        return ComponentHealth(status="unhealthy", message=str(e))


@router.get("/health", response_model=HealthResponse)
async def basic_health_check():
    return HealthResponse(
        status="healthy",
        timestamp=time.time(),
        uptime_seconds=time.time() - _start_time,
        version="1.0.0",
        components={}
    )


@router.get("/health/detailed", response_model=HealthResponse)
async def detailed_health_check(request: Request):
    ai_health, vs_health, db_health = await asyncio.gather(
        check_ai_service(),
        check_vector_store(),
        check_database()
    )

    components = {
        "ai_service": ai_health,
        "vector_store": vs_health,
        "database": db_health
    }

    system = {}
    if HAS_PSUTIL:
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            system = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_mb": memory.available / (1024 * 1024),
                "disk_percent": disk.percent
            }
        except Exception:
            pass

    unhealthy_count = sum(1 for c in components.values() if c.status == "unhealthy")
    degraded_count = sum(1 for c in components.values() if c.status == "degraded")

    if unhealthy_count > 0:
        overall = "unhealthy"
    elif degraded_count > 0:
        overall = "degraded"
    else:
        overall = "healthy"

    if system and (system.get("cpu_percent", 0) > 90 or system.get("memory_percent", 0) > 90):
        overall = "degraded" if overall == "healthy" else overall

    return HealthResponse(
        status=overall,
        timestamp=time.time(),
        uptime_seconds=time.time() - _start_time,
        version="1.0.0",
        components=components,
        system=system if system else None
    )