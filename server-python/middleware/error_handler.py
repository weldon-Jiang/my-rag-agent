from fastapi import Request
from fastapi.responses import JSONResponse
from services.exceptions import (
    AgentException,
    SessionNotFoundException,
    InvalidRequestException,
    UnauthorizedException,
    RateLimitException,
    AIServiceException,
    VectorStoreException,
    ToolExecutionException
)
import traceback
import logging

logger = logging.getLogger(__name__)

async def agent_exception_handler(request: Request, exc: AgentException):
    logger.warning(f"Agent exception on {request.url.path}: {exc.message}")

    status_code = 400
    if isinstance(exc, UnauthorizedException):
        status_code = 401
    elif isinstance(exc, RateLimitException):
        status_code = 429
    elif isinstance(exc, SessionNotFoundException):
        status_code = 404

    return JSONResponse(
        status_code=status_code,
        content=exc.to_dict()
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}")
    logger.debug(traceback.format_exc())

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "code": "INTERNAL_ERROR"
        }
    )


async def validation_exception_handler(request: Request, exc):
    logger.warning(f"Validation error on {request.url.path}: {str(exc)}")

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": str(exc),
            "code": "VALIDATION_ERROR"
        }
    )


async def http_exception_handler(request: Request, exc):
    logger.warning(f"HTTP error on {request.url.path}: {exc.status_code}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail if hasattr(exc, 'detail') else str(exc),
            "code": "HTTP_ERROR"
        }
    )