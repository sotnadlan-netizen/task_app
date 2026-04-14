from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
from app.config import get_settings
from app.api.routes import health, audio, tasks, prompts, organizations
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


class RawRequestLogger:
    """Outermost ASGI wrapper — logs every HTTP request before anything else."""
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            logger.info(">>> INCOMING %s %s", scope.get("method"), scope.get("path"))
        await self.app(scope, receive, send)


app = FastAPI(
    title="AI Task Orchestrator API",
    description="Backend API for processing audio and managing tasks.",
    version="1.0.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler so unhandled 500s get CORS headers.
    Without this, Starlette's ServerErrorMiddleware bypasses CORSMiddleware.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


origins = [o.strip() for o in settings.allowed_origins.split(",")]
logger.info("CORS allowed_origins: %s", origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: tighten to `origins` after recording is confirmed working
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RawRequestLogger)

# Routes
app.include_router(health.router)
app.include_router(audio.router)
app.include_router(tasks.router)
app.include_router(prompts.router)
app.include_router(organizations.router)
