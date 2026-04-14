from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.api.middleware.auth import RequestLoggingMiddleware
from app.api.routes import health, audio, tasks, prompts, organizations
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="AI Task Orchestrator API",
    description="Backend API for processing audio and managing tasks.",
    version="1.0.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler so unhandled 500s still get CORS headers.
    Without this, Starlette's ServerErrorMiddleware returns a bare 500
    that bypasses CORSMiddleware, causing the browser to see an opaque
    network error with no response body.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Middleware is applied in reverse registration order (last added = outermost).
# We want: CORSMiddleware (outermost) → RequestLoggingMiddleware → route handlers.
# So register RequestLogging first, then CORS.
app.add_middleware(RequestLoggingMiddleware)

origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router)
app.include_router(audio.router)
app.include_router(tasks.router)
app.include_router(prompts.router)
app.include_router(organizations.router)
