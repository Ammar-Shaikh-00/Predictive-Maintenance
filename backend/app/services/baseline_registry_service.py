"""Baseline registry alignment helpers for live_monitor HIGH/MID/LOW regimes."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.baseline_registry import BaselineRegistry

REQUIRED_REGIMES = ("HIGH", "MID", "LOW")
# Features live_monitor FeatureEvaluator expects
CORE_FEATURES = (
    "screw_speed_mean",
    "pressure_mean",
    "temperature_mean",
    "load_mean",
    "pressure_per_rpm",
    "temp_spread",
    "load_per_pressure",
)


async def baseline_registry_summary(session: AsyncSession) -> Dict[str, Any]:
    rows = list(
        (
            await session.execute(
                select(
                    BaselineRegistry.regime_type,
                    func.count(),
                ).group_by(BaselineRegistry.regime_type)
            )
        ).all()
    )
    by_regime = {str(r[0] or "").upper(): int(r[1]) for r in rows}
    features = list(
        (
            await session.execute(
                select(BaselineRegistry.feature_name)
                .distinct()
                .order_by(BaselineRegistry.feature_name)
            )
        )
        .scalars()
        .all()
    )
    missing_regimes = [r for r in REQUIRED_REGIMES if by_regime.get(r, 0) <= 0]
    core_present = [f for f in CORE_FEATURES if f in set(features)]
    missing_features = [f for f in CORE_FEATURES if f not in set(features)]
    ready = not missing_regimes and len(core_present) >= 4
    return {
        "regimes": {k: by_regime.get(k, 0) for k in REQUIRED_REGIMES},
        "other_regimes": {
            k: v for k, v in by_regime.items() if k not in REQUIRED_REGIMES
        },
        "total_rows": sum(by_regime.values()),
        "features": features,
        "core_features_present": core_present,
        "missing_regimes": missing_regimes,
        "missing_core_features": missing_features,
        "ready_for_live_monitor": ready,
        "hint": (
            "HIGH/MID/LOW baselines present"
            if ready
            else "Run POST /baseline-registry/ensure-regimes or Ammar populate_baseline.py"
        ),
    }


async def ensure_regime_baselines(
    session: AsyncSession,
    *,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Ensure HIGH/MID/LOW exist for core features.

    Does NOT invent production-quality statistics. Only inserts structural
    UNVALIDATED_SEED rows when a regime×feature pair is missing, so live_monitor
    can evaluate without NOT_APPLICABLE until Ammar overwrites via POST.
    """
    existing = list(
        (
            await session.execute(
                select(BaselineRegistry.regime_type, BaselineRegistry.feature_name)
            )
        ).all()
    )
    have = {(str(r).upper(), str(f)) for r, f in existing}
    created = 0
    # Conservative mid-extrusion placeholders — confidence marked unvalidated
    seeds = {
        "screw_speed_mean": (45.0, 5.0),
        "pressure_mean": (300.0, 20.0),
        "temperature_mean": (200.0, 8.0),
        "load_mean": (40.0, 6.0),
        "pressure_per_rpm": (6.5, 1.0),
        "temp_spread": (15.0, 3.0),
        "load_per_pressure": (0.15, 0.05),
    }
    for regime in REQUIRED_REGIMES:
        for feature, (mean, std) in seeds.items():
            key = (regime, feature)
            if key in have and not force:
                continue
            if key in have and force:
                # skip overwrite of real Ammar data unless explicitly forcing new seeds
                # only add missing
                continue
            if key in have:
                continue
            low = mean - 3 * std
            high = mean + 3 * std
            row = BaselineRegistry(
                regime_type=regime,
                profile_id=None,
                feature_name=feature,
                mean_value=mean,
                std_value=std,
                min_value=low,
                max_value=high,
                p10_value=mean - 1.28 * std,
                p90_value=mean + 1.28 * std,
                warning_low=mean - 2 * std,
                warning_high=mean + 2 * std,
                critical_low=mean - 3 * std,
                critical_high=mean + 3 * std,
                sample_count=0,
                source_run_count=0,
                baseline_confidence="UNVALIDATED_SEED",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(row)
            created += 1
            have.add(key)
    if created:
        await session.commit()
    summary = await baseline_registry_summary(session)
    return {"created": created, "forced": force, **summary}
