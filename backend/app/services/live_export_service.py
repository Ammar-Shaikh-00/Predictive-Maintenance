"""Shared pagination + time-range helpers for live_monitor Postgres export."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional, Sequence, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


def to_utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


class LivePageMeta(BaseModel):
    limit: int = Field(..., ge=1)
    offset: int = Field(..., ge=0)
    has_more: bool
    returned: int = Field(..., ge=0)


class LiveExportPage(BaseModel):
    """Paginated export envelope for Ammar retrain / UI history."""

    model_config = ConfigDict(from_attributes=True)

    items: list[Any] = Field(default_factory=list)
    limit: int
    offset: int
    has_more: bool
    machine_id: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


async def fetch_page(
    session: AsyncSession,
    query: Select,
    *,
    limit: int,
    offset: int,
) -> tuple[Sequence[Any], bool]:
    """Fetch limit+1 rows to compute has_more without a separate COUNT."""
    capped = max(1, min(int(limit), 10_000))
    off = max(0, int(offset))
    result = await session.execute(query.limit(capped + 1).offset(off))
    rows = list(result.scalars().all())
    has_more = len(rows) > capped
    return rows[:capped], has_more


def parse_uuid(value: Optional[str | UUID]) -> Optional[UUID]:
    if value is None or value == "":
        return None
    if isinstance(value, UUID):
        return value
    return UUID(str(value))
