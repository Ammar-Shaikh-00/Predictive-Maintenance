"""Train Isolation Forest on stable PRODUCTION windows only for process anomaly detection."""

import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402

# matches state classifier features exactly
FEATURE_COLUMNS = [
    "mean_Val_1",
    "std_Val_1",
    "mean_Val_5",
    "std_Val_5",
    "mean_Val_6",
    "std_Val_6",
    "temperature_mean",
    "temp_spread_mean",
    "slope_Val_1",
    "slope_Val_6",
    "slope_temperature",
    "temperature_direction",
    "valid_fraction",
]


def _align_feature_columns(df: pd.DataFrame) -> pd.DataFrame:
    # align CSV column names with training feature names
    out = df.copy()
    if "temperature_mean" not in out.columns and "mean_temperature_mean" in out.columns:
        out["temperature_mean"] = out["mean_temperature_mean"]
    if "temp_spread_mean" not in out.columns and "mean_temp_spread" in out.columns:
        out["temp_spread_mean"] = out["mean_temp_spread"]
    if "slope_temperature" not in out.columns and "slope_temperature_mean" in out.columns:
        out["slope_temperature"] = out["slope_temperature_mean"]
    return out


def main() -> None:
    # step 1: load labeled windows from clustering pipeline
    # retrain on 5-min windows matching live scale
    input_path = config.LIVE_LABELED_CSV
    model_path = os.path.join(config.ML_OUTPUT_DIR, "anomaly_PRODUCTION.pkl")
    scaler_path = os.path.join(config.ML_OUTPUT_DIR, "anomaly_PRODUCTION_scaler.pkl")

    df = pd.read_csv(input_path)
    df = _align_feature_columns(df)

    # step 2: keep only stable PRODUCTION rows for training
    # train only on confirmed healthy PRODUCTION windows
    train_mask = df["predicted_state"] == "PRODUCTION"
    if "is_stable" in df.columns:
        train_mask = train_mask & (df["is_stable"] == True)  # noqa: E712
    train_df = df.loc[train_mask].copy()

    # step 3: feature columns used for normal PRODUCTION profile
    feature_cols = FEATURE_COLUMNS

    # step 4: drop rows with missing features
    train_df = train_df.dropna(subset=feature_cols)
    if len(train_df) == 0:
        raise RuntimeError(
            "No training rows after filtering for stable PRODUCTION with complete features."
        )

    x_train = train_df[feature_cols]

    # step 5: training data summary — verify training data looks correct
    print(f"training row count: {len(train_df)}")
    print("feature means:")
    for col in feature_cols:
        print(f"  {col}: {float(train_df[col].mean()):.6f}")

    # step 6: scale features (fit on training data only)
    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    joblib.dump(scaler, scaler_path)

    # step 7: train isolation forest — learns normal PRODUCTION behavior from data
    model = IsolationForest(
        contamination=config.ANOMALY_IF_CONTAMINATION,
        random_state=config.ANOMALY_IF_RANDOM_STATE,
        n_estimators=config.ANOMALY_IF_N_ESTIMATORS,
    )
    model.fit(x_train_scaled)

    # step 8: validate on training data — healthy model should flag < 15% of training data
    y_pred = model.predict(x_train_scaled)
    n_total = len(y_pred)
    n_anomaly = int((y_pred == -1).sum())
    pct = 100.0 * n_anomaly / max(n_total, 1)
    print(f"training validation: total_rows={n_total}, flagged_anomaly={n_anomaly}, pct_flagged={pct:.2f}%")

    # step 9: persist trained model
    joblib.dump(model, model_path)
    print(f"saved model: {model_path}")
    print(f"saved scaler: {scaler_path}")


if __name__ == "__main__":
    main()
