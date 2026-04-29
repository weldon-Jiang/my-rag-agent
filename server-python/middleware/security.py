from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional, Callable, Set
import time
import asyncio
from collections import defaultdict

from config import get_settings


class RateLimiter:
    def __init__(self, max_requests: int = 60, window: int = 60):
        self.max_requests = max_requests
        self.window = window
        self.requests: defaultdict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def is_allowed(self, key: str) -> bool:
        now = time.time()
        async with self._lock:
            self.requests[key] = [t for t in self.requests[key] if now - t < self.window]

            if len(self.requests[key]) >= self.max_requests:
                return False

            self.requests[key].append(now)
            return True

    async def get_remaining(self, key: str) -> int:
        now = time.time()
        async with self._lock:
            valid_requests = [t for t in self.requests[key] if now - t < self.window]
            return max(0, self.max_requests - len(valid_requests))

    async def get_reset_time(self, key: str) -> float:
        now = time.time()
        async with self._lock:
            if not self.requests[key]:
                return 0
            oldest = min(self.requests[key])
            return max(0, oldest + self.window - now)


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limiter: RateLimiter, exempt_paths: Optional[Set[str]] = None):
        super().__init__(app)
        self.rate_limiter = rate_limiter
        self.exempt_paths = exempt_paths or {"/", "/health", "/api/port", "/api/skills", "/static", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next: Callable):
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)

        client_key = request.client.host if request.client else "unknown"

        if not await self.rate_limiter.is_allowed(client_key):
            reset_time = await self.rate_limiter.get_reset_time(client_key)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": "Too many requests",
                    "code": "RATE_LIMIT_EXCEEDED",
                    "retry_after": int(reset_time) + 1
                },
                headers={"Retry-After": str(int(reset_time) + 1)}
            )

        response = await call_next(request)

        remaining = await self.rate_limiter.get_remaining(client_key)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limiter.max_requests)

        return response


def create_security_middleware(app, rate_limiter: RateLimiter):
    return SecurityMiddleware(app, rate_limiter)