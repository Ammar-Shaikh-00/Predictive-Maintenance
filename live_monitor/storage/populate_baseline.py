"""Build regime baselines from historical CSVs and POST to backend Postgres."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _LIVE_MONITOR_ROOT.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from storage.backend_client import BackendClient  # noqa: E402

STABLE_RUNS_CSV = config.STABLE_RUNS_CSV
LOW_REGIME_CSV = os.path.join(
    os.path.dirname(config.STABLE_RUNS_CSV),
    "low_regime1.csv",
)


def get_confidence(run_count: int) -> str:
    if run_count >= 50:
        return "HIGH"
    if run_count >= 5:
        return "MEDIUM"
    return "LOW"


def _load_band_policy() -> dict:
    """Optional plant policy JSON — evaluator stays free of feature hardcode."""
    path = getattr(config, "BASELINE_BAND_POLICY_PATH", None)
    if not path or not os.path.isfile(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as exc:
        print(f"Warning: could not read band policy {path}: {exc}")
        return {}


def _row_payload(
    *,
    regime_type: str,
    feature_name: str,
    values: pd.Series,
    run_count: int,
    confidence: str,
    band_policy: dict | None = None,
) -> dict:
    mean_val = float(values.mean())
    std_val = float(values.std()) if len(values) > 1 else 0.0
    p10 = float(np.percentile(values, 10))
    p90 = float(np.percentile(values, 90))
    # Robust scale from central 80% (data-driven floor when sample std is tiny)
    if p90 > p10:
        robust_std = (p90 - p10) / 2.5631
        std_val = max(std_val, robust_std)

    # Default bands from data percentiles (not feature-specific constants)
    warning_low = p10
    warning_high = p90
    critical_low = float(np.percentile(values, 5))
    critical_high = float(np.percentile(values, 95))

    # Optional plant policy overrides (JSON file / Baseline Manager later)
    policy = (band_policy or {}).get(feature_name) or {}
    warn_delta = policy.get("warning_delta")
    crit_delta = policy.get("critical_delta")
    if warn_delta is not None:
        d = float(warn_delta)
        warning_low = mean_val - d
        warning_high = mean_val + d
    if crit_delta is not None:
        d = float(crit_delta)
        critical_low = mean_val - d
        critical_high = mean_val + d

    return {
        "regime_type": regime_type,
        "profile_id": None,
        "feature_name": feature_name,
        "mean_value": mean_val,
        "std_value": std_val,
        "min_value": float(values.min()),
        "max_value": float(values.max()),
        "p10_value": p10,
        "p90_value": p90,
        "warning_low": warning_low,
        "warning_high": warning_high,
        "critical_low": critical_low,
        "critical_high": critical_high,
        "sample_count": int(len(values)),
        "source_run_count": int(run_count),
        "baseline_confidence": confidence,
    }


def build_low_regime_baseline(band_policy: dict | None = None) -> list[dict]:
    if not os.path.isfile(LOW_REGIME_CSV):
        print(f"LOW regime CSV missing: {LOW_REGIME_CSV} — skip")
        return []

    df = pd.read_csv(LOW_REGIME_CSV)
    df = df[(df["speed"] >= 20) & (df["pressure"] >= 50)].copy()
    df["temperature_mean"] = df[["temp1", "temp2", "temp3", "temp4"]].mean(axis=1)
    df["pressure_per_rpm"] = df["pressure"] / df["speed"]
    df["temp_spread"] = abs(
        df[["temp1", "temp2"]].mean(axis=1) - df[["temp3", "temp4"]].mean(axis=1)
    )
    df["load_per_pressure"] = df["load"] / df["pressure"]

    low_feature_map = {
        "screw_speed_mean": "speed",
        "screw_speed_std": "speed",
        "pressure_mean": "pressure",
        "pressure_std": "pressure",
        "load_mean": "load",
        "temperature_mean": "temperature_mean",
        "pressure_per_rpm": "pressure_per_rpm",
        "temp_spread": "temp_spread",
        "load_per_pressure": "load_per_pressure",
    }

    rows: list[dict] = []
    run_count = len(df)
    confidence = "HIGH" if run_count >= 50 else "MEDIUM"
    for feature_name, col in low_feature_map.items():
        values = pd.to_numeric(df[col], errors="coerce").dropna()
        if values.empty:
            continue
        rows.append(
            _row_payload(
                regime_type="LOW",
                feature_name=feature_name,
                values=values,
                run_count=run_count,
                confidence=confidence,
                band_policy=band_policy,
            )
        )
    print(f"LOW regime: {len(rows)} baseline rows built from {run_count} stable rows")
    return rows


def build_stable_run_baselines(band_policy: dict | None = None) -> list[dict]:
    if not os.path.isfile(STABLE_RUNS_CSV):
        print(f"Stable runs CSV missing: {STABLE_RUNS_CSV} — skip")
        return []

    df = pd.read_csv(STABLE_RUNS_CSV)
    front_cols = [
        "mean_Val_7",
        "mean_Val_8",
        "mean_Val_9",
        "mean_Val_10",
        "mean_Val_11",
    ]
    rear_cols = [
        "mean_Val_27",
        "mean_Val_28",
        "mean_Val_29",
        "mean_Val_30",
        "mean_Val_31",
        "mean_Val_32",
    ]
    present_front = [c for c in front_cols if c in df.columns]
    present_rear = [c for c in rear_cols if c in df.columns]
    if present_front and present_rear:
        df["temp_spread_fixed"] = abs(
            df[present_front].mean(axis=1) - df[present_rear].mean(axis=1)
        )

    feature_map = {
        "screw_speed_mean": "mean_Val_1",
        "screw_speed_std": "std_Val_1",
        "pressure_mean": "mean_Val_6",
        "pressure_std": "std_Val_6",
        "load_mean": "mean_Val_5",
        "temperature_mean": "temperature_mean",
        "pressure_per_rpm": "mean_pressure_per_rpm",
        "temp_spread": "temp_spread_fixed",
        "load_per_pressure": "mean_load_per_pressure",
    }

    rows: list[dict] = []
    if "pressure_regime" not in df.columns:
        print("pressure_regime column missing in stable_runs.csv — skip MID/HIGH")
        return rows

    for regime, group in df.groupby("pressure_regime"):
        regime_label = str(regime).upper()
        run_count = len(group)
        confidence = get_confidence(run_count)
        for feature_name, csv_col in feature_map.items():
            if csv_col not in group.columns:
                print(f"Skipping {feature_name}: column {csv_col} not found")
                continue
            values = pd.to_numeric(group[csv_col], errors="coerce").dropna()
            if values.empty:
                continue
            rows.append(
                _row_payload(
                    regime_type=regime_label,
                    feature_name=feature_name,
                    values=values,
                    run_count=run_count,
                    confidence=confidence,
                    band_policy=band_policy,
                )
            )
    return rows


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Populate / refresh baseline_registry")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Insert new rows even if regime+feature already exists (newest id wins)",
    )
    args = parser.parse_args(argv)

    client = BackendClient()
    print(f"Backend: {config.BACKEND_BASE_URL}")
    band_policy = _load_band_policy()
    if band_policy:
        print(
            f"Band policy loaded: {config.BASELINE_BAND_POLICY_PATH} "
            f"({len(band_policy)} features)"
        )
    else:
        print("No band policy file — using percentile bands from historical CSVs")

    existing = client.get_baseline_registry(limit=1000)
    existing_keys = {
        (str(r.get("regime_type")), str(r.get("feature_name")))
        for r in existing
        if isinstance(r, dict)
    }
    print(f"Existing Postgres baseline rows: {len(existing)}")

    baseline_rows = build_stable_run_baselines(band_policy)
    baseline_rows.extend(build_low_regime_baseline(band_policy))

    inserted = 0
    skipped = 0
    failed = 0
    for payload in baseline_rows:
        key = (str(payload["regime_type"]), str(payload["feature_name"]))
        if not args.refresh and key in existing_keys:
            skipped += 1
            continue
        try:
            created = client.create_baseline_registry(payload)
            if created and created.get("id") is not None:
                inserted += 1
                existing_keys.add(key)
                if args.refresh and payload.get("feature_name") == "temperature_mean":
                    print(
                        f"  refreshed {key}: warn=["
                        f"{payload['warning_low']:.3f},{payload['warning_high']:.3f}] "
                        f"crit=["
                        f"{payload['critical_low']:.3f},{payload['critical_high']:.3f}]"
                    )
            else:
                failed += 1
        except Exception as exc:
            failed += 1
            print(f"Failed {key}: {exc}")

    print(
        f"Done | inserted={inserted} skipped_existing={skipped} "
        f"failed={failed} built={len(baseline_rows)}"
    )


if __name__ == "__main__":
    print("Populating baseline registry on backend Postgres...")
    print(f"Project root: {_PROJECT_ROOT}")
    main()
