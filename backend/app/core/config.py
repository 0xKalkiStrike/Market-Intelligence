from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Market-Intelligence"
    environment: str = "development"


    database_url: str = "sqlite:///./market_intelligence.db"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    credential_encryption_key: str = "CHANGE_ME_32_BYTE_FERNET_KEY_____"

    cors_origins: list[str] = ["http://localhost:3000"]

    storage_path: str = "./storage"


@lru_cache
def get_settings() -> Settings:
    return Settings()
