"""Train Isolation Forest on HEATING-state windows; temperature rise is the key signal."""

import os
import sys
from pathlib import Path

import joblib
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
    # map CSV column to training name used in feature list
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
    input_path = os.path.join(os.path.dirname(config.LIVE_WINDOWS_CSV), "ml_live_labeled.csv")
    model_path = os.path.join(config.ML_OUTPUT_DIR, "anomaly_HEATING.pkl")
    scaler_path = os.path.join(config.ML_OUTPUT_DIR, "anomaly_HEATING_scaler.pkl")

    df = pd.read_csv(input_path)
    df = _align_feature_columns(df)

    # step 2: keep only HEATING rows — learn typical warm-up dynamics
    # 38 windows — borderline but usable
    # model improves as live HEATING data accumulates
    train_mask = df["predicted_state"] == "HEATING"
    train_df = df.loc[train_mask].copy()

    # step 3: heating-focused features — matches state classifier feature set
    feature_cols = FEATURE_COLUMNS

    # step 4: drop rows with missing features
    train_df = train_df.dropna(subset=feature_cols)
    if len(train_df) == 0:
        raise RuntimeError("No training rows after filtering for HEATING with complete features.")

    x_train = train_df[feature_cols]

    # step 5: training summary — verify temperature trend behavior
    # verify temperature is consistently rising
    st = train_df["slope_temperature"]
    print(f"training row count: {len(train_df)}")
    print(f"slope_temperature mean: {float(st.mean()):.6f}")
    print(f"slope_temperature std: {float(st.std(ddof=1)):.6f}" if len(st) > 1 else "slope_temperature std: n/a (single row)")

    # step 6: scale features (fit on training data only) and persist scaler
    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    joblib.dump(scaler, scaler_path)

    # step 7: train isolation forest — hyperparameters from config
    model = IsolationForest(
        contamination=config.ANOMALY_IF_CONTAMINATION,
        random_state=config.ANOMALY_IF_RANDOM_STATE,
        n_estimators=config.ANOMALY_IF_N_ESTIMATORS,
    )
    model.fit(x_train_scaled)

    # step 8: validate on training data (in-sample anomaly rate)
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
