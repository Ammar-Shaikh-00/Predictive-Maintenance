"""Aggregations for historical production runs (no dedicated historical_runs table)."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.live_run_evaluation import LiveRunEvaluation
from app.models.machine import Machine
from app.models.production_run import ProductionRun
from app.models.quality_record import QualityRecord


def _utc_cutoff(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def list_historical_runs(session: AsyncSession, days: int) -> list[dict]:
    """Production runs in the rolling window with machine name, scrap, and duration (seconds)."""
    cutoff = _utc_cutoff(days)
    now = datetime.now(timezone.utc)

    scrap_sq = (
        select(QualityRecord.scrap_percentage)
        .where(QualityRecord.production_run_id == ProductionRun.id)
        .limit(1)
        .scalar_subquery()
    )

    stmt = (
        select(
            ProductionRun.id,
            ProductionRun.product_name,
            ProductionRun.product_code,
            Machine.name,
            ProductionRun.line_id,
            ProductionRun.start_time,
            ProductionRun.end_time,
            scrap_sq.label("scrap_percentage"),
            ProductionRun.status,
        )
        .select_from(ProductionRun)
        .outerjoin(Machine, Machine.id == ProductionRun.machine_id)
        .where(ProductionRun.start_time >= cutoff)
        .order_by(ProductionRun.start_time.desc())
    )
    result = await session.execute(stmt)
    rows: list[dict] = []
    for row in result.all():
        (
            run_id,
            product_name,
            product_code,
            machine_name,
            line_id,
            start_time,
            end_time,
            scrap_percentage,
            status,
        ) = row
        effective_end = end_time if end_time is not None else now
        duration = (effective_end - start_time).total_seconds()
        rows.append(
            {
                "run_id": run_id,
                "product": product_name or product_code,
                "machine_name": machine_name,
                "line_id": line_id,
                "start_time": start_time,
                "duration": duration,
                "scrap_percentage": float(scrap_percentage)
                if scrap_percentage is not None
                else None,
                "status": status,
            }
        )
    return rows


async def fetch_run_ids_in_window(session: AsyncSession, days: int) -> list[int]:
    """Production runs with start_time on or after the rolling cutoff."""
    cutoff = _utc_cutoff(days)
    q = (
        select(ProductionRun.id)
        .where(ProductionRun.start_time >= cutoff)
        .order_by(ProductionRun.id.desc())
    )
    result = await session.execute(q)
    return [row[0] for row in result.all()]


async def average_scrap_percent_for_runs(session: AsyncSession, run_ids: Iterable[int]) -> float:
    """
    Sum of each run's quality_record.scrap_percentage divided by total runs.
    One QC row per production run; runs without a quality row count as 0 in the sum.
    """
    ids = list(run_ids)
    if not ids:
        return 0.0

    q = select(QualityRecord.production_run_id, QualityRecord.scrap_percentage).where(
        QualityRecord.production_run_id.in_(ids)
    )
    result = await session.execute(q)
    by_run = {row[0]: float(row[1] or 0) for row in result.all()}
    total_scrap = sum(by_run.get(rid, 0.0) for rid in ids)
    return total_scrap / len(ids)


async def average_duration_seconds_for_runs(session: AsyncSession, run_ids: Iterable[int]) -> float:
    """Mean (effective_end - start_time) in seconds; missing end_time uses current UTC."""
    ids = list(run_ids)
    if not ids:
        return 0.0

    now = datetime.now(timezone.utc)
    q = select(ProductionRun.start_time, ProductionRun.end_time).where(
        ProductionRun.id.in_(ids),
        ProductionRun.start_time.isnot(None),
    )
    result = await session.execute(q)
    rows = result.all()
    if not rows:
        return 0.0

    durations: list[float] = []
    for start_time, end_time in rows:
        effective_end = end_time if end_time is not None else now
        durations.append((effective_end - start_time).total_seconds())

    return sum(durations) / len(durations)


def _normalize_overall_status(raw: str | None) -> str | None:
    if not raw:
        return None
    u = raw.strip().upper()
    if u in ("NORMAL", "WARNING", "CRITICAL"):
        return u
    return None


_STATUS_RANK = {"NORMAL": 1, "WARNING": 2, "CRITICAL": 3}


def _status_rank(label: str) -> int:
    return _STATUS_RANK.get(label, 0)


async def count_status_by_majority_overall_per_run(
    session: AsyncSession, run_ids: Iterable[int]
) -> tuple[int, int, int]:
    """
    Group live_run_evaluation by production_run_id; each run's status is the
    overall_status that appears most often in that group (NORMAL/WARNING/CRITICAL).
    Ties break by higher severity (CRITICAL > WARNING > NORMAL).
    """
    ids = list(run_ids)
    if not ids:
        return 0, 0, 0

    q = select(LiveRunEvaluation.production_run_id, LiveRunEvaluation.overall_status).where(
        LiveRunEvaluation.production_run_id.isnot(None),
        LiveRunEvaluation.production_run_id.in_(ids),
    )
    result = await session.execute(q)
    votes_by_run: dict[int, dict[str, int]] = {}
    for rid, raw in result.all():
        label = _normalize_overall_status(raw)
        if label is None:
            continue
        if rid not in votes_by_run:
            votes_by_run[rid] = {"NORMAL": 0, "WARNING": 0, "CRITICAL": 0}
        votes_by_run[rid][label] += 1

    labels = ("NORMAL", "WARNING", "CRITICAL")
    normal = warning = critical = 0
    for counts in votes_by_run.values():
        winner = max(labels, key=lambda lab: (counts[lab], _status_rank(lab)))
        if winner == "NORMAL":
            normal += 1
        elif winner == "WARNING":
            warning += 1
        else:
            critical += 1

    return normal, warning, critical


async def get_historical_status_summary(session: AsyncSession, days: int) -> dict:
    run_ids = await fetch_run_ids_in_window(session, days)
    total = len(run_ids)

    avg_scrap = await average_scrap_percent_for_runs(session, run_ids)
    avg_dur = await average_duration_seconds_for_runs(session, run_ids)
    normal, warning, critical = await count_status_by_majority_overall_per_run(session, run_ids)

    return {
        "total_runs": total,
        "Average_scrap": avg_scrap,
        "Average_duration": avg_dur,
        "normal_runs": normal,
        "warning_runs": warning,
        "critical_runs": critical,
    }


async def get_scrap_distribution(session: AsyncSession, days: int) -> dict:
    """
    Count runs in the time window by effective scrap % (quality_record; missing as 0).
    Buckets: good [0,25], warning (25,50], critical (>50, including >100%).
    """
    run_ids = await fetch_run_ids_in_window(session, days)
    if not run_ids:
        return {
            "good_scrap_runs": 0,
            "warning_scrap_runs": 0,
            "critical_scrap_runs": 0,
        }

    q = select(QualityRecord.production_run_id, QualityRecord.scrap_percentage).where(
        QualityRecord.production_run_id.in_(run_ids)
    )
    result = await session.execute(q)
    scrap_by_run = {row[0]: row[1] for row in result.all()}

    good = warning = critical = 0
    for rid in run_ids:
        raw = scrap_by_run.get(rid)
        p = float(raw) if raw is not None else 0.0
        if p <= 25:
            good += 1
        elif p <= 50:
            warning += 1
        else:
            critical += 1

    return {
        "good_scrap_runs": good,
        "warning_scrap_runs": warning,
        "critical_scrap_runs": critical,
    }
