import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional, Dict, Any
import json
import traceback
from datetime import datetime


class StructuredLogger:
    def __init__(self, name: str, log_dir: str = "logs"):
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        self.logger.handlers = []

        log_path = Path(log_dir)
        log_path.mkdir(exist_ok=True)

        file_handler = RotatingFileHandler(
            log_path / f"{name}.log",
            maxBytes=10*1024*1024,
            backupCount=30,
            encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)

        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def _format_message(self, message: str, extra: Dict[str, Any]) -> str:
        if extra:
            extra_str = " | ".join([f"{k}={json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v}" for k, v in extra.items()])
            return f"{message} | {extra_str}"
        return message

    def info(self, message: str, **kwargs):
        self.logger.info(self._format_message(message, kwargs))

    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        extra_info = {}
        if error:
            extra_info["error_type"] = type(error).__name__
            extra_info["error_message"] = str(error)
        if kwargs.get("traceback", False) and error:
            extra_info["traceback"] = traceback.format_exc()
        self.logger.error(self._format_message(message, {**kwargs, **extra_info}))

    def warning(self, message: str, **kwargs):
        self.logger.warning(self._format_message(message, kwargs))

    def debug(self, message: str, **kwargs):
        self.logger.debug(self._format_message(message, kwargs))


api_logger = StructuredLogger("api")
service_logger = StructuredLogger("service")


async def log_requests(request, call_next):
    from config import settings
    start_time = datetime.now()

    api_logger.info(
        f"--> {request.method} {request.url.path}",
        client=request.client.host if request.client else "unknown",
        method=request.method,
        path=request.url.path
    )

    response = await call_next(request)

    process_time = (datetime.now() - start_time).total_seconds()

    api_logger.info(
        f"<-- {request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=int(process_time * 1000)
    )

    return response


async def error_handler(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        service_logger.error(
            f"Error handling request {request.url.path}",
            error=e,
            traceback=True,
            path=request.url.path,
            method=request.method
        )
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Internal server error", "code": "INTERNAL_ERROR"}
        )