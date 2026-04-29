import asyncio
import hashlib
import time
from typing import Optional, Dict, Any
from collections import OrderedDict


class LRUCache:
    def __init__(self, max_size: int = 500, ttl: int = 1800):
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl

    def _make_key(self, prompt: str, model: str) -> str:
        content = f"{model}:{prompt[:200]}"
        return hashlib.md5(content.encode()).hexdigest()

    def get(self, prompt: str, model: str) -> Optional[str]:
        key = self._make_key(prompt, model)
        if key in self.cache:
            content, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                self.cache.move_to_end(key)
                return content
            del self.cache[key]
        return None

    def set(self, prompt: str, model: str, content: str):
        key = self._make_key(prompt, model)
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = (content, time.time())
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)

    def clear(self):
        self.cache.clear()

    def size(self) -> int:
        return len(self.cache)


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60, half_open_max: int = 3):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.half_open_max = half_open_max
        self.failures = 0
        self.last_failure_time = 0
        self.state = "closed"
        self.half_open_calls = 0
        self._lock = asyncio.Lock()

    async def call(self, func, *args, **kwargs):
        async with self._lock:
            if self.state == "open":
                if time.time() - self.last_failure_time > self.timeout:
                    self.state = "half_open"
                    self.half_open_calls = 0
                else:
                    raise CircuitBreakerOpen("Circuit breaker is OPEN")

        if self.state == "half_open":
            async with self._lock:
                self.half_open_calls += 1
                if self.half_open_calls > self.half_open_max:
                    raise CircuitBreakerOpen("Circuit breaker half_open limit exceeded")

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            if self.state == "half_open":
                async with self._lock:
                    self.state = "closed"
                    self.failures = 0
            return result

        except Exception as e:
            async with self._lock:
                self.failures += 1
                self.last_failure_time = time.time()
                if self.failures >= self.failure_threshold:
                    self.state = "open"
            raise e

    def get_state(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "failures": self.failures,
            "last_failure_time": self.last_failure_time
        }


class CircuitBreakerOpen(Exception):
    pass


ai_cache = LRUCache(max_size=500, ttl=1800)
circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=60)