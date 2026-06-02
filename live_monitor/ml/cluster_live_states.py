"""Cluster 5-min live windows to discover natural machine state groups."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402

OUTPUT_CLUSTERED_CSV = os.path.join(config.ML_OUTPUT_DIR, "ml_live_clustered.csv")
OUTPUT_ELBOW_PLOT = os.path.join(config.ML_OUTPUT_DIR, "live_elbow_plot.png")

# column names in ml_live_windows.csv (see storage.build_live_windows)
CLUSTER_FEATURES = [
    "mean_Val_1",
    "std_Val_1",
    "mean_Val_5",
    "std_Val_5",
    "mean_Val_6",
    "std_Val_6",
    "mean_temperature_mean",
    "mean_temp_spread",
    "slope_Val_1",
    "slope_Val_6",
    "slope_temperature_mean",
    "temperature_direction",
    "valid_fraction",
]


def main() -> None:
    # step 1: load 5-min windows dataset
    df = pd.read_csv(config.LIVE_WINDOWS_CSV)

    # step 2: select clustering features
    # temperature_direction critical for HEATING/COOLING
    cluster_features = CLUSTER_FEATURES

    # step 3: drop rows with null values in selected features
    work_df = df.dropna(subset=cluster_features).copy()

    if work_df.empty:
        print("No rows left after dropping nulls; nothing to cluster.")
        os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
        df.to_csv(OUTPUT_CLUSTERED_CSV, index=False)
        return

    # step 4: scale selected features
    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(work_df[cluster_features])

    # step 5: find optimal K using elbow method (K=2..10)
    k_values = list(range(2, 11))
    inertias: list[float] = []
    for k in k_values:
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        model.fit(x_scaled)
        inertias.append(float(model.inertia_))

    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    plt.figure(figsize=(8, 5))
    plt.plot(k_values, inertias, "bo-")
    plt.xlabel("K")
    plt.ylabel("Inertia")
    plt.title("Elbow method — 5-min live windows")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUTPUT_ELBOW_PLOT, dpi=120)
    plt.close()
    print(f"Saved elbow plot: {OUTPUT_ELBOW_PLOT}")

    # step 6: train final KMeans with K=6
    # 6 states: OFF/HEATING/READY/LOW_PRODUCTION/PRODUCTION/COOLING
    final_model = KMeans(n_clusters=6, random_state=42, n_init=10)
    cluster_ids = final_model.fit_predict(x_scaled)

    # step 7: assign cluster_id to each window
    work_df["cluster_id"] = cluster_ids
    df["cluster_id"] = pd.NA
    df.loc[work_df.index, "cluster_id"] = work_df["cluster_id"].astype(int)

    # step 8: print per-cluster summary statistics
    # temperature_direction distinguishes HEATING/COOLING/OFF
    for cluster_id, group in work_df.groupby("cluster_id", sort=True):
        print(f"Cluster {cluster_id}")
        print(f"  count: {len(group)}")
        print(f"  mean_Val_1 mean: {group['mean_Val_1'].mean():.4f}")
        print(f"  mean_Val_6 mean: {group['mean_Val_6'].mean():.4f}")
        print(f"  temperature_mean mean: {group['mean_temperature_mean'].mean():.4f}")
        print(f"  temperature_direction mean: {group['temperature_direction'].mean():.4f}")
        print(f"  slope_temperature mean: {group['slope_temperature_mean'].mean():.6f}")
        print(f"  valid_fraction mean: {group['valid_fraction'].mean():.4f}")

    # step 9: save clustered output
    df.to_csv(OUTPUT_CLUSTERED_CSV, index=False)
    print(f"Saved clustered states: {OUTPUT_CLUSTERED_CSV}")


if __name__ == "__main__":
    main()
