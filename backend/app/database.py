from urllib.parse import urlparse, urlencode, parse_qs
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column
from sqlalchemy import DateTime, func
from datetime import datetime
from typing import AsyncGenerator, Optional

from .config import get_settings

settings = get_settings()

def _build_engine_url(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    params = parse_qs(parsed.query)
    ssl_mode = params.pop("sslmode", None)
    if params:
        new_query = urlencode(params, doseq=True)
        new_url = parsed._replace(query=new_query).geturl()
    else:
        new_url = parsed._replace(query="").geturl()
    return new_url

_connect_args: dict = {}
raw_url = settings.DATABASE_URL
parsed = urlparse(raw_url)
ssl_mode_qs = parse_qs(parsed.query).get("sslmode")
if ssl_mode_qs:
    mode = ssl_mode_qs[0]
    if mode in ("require", "verify-ca", "verify-full"):
        _connect_args["ssl"] = "require"
clean_url = _build_engine_url(raw_url)

engine = create_async_engine(
    clean_url,
    connect_args=_connect_args or None,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
