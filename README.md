# Predictive Maintenance — Extruder Live Monitor

Industrial **predictive maintenance** platform for plastic extrusion lines. The system polls live machine sensors, detects operational states with machine learning, scores anomalies per state, and compares live behavior against historical baselines.

Repository: [github.com/Ammar-Shaikh-00/Predictive-Maintenance](https://github.com/Ammar-Shaikh-00/Predictive-Maintenance)

---

## Overview

This project monitors an extruder in near real time and answers three questions:

1. **What state is the machine in?** (OFF, HEATING, COOLING, READY, PRODUCTION, LOW_PRODUCTION)
2. **Is current behavior anomalous for that state?** (per-state Isolation Forest models)
3. **How does live behavior compare to historical baselines?** (z-score evaluation and drift detection)

Live sensor values are polled from the extruder dashboard API, aggregated into a rolling 5-minute window, and transformed into process features. A RandomForest classifier assigns the machine state; Isolation Forest models score anomalies within that state. Baseline comparison evaluates feature drift against historical registry baselines. Results are written to the backend Postgres database through HTTP APIs. Trained model artifacts remain local under `live_monitor/ml_data/`. A local FastAPI service on port **8001** exposes pipeline health and debug endpoints.

---

## Architecture

```
Live API
        │
        ▼
  api_client.fetch_latest()
        │
        ▼
  window_buffer (5-min rolling window)
        │
        ▼
  feature_engine (speed, pressure, load, temp, temp_spread, temperature_direction)
        │
        ├──► state_detector (RandomForest — 6 states)
        │
        ├──► anomaly_scorer (per-state Isolation Forest)
        │
        ├──► evaluation_guard / baseline_selector / feature_evaluator
        │
        └──► backend_writer → backend APIs → Postgres
```

**ML training pipeline** (offline, 5-minute windows):

```
machine_sensor_raw → build_live_windows → cluster_live_states
  → map_live_cluster_states → train_state_classifier → train_anomaly_*.py
```

---

## System Components

| Path | Role |
|------|------|
| `live_monitor/` | Live polling pipeline, feature engine, ML inference, evaluation, backend persistence |
| `live_monitor/ml/` | Offline training scripts, anomaly scorers, retrain orchestration |
| `live_monitor/ml_data/` | Trained models (`.pkl`), labeled datasets, clustering diagnostics |
| `backend/` | FastAPI application and Postgres domain APIs (machines, live windows, evaluations, baselines) |
| `frontend/` | Web UI for operations, dashboards, and maintenance workflows |
| `alertService/` | Alert delivery and notification services |
| `machineStateService/` | Machine-state related service layer |
| `historical_simulator/` | Historical data tooling |
| `scripts/` | Utility scripts for data-source maintenance |
| `timeSeriesDB/` | Historical extruder data and segmentation outputs |
| `Docs/` | Architecture notes, briefs, and project documentation |

---

## Machine States

| State | Description |
|-------|-------------|
| OFF | Machine idle / powered down |
| HEATING | Temperature rising (`temperature_direction > 0`) |
| COOLING | Temperature falling |
| READY | Transitional / pre-production |
| PRODUCTION | Normal production run |
| LOW_PRODUCTION | Reduced throughput |

State transitions are confirmed only after **three consecutive matching windows**, which reduces flicker from short-lived fluctuations.

---

## Feature Engineering

Features shared by the state classifier and anomaly models include:

- Screw speed, pressure, and load (mean, standard deviation, slope)
- Temperature mean and **temp_spread** (front zones Val_7–11 vs rear Val_27–32)
- **temperature_direction** (second-half window mean minus first-half mean)
- `valid_fraction` as a data-quality gate for incomplete windows

Window duration is aligned between live inference and offline training at **5 minutes**.

---

## Machine Learning

| Model | Purpose |
|-------|---------|
| RandomForest state classifier | Maps window features to one of six operational states |
| Per-state Isolation Forest | Scores how unusual the current window is for the active state |

Anomaly outputs (score and flag) are attached to live run evaluations and persisted with other evaluation fields. Baseline selection uses the backend baseline registry so live behavior can be compared against historical HIGH / LOW / NORMAL profiles.

---

## License

Proprietary — Standard project. Contact the repository owner for usage terms.
