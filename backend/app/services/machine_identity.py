"""Resolve machine identity from the live `machine` table — no hardcoded IDs.

UI/API may pass a UUID, an integration slug, or a display name.
Live tables (`live_run_evaluation`, `live_process_window`, `production_run`)
store `machine.id` (UUID). This module maps any incoming token to that UUID
by querying Postgres at runtime, so extra machines/lines work without code changes.
"""

from __future__ import annotations

from typing import Any, Iterable, List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.live_run_evaluation import LiveRunEvaluation
from app.models.machine import Machine
from app.models.operations_hardening import MachineIntegration


def parse_machine_uuid(machine_id: Any) -> Optional[UUID]:
    if machine_id is None or machine_id == "":
        return None
    if isinstance(machine_id, UUID):
        return machine_id
    try:
        return UUID(str(machine_id).strip())
    except (TypeError, ValueError):
        return None


def ids_match(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return False
    sa, sb = str(a).strip().lower(), str(b).strip().lower()
    if sa == sb:
        return True
    return sa.replace("-", "") == sb.replace("-", "")


def _name_candidates(raw: str) -> List[str]:
    text = str(raw or "").strip()
    if not text:
        return []
    spaced = text.replace("_", " ").replace("-", " ")
    out: List[str] = []
    for item in (text, spaced, spaced.lower(), spaced.title()):
        if item and item not in out:
            out.append(item)
    return out


async def list_machines(session: AsyncSession) -> List[Machine]:
    result = await session.execute(select(Machine).order_by(Machine.name.asc()))
    return list(result.scalars().all())


async def resolve_machine_uuid(
    session: AsyncSession, machine_id: Optional[str]
) -> Optional[UUID]:
    """Map incoming machine_id to `machine.id` from the database."""
    if machine_id is None or str(machine_id).strip() == "":
        return None

    parsed = parse_machine_uuid(machine_id)
    if parsed is not None:
        exists = await session.execute(select(Machine.id).where(Machine.id == parsed))
        if exists.scalar_one_or_none() is not None:
            return parsed
        # UUID is already the live-table key even if Machine row is missing
        return parsed

    slug = str(machine_id).strip()

    # Integration slug / name → real Machine UUID
    integ = await session.execute(
        select(MachineIntegration).where(
            func.lower(MachineIntegration.machine_id) == slug.lower()
        )
    )
    integration = integ.scalars().first()
    if integration is not None:
        integ_uuid = parse_machine_uuid(integration.machine_id)
        if integ_uuid is not None:
            return integ_uuid
        for candidate in _name_candidates(integration.machine_name or ""):
            found = await _machine_id_by_name(session, candidate)
            if found is not None:
                return found

    for candidate in _name_candidates(slug):
        found = await _machine_id_by_name(session, candidate)
        if found is not None:
            return found

    # Last resort: unique Machine row (single-machine plants only)
    count_row = await session.execute(select(func.count()).select_from(Machine))
    if int(count_row.scalar() or 0) == 1:
        only = await session.execute(select(Machine.id).limit(1))
        return only.scalar_one_or_none()

    return None


async def _machine_id_by_name(session: AsyncSession, name: str) -> Optional[UUID]:
    if not name.strip():
        return None
    exact = await session.execute(
        select(Machine.id).where(func.lower(Machine.name) == name.strip().lower())
    )
    row = exact.scalar_one_or_none()
    if row is not None:
        return row
    fuzzy = await session.execute(
        select(Machine.id).where(Machine.name.ilike(f"%{name.strip()}%")).limit(2)
    )
    hits = list(fuzzy.scalars().all())
    if len(hits) == 1:
        return hits[0]
    return None


async def latest_live_machine_uuid(
    session: AsyncSession, *, line_id: Optional[int] = None
) -> Optional[UUID]:
    """Newest evaluation's machine_id — whatever is in the DB right now."""
    stmt = select(LiveRunEvaluation.machine_id).where(
        LiveRunEvaluation.machine_id.isnot(None)
    )
    if line_id is not None:
        stmt = stmt.where(LiveRunEvaluation.line_id == line_id)
    stmt = stmt.order_by(LiveRunEvaluation.id.desc()).limit(1)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


def match_integration(
    integrations: Iterable[Any], machine_uuid: Optional[UUID], machines: Iterable[Machine]
) -> Optional[Any]:
    """Pick a machine_integrations row that corresponds to a real Machine UUID."""
    if machine_uuid is None:
        return None
    name_by_id = {m.id: (m.name or "") for m in machines}
    target_name = name_by_id.get(machine_uuid, "").strip().lower()
    for row in integrations:
        if ids_match(getattr(row, "machine_id", None), machine_uuid):
            return row
        row_name = str(getattr(row, "machine_name", None) or "").strip().lower()
        if target_name and row_name and (
            row_name == target_name or target_name in row_name or row_name in target_name
        ):
            return row
    return None
