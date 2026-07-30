from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import unquote_plus

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import Settings
from .models import Base


def _normalize_asyncpg_query(value: str) -> str:
    url_without_fragment, fragment_separator, fragment = value.partition("#")
    base_url, query_separator, query = url_without_fragment.partition("?")
    if not query_separator:
        return value

    parameters = [parameter for parameter in query.split("&") if parameter]
    has_asyncpg_ssl = any(
        unquote_plus(parameter.partition("=")[0]).casefold() == "ssl"
        for parameter in parameters
    )
    normalized_parameters: list[str] = []

    for parameter in parameters:
        encoded_name, value_separator, encoded_value = parameter.partition("=")
        name = unquote_plus(encoded_name).casefold()

        if name == "channel_binding":
            continue

        if (
            name == "sslmode"
            and value_separator
            and unquote_plus(encoded_value).casefold() == "require"
        ):
            if not has_asyncpg_ssl:
                normalized_parameters.append("ssl=require")
                has_asyncpg_ssl = True
            continue

        normalized_parameters.append(parameter)

    normalized_url = base_url
    if normalized_parameters:
        normalized_url += f"?{'&'.join(normalized_parameters)}"
    if fragment_separator:
        normalized_url += f"#{fragment}"
    return normalized_url


def normalize_async_database_url(value: str) -> str:
    if value.startswith("sqlite+aiosqlite://"):
        return value
    if value.startswith("postgresql://"):
        value = value.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql+asyncpg://", 1)
    elif not value.startswith("postgresql+asyncpg://"):
        return value
    return _normalize_asyncpg_query(value)


class Database:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.engine: AsyncEngine | None = None
        self.session_factory: async_sessionmaker[AsyncSession] | None = None

    async def start(self) -> None:
        if not self.settings.database_url:
            return
        url = normalize_async_database_url(self.settings.database_url)
        self.engine = create_async_engine(
            url,
            pool_pre_ping=True,
            echo=False,
        )
        self.session_factory = async_sessionmaker(
            self.engine,
            expire_on_commit=False,
            autoflush=False,
        )
        if self.settings.auto_create_test_schema:
            async with self.engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)

    async def stop(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()

    async def ready(self) -> bool:
        if self.engine is None:
            return False
        try:
            async with self.engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        except Exception:
            return False
        return True

    async def session(self) -> AsyncIterator[AsyncSession]:
        if self.session_factory is None:
            raise RuntimeError("Database is not configured.")
        async with self.session_factory() as session:
            yield session
