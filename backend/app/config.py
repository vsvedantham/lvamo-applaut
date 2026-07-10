from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str

    # JWT
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url: str = ""

    # AI providers
    openai_api_key: str = ""

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Server
    backend_cors_origins: List[str] = ["http://localhost:5173"]
    backend_port: int = 8000

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip().strip("[]")
            return [u.strip().strip('"').strip("'") for u in v.split(",") if u.strip()]
        return v


settings = Settings()
