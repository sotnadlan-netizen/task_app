from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.middleware.auth import RequestLoggingMiddleware
from app.api.routes import health, audio, tasks, prompts, organizations
import logging

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="AI Task Orchestrator API",
    description="Backend API for processing audio and managing tasks.",
    version="1.0.0",
)

# CORS
origins = [o.strip() for o in settings.allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)

# Routes
app.include_router(health.router)
app.include_router(audio.router)
app.include_router(tasks.router)
app.include_router(prompts.router)
app.include_router(organizations.router)
