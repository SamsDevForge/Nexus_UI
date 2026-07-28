from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import Settings
from .models import Base


def normalize_async_database_url(value: str) -> str:
    if value.startswith("postgresql+asyncpg://") or value.startswith("sqlite+aiosqlite://"):
        return value
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+asyncpg://", 1)
    return value


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
