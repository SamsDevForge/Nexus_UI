from __future__ import annotations

from functools import lru_cache
from typing import Literal, Self

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: Literal["development", "test", "production"] = "development"
    database_url: str | None = None
    migration_database_url: str | None = None
    cors_allowed_origins: str = "http://localhost:3000"
    firebase_project_id: str | None = None
    firebase_service_account_json_b64: str | None = None
    log_level: str = "INFO"
    auto_create_test_schema: bool = Field(default=False, exclude=True)

    @model_validator(mode="after")
    def validate_environment(self) -> Self:
        origins = self.cors_origins
        if "*" in origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must contain exact origins, never '*'.")
        if self.auto_create_test_schema and self.app_env != "test":
            raise ValueError("Automatic schema creation is restricted to APP_ENV=test.")
        if self.app_env == "production":
            missing = [
                name
                for name, value in (
                    ("DATABASE_URL", self.database_url),
                    ("MIGRATION_DATABASE_URL", self.migration_database_url),
                    ("FIREBASE_PROJECT_ID", self.firebase_project_id),
                    (
                        "FIREBASE_SERVICE_ACCOUNT_JSON_B64",
                        self.firebase_service_account_json_b64,
                    ),
                )
                if not value
            ]
            if missing:
                raise ValueError("Production configuration is incomplete: " + ", ".join(missing))
            if not origins:
                raise ValueError("Production CORS_ALLOWED_ORIGINS cannot be empty.")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
