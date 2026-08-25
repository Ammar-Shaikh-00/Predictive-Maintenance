"""Build 5-minute aggregated windows from machine_sensor_raw for live-scale ML training."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ensure live_monitor root is available when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from storage.backend_history import fetch_raw_sensor_dataframe  # noqa: E402

TEMP_COLS = [
    "Val_7",
    "Val_8",
    "Val_9",
    "Val_10",
    "Val_11",
    "Val_27",
    "Val_28",
    "Val_29",
    "Val_30",
    "Val_31",
    "Val_32",
]

FRONT_TEMP_COLS = ["Val_7", "Val_8", "Val_9", "Val_10", "Val_11"]
REAR_TEMP_COLS = ["Val_27", "Val_28", "Val_29", "Val_30", "Val_31", "Val_32"]

RAW_COLS = [
    "trend_date",
    "Val_1",
    "Val_5",
    "Val_6",
    "Val_7",
    "Val_8",
    "Val_9",
    "Val_10",
    "Val_11",
    "Val_27",
    "Val_28",
    "Val_29",
    "Val_30",
    "Val_31",
    "Val_32",
    "source",
]

# features aggregated with mean/std per 5-min bucket
STAT_COLS = [
    "Val_1",
    "Val_5",
    "Val_6",
    "temperature_mean",
    "temp_spread",
    "pressure_per_rpm",
    "load_per_pressure",
]

SLOPE_COLS = ["Val_1", "Val_6", "temperature_mean"]


def _safe_ratio(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    denom = denominator.replace(0, np.nan)
    return (numerator / denom).fillna(0.0)


def _linear_slope_from_seconds(seconds: np.ndarray, values: np.ndarray) -> float:
    """Linear trend slope vs. time; guards ill-conditioned / duplicate timestamps."""
    if len(seconds) < 2:
        return 0.0
    sec = np.asarray(seconds, dtype=float)
    val = np.asarray(values, dtype=float)
    mask = np.isfinite(sec) & np.isfinite(val)
    if int(mask.sum()) < 2:
        return 0.0
    sec = sec[mask]
    val = val[mask]
    span = float(np.ptp(sec))
    if span == 0.0 or not np.isfinite(span):
        return 0.0
    try:
        return float(np.polyfit(sec, val, 1)[0])
    except np.linalg.LinAlgError:
        return float((val[-1] - val[0]) / span)


def _regime_from_pressure(mean_pressure: float) -> str:
    if pd.isna(mean_pressure):
        return "UNKNOWN"
    if mean_pressure < config.REGIME_LOW_MAX:
        return "LOW"
    if mean_pressure <= config.REGIME_MID_MAX:
        return "MID"
    return "HIGH"


def _temperature_direction(sub: pd.DataFrame) -> float:
    # rising=positive falling=negative
    # more robust than slope for short windows
    temps = pd.to_numeric(sub["temperature_mean"], errors="coerce").dropna()
    if len(temps) < 2:
        return 0.0
    mid = max(len(temps) // 2, 1)
    first_half_mean = float(temps.iloc[:mid].mean())
    second_half_mean = float(temps.iloc[mid:].mean())
    return second_half_mean - first_half_mean


def _aggregate_bucket(sub: pd.DataFrame) -> dict[str, object]:
    # build one aggregated 5-min window row
    row: dict[str, object] = {}

    for col in STAT_COLS:
        s = pd.to_numeric(sub[col], errors="coerce")
        row[f"mean_{col}"] = float(s.mean(skipna=True))
        row[f"std_{col}"] = float(s.std(skipna=True))

    # slope over 5 min = reliable trend signal
    if len(sub) < 2:
        for col in SLOPE_COLS:
            row[f"slope_{col}"] = 0.0
    else:
        seconds = (sub["trend_date"] - sub["trend_date"].iloc[0]).dt.total_seconds().astype(float).to_numpy()
        for col in SLOPE_COLS:
            values = pd.to_numeric(sub[col], errors="coerce").fillna(0.0).to_numpy()
            row[f"slope_{col}"] = _linear_slope_from_seconds(seconds, values)

    row["temperature_direction"] = _temperature_direction(sub)
    row["row_count"] = int(len(sub))
    row["valid_fraction"] = float((sub["Val_1"].fillna(0) > 0).sum() / max(len(sub), 1))

    if (sub["source"] == "live_api").any():
        row["source"] = "live"
    else:
        row["source"] = "historical"

    row["window_start"] = sub["trend_date"].iloc[0]
    row["window_end"] = sub["trend_date"].iloc[-1]
    return row


def _print_empty_summary(output_path: str) -> None:
    print("total windows: 0")
    print("regime counts: {}")
    print("source counts: {}")
    print("date range: N/A")
    print("temperature_direction: mean=nan std=nan min=nan max=nan")
    print(f"saved: {output_path}")


def main() -> pd.DataFrame:
    output_path = config.LIVE_WINDOWS_CSV

    # step 1: load raw history from backend Postgres (not SQLite)
    df = fetch_raw_sensor_dataframe()
    missing = [c for c in RAW_COLS if c not in df.columns]
    for col in missing:
        df[col] = pd.NA
    if not df.empty:
        df = df[RAW_COLS].copy()

    if df.empty:
        os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
        pd.DataFrame().to_csv(output_path, index=False)
        _print_empty_summary(output_path)
        return pd.DataFrame()

    df["trend_date"] = pd.to_datetime(df["trend_date"], errors="coerce")
    df = df.dropna(subset=["trend_date"]).sort_values("trend_date", ascending=True)

    # step 2: per-row derived features
    df["temperature_mean"] = df[TEMP_COLS].mean(axis=1, skipna=True)
    front_mean = df[FRONT_TEMP_COLS].mean(axis=1, skipna=True)
    rear_mean = df[REAR_TEMP_COLS].mean(axis=1, skipna=True)
    df["temp_spread"] = (front_mean - rear_mean).abs()
    # front/rear split matches live feature engine
    df["pressure_per_rpm"] = _safe_ratio(df["Val_6"], df["Val_1"])
    df["load_per_pressure"] = _safe_ratio(df["Val_5"], df["Val_6"])
    df["load_per_rpm"] = _safe_ratio(df["Val_5"], df["Val_1"])

    # step 3: group into 5-min buckets
    # 5-min buckets match live window scale
    grouped = df.groupby(
        pd.Grouper(key="trend_date", freq=f"{config.LIVE_WINDOW_MINUTES}min"),
        dropna=True,
    )

    # step 4: aggregate each bucket
    windows: list[dict[str, object]] = []
    for _, sub in grouped:
        if sub.empty:
            continue
        windows.append(_aggregate_bucket(sub))

    out_df = pd.DataFrame(windows)

    if out_df.empty:
        os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
        out_df.to_csv(output_path, index=False)
        _print_empty_summary(output_path)
        return out_df

    # step 5: keep buckets with minimum row count
    # minimum 3 rows for reliable features
    out_df = out_df[out_df["row_count"] >= config.LIVE_WINDOW_MIN_ROWS].copy()

    # step 6: label regime from mean pressure
    out_df["regime"] = out_df["mean_Val_6"].apply(_regime_from_pressure)

    # step 7: save output CSV
    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    out_df.to_csv(output_path, index=False)

    # step 8: print summary
    # verify direction signal is meaningful
    total_windows = len(out_df)
    regime_counts = out_df["regime"].value_counts(dropna=False).to_dict()
    source_counts = out_df["source"].value_counts(dropna=False).to_dict()
    if out_df["window_start"].notna().any():
        date_range = f"{out_df['window_start'].min()} -> {out_df['window_end'].max()}"
    else:
        date_range = "N/A"

    td = out_df["temperature_direction"].dropna()
    if len(td) > 0:
        td_stats = (
            f"mean={float(td.mean()):.6f} std={float(td.std()):.6f} "
            f"min={float(td.min()):.6f} max={float(td.max()):.6f}"
        )
    else:
        td_stats = "mean=nan std=nan min=nan max=nan"

    print(f"total windows: {total_windows}")
    print(f"regime counts: {regime_counts}")
    print(f"source counts: {source_counts}")
    print(f"date range: {date_range}")
    print(f"temperature_direction: {td_stats}")
    print(f"saved: {output_path}")

    return out_df


if __name__ == "__main__":
    main()
