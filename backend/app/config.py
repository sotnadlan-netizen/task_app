from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str = ""
    gemini_api_key: str = ""
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"
    max_audio_size_mb: int = 50
    # Set MOCK_AI=true in .env to skip Gemini and return fake data locally
    mock_ai: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
