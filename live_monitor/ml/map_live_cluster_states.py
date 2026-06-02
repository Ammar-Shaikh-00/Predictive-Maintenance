"""Map live-scale cluster IDs to machine state labels using cluster statistics."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402

INPUT_CLUSTERED_CSV = os.path.join(config.ML_OUTPUT_DIR, "ml_live_clustered.csv")
OUTPUT_LABELED_CSV = os.path.join(config.ML_OUTPUT_DIR, "ml_live_labeled.csv")


def _pick_production(summary: pd.DataFrame, used: set[int]) -> int:
    candidates = summary[~summary["cluster_id"].isin(used)].copy()
    best_idx = (candidates["speed_rank"] + candidates["pressure_rank"]).idxmin()
    return int(candidates.loc[best_idx, "cluster_id"])


def _pick_low_production(summary: pd.DataFrame, used: set[int]) -> int:
    candidates = summary[~summary["cluster_id"].isin(used)].copy()
    candidates["prod_score"] = candidates["speed_rank"] + candidates["pressure_rank"]
    candidates = candidates.sort_values(["prod_score", "speed_rank", "pressure_rank"])
    return int(candidates.iloc[0]["cluster_id"])


def _pick_heating(summary: pd.DataFrame, used: set[int]) -> int:
    # highest temp_direction_rank (temperature actively rising)
    candidates = summary[~summary["cluster_id"].isin(used)].copy()
    row = candidates.loc[candidates["temp_direction_rank"].idxmax()]
    return int(row["cluster_id"])


def _pick_cooling(summary: pd.DataFrame, used: set[int]) -> int:
    # lowest temp_direction_rank (temperature actively falling)
    candidates = summary[~summary["cluster_id"].isin(used)].copy()
    row = candidates.loc[candidates["temp_direction_rank"].idxmin()]
    return int(row["cluster_id"])


def _pick_ready(summary: pd.DataFrame, used: set[int]) -> int | None:
    # positive temp_direction_rank AND moderate speed
    candidates = summary[~summary["cluster_id"].isin(used)].copy()
    positive = candidates[candidates["temperature_direction"] > 0]
    if positive.empty:
        return None
    median_speed_rank = float(positive["speed_rank"].median())
    positive = positive.copy()
    positive["ready_score"] = (positive["speed_rank"] - median_speed_rank).abs()
    positive = positive.sort_values(["ready_score", "temp_direction_rank"], ascending=[True, False])
    return int(positive.iloc[0]["cluster_id"])


def _pick_off(summary: pd.DataFrame, used: set[int]) -> int:
    candidates = summary[~summary["cluster_id"].isin(used)].copy()
    candidates["off_score"] = candidates["valid_rank"] + candidates["speed_low_rank"]
    row = candidates.sort_values(["off_score", "valid_rank", "speed_low_rank"]).iloc[0]
    return int(row["cluster_id"])


def main() -> None:
    # step 1: load clustered live windows
    df = pd.read_csv(INPUT_CLUSTERED_CSV)

    # step 2: compute per-cluster summary statistics
    summary = (
        df.groupby("cluster_id", dropna=False)
        .agg(
            mean_Val_1=("mean_Val_1", "mean"),
            mean_Val_6=("mean_Val_6", "mean"),
            mean_Val_5=("mean_Val_5", "mean"),
            temperature_mean=("mean_temperature_mean", "mean"),
            temperature_direction=("temperature_direction", "mean"),
            slope_temperature=("slope_temperature_mean", "mean"),
            valid_fraction=("valid_fraction", "mean"),
        )
        .reset_index()
    )
    summary["cluster_id"] = summary["cluster_id"].astype(int)

    # step 3: rank clusters by behavior signals
    # data decides boundaries not hardcoded thresholds
    summary["speed_rank"] = summary["mean_Val_1"].rank(ascending=False, method="dense")
    summary["pressure_rank"] = summary["mean_Val_6"].rank(ascending=False, method="dense")
    summary["load_rank"] = summary["mean_Val_5"].rank(ascending=False, method="dense")
    # higher direction → higher rank (HEATING = max rank, COOLING = min rank)
    summary["temp_direction_rank"] = summary["temperature_direction"].rank(
        ascending=True, method="dense"
    )
    summary["valid_rank"] = summary["valid_fraction"].rank(ascending=True, method="dense")
    summary["speed_low_rank"] = summary["mean_Val_1"].rank(ascending=True, method="dense")

    # step 4: map clusters to states using rank-based rules
    # temperature_direction drives HEATING/COOLING detection
    cluster_to_state: dict[int, str] = {}
    used: set[int] = set()

    prod_cluster = _pick_production(summary, used)
    cluster_to_state[prod_cluster] = "PRODUCTION"
    used.add(prod_cluster)

    low_prod_cluster = _pick_low_production(summary, used)
    cluster_to_state[low_prod_cluster] = "LOW_PRODUCTION"
    used.add(low_prod_cluster)

    heating_cluster = _pick_heating(summary, used)
    cluster_to_state[heating_cluster] = "HEATING"
    used.add(heating_cluster)

    cooling_cluster = _pick_cooling(summary, used)
    cluster_to_state[cooling_cluster] = "COOLING"
    used.add(cooling_cluster)

    ready_cluster = _pick_ready(summary, used)
    if ready_cluster is not None:
        cluster_to_state[ready_cluster] = "READY"
        used.add(ready_cluster)

    off_cluster = _pick_off(summary, used)
    cluster_to_state[off_cluster] = "OFF"
    used.add(off_cluster)

    for cluster_id in summary["cluster_id"]:
        cid = int(cluster_id)
        if cid in cluster_to_state:
            continue
        row = summary.loc[summary["cluster_id"] == cid].iloc[0]
        if float(row["temperature_direction"]) > 0:
            cluster_to_state[cid] = "READY"
        elif float(row["temperature_direction"]) < 0:
            cluster_to_state[cid] = "COOLING"
        else:
            cluster_to_state[cid] = "OFF"

    # step 5: attach predicted state to each window row
    df["predicted_state"] = df["cluster_id"].astype("Int64").map(cluster_to_state)

    # step 6: print mapping table for review
    # verify HEATING has positive direction
    # verify COOLING has negative direction
    print("cluster | state | speed | pressure | temp | temp_direction")
    for _, row in summary.sort_values("cluster_id").iterrows():
        cid = int(row["cluster_id"])
        state = cluster_to_state.get(cid, "UNKNOWN")
        print(
            f"{cid} | {state} | {row['mean_Val_1']:.4f} | {row['mean_Val_6']:.4f} | "
            f"{row['temperature_mean']:.4f} | {row['temperature_direction']:.4f}"
        )

    # step 7: print predicted state distribution
    print("\nstate distribution:")
    print(df["predicted_state"].value_counts(dropna=False).to_string())

    # step 8: save labeled output
    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    df.to_csv(OUTPUT_LABELED_CSV, index=False)
    print(f"\nsaved: {OUTPUT_LABELED_CSV}")


if __name__ == "__main__":
    main()
