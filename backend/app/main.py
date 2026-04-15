from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.api.middleware.auth import RequestLoggingMiddleware
from app.api.routes import health, audio, tasks, prompts, organizations, sessions
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="AI Task Orchestrator API",
    description="Backend API for processing audio and managing tasks.",
    version="1.0.0",
)

# ── Global exception handler ──────────────────────────────────────────────────
# FastAPI exception handlers execute inside ExceptionMiddleware, which is
# nested *inside* CORSMiddleware, so CORS headers are added to these responses.
# Without this, unhandled 500s are caught by Starlette's ServerErrorMiddleware
# (which is *outside* all user middleware) and CORS headers are never attached.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ── Middleware (added in reverse-wrap order: last added = outermost) ──────────
# RequestLoggingMiddleware added first → becomes inner (closest to the app)
app.add_middleware(RequestLoggingMiddleware)

# CORSMiddleware added last → becomes outermost user middleware, so it always
# gets to attach Access-Control-* headers before the response leaves the server.
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Routes
app.include_router(health.router)
app.include_router(audio.router)
app.include_router(tasks.router)
app.include_router(prompts.router)
app.include_router(organizations.router)
app.include_router(sessions.router)
