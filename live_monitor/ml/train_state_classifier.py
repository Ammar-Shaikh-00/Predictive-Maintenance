import os
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler

# ensure live_monitor root is importable when run as script
_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402

# temperature_direction fixes HEATING/OFF confusion
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


def _align_live_feature_names(df: pd.DataFrame) -> pd.DataFrame:
    """Map ml_live_labeled column names to FEATURE_COLUMNS names."""
    if "temperature_mean" not in df.columns and "mean_temperature_mean" in df.columns:
        df["temperature_mean"] = df["mean_temperature_mean"]
    if "temp_spread_mean" not in df.columns and "mean_temp_spread" in df.columns:
        df["temp_spread_mean"] = df["mean_temp_spread"]
    if "slope_temperature" not in df.columns and "slope_temperature_mean" in df.columns:
        df["slope_temperature"] = df["slope_temperature_mean"]
    return df


def main() -> None:
    # step 1: load labeled states and remove unlabeled rows
    # now uses 5-min windows matching live pipeline scale
    input_path = config.LIVE_LABELED_CSV
    model_path = os.path.join(config.ML_OUTPUT_DIR, "state_classifier.pkl")
    scaler_path = os.path.join(config.ML_OUTPUT_DIR, "state_classifier_scaler.pkl")
    df = pd.read_csv(input_path)
    df = df.dropna(subset=["predicted_state"]).copy()
    df = _align_live_feature_names(df)

    # step 2: define feature columns for training
    feature_cols = FEATURE_COLUMNS

    # step 3: drop rows with nulls in selected features
    df = df.dropna(subset=feature_cols).copy()

    # step 4: split chronologically to avoid leakage
    # time split prevents data leakage
    df["window_start"] = pd.to_datetime(df["window_start"], errors="coerce")
    df = df.dropna(subset=["window_start"]).sort_values("window_start", ascending=True).copy()
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    x_train = train_df[feature_cols]
    y_train = train_df["predicted_state"]
    x_test = test_df[feature_cols]
    y_test = test_df["predicted_state"]

    # step 5: scale features using train-only fit
    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    x_test_scaled = scaler.transform(x_test)
    joblib.dump(scaler, scaler_path)

    # step 6: train random forest with class balancing
    # balanced handles unequal state distribution
    model = RandomForestClassifier(
        class_weight="balanced",
        n_estimators=100,
        random_state=42,
    )
    model.fit(x_train_scaled, y_train)

    # step 7: evaluate on held-out test set
    y_pred = model.predict(x_test_scaled)
    print("classification_report:")
    print(classification_report(y_test, y_pred))
    print("confusion_matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("accuracy:")
    print(accuracy_score(y_test, y_pred))

    # step 8: print top 10 feature importances
    importances = pd.Series(model.feature_importances_, index=feature_cols).sort_values(ascending=False)
    print("top_10_feature_importances:")
    print(importances.head(10).to_string())

    # step 9: save trained classifier model
    joblib.dump(model, model_path)
    print(f"saved model: {model_path}")
    print(f"saved scaler: {scaler_path}")


if __name__ == "__main__":
    main()
