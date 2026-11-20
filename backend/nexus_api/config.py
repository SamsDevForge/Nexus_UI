from __future__ import annotations

from functools import lru_cache
from typing import Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
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
    public_context_enabled: bool = False
    osrm_base_url: str | None = None
    notifications_enabled: bool = False
    push_enabled: bool = False
    push_token_encryption_key: SecretStr | None = None
    fcm_web_vapid_public_key: str | None = None
    calendar_enabled: bool = False
    calendar_encryption_key: SecretStr | None = None
    calendar_api_public_url: str | None = None
    calendar_web_url: str | None = None
    google_calendar_client_id: str | None = None
    google_calendar_client_secret: SecretStr | None = None
    microsoft_calendar_client_id: str | None = None
    microsoft_calendar_client_secret: SecretStr | None = None
    auto_create_test_schema: bool = Field(default=False, exclude=True)

    @model_validator(mode="after")
    def validate_environment(self) -> Self:
        for origin in (self.calendar_api_public_url, self.calendar_web_url):
            if origin:
                parsed = urlsplit(origin)
                local = self.app_env != "production" and parsed.hostname in {
                    "localhost",
                    "127.0.0.1",
                }
                if (
                    (parsed.scheme != "https" and not (local and parsed.scheme == "http"))
                    or not parsed.hostname
                    or parsed.username
                    or parsed.query
                    or parsed.fragment
                    or parsed.path not in {"", "/"}
                ):
                    raise ValueError(
                        "Calendar origins require HTTPS (localhost HTTP in development) "
                        "and no path/query."
                    )
        if self.calendar_encryption_key and self.calendar_encryption_key.get_secret_value():
            from cryptography.fernet import Fernet

            Fernet(self.calendar_encryption_key.get_secret_value().encode())
        if self.push_enabled:
            if not self.notifications_enabled or not self.push_token_encryption_key:
                raise ValueError("Push requires notifications and an encryption key.")
            if not self.firebase_project_id or not self.firebase_service_account_json_b64:
                raise ValueError("Push requires the configured Firebase service account.")
            from cryptography.fernet import Fernet

            Fernet(self.push_token_encryption_key.get_secret_value().encode())
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
