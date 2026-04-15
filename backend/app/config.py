from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str = ""
    gemini_api_key: str
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"
    max_audio_size_mb: int = 50
    # Email (Resend) — optional; leave empty to disable post-meeting emails
    resend_api_key: str = ""
    email_from: str = "meetings@yourdomain.com"
    app_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
