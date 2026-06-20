"""
Shared fixtures for backend tests.
Uses a separate test database defined via DATABASE_URL env var.
Skips all tests if the database is unreachable.
"""
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database import Base, get_db
from app.main import app

settings = get_settings()


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


async def _db_reachable() -> bool:
    try:
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        async with engine.begin() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        await engine.dispose()
        return True
    except (OperationalError, ConnectionRefusedError, OSError):
        return False


def pytest_configure(config):
    config.option.db_unavailable = False


def pytest_collection_modifyitems(config, items):
    if config.option.db_unavailable:
        skip_db = pytest.mark.skip(reason="Database unreachable — set DATABASE_URL to a running Postgres")
        for item in items:
            if "db_session" in item.fixturenames or "client" in item.fixturenames:
                item.add_marker(skip_db)


def pytest_sessionstart(session):
    loop = asyncio.new_event_loop()
    reachable = loop.run_until_complete(_db_reachable())
    loop.close()
    if not reachable:
        session.config.option.db_unavailable = True
        print("\n⚠  Database unreachable — skipping all DB-dependent tests")


@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(async_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(async_engine) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        session_factory = async_sessionmaker(async_engine, expire_on_commit=False)
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
