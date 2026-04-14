import time
import logging
from typing import Callable
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware:
    """
    Pure ASGI middleware that logs method, path, status, and latency.

    BaseHTTPMiddleware has a known deadlock with large request bodies
    (e.g. multipart audio uploads) because its internal task queue
    blocks when the body exceeds the buffer. Pure ASGI avoids this.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.time()
        status_code = 0

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        elapsed = (time.time() - start) * 1000
        method = scope.get("method", "")
        path = scope.get("path", "")
        logger.info("%s %s → %d (%.1fms)", method, path, status_code, elapsed)
