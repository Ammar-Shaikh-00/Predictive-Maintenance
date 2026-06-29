# Prediction Maintenance — Extruder Live Monitor

Industrial **predictive maintenance** platform for plastic extrusion lines. The system polls live machine sensors, detects operational states with machine learning, scores anomalies per state, and compares live behavior against historical baselines.

Repository: [github.com/Ammar-Shaikh-00/Prediction-Maintenance](https://github.com/Ammar-Shaikh-00/Prediction-Maintenance)

---

## Overview

This project monitors an extruder in near real time and answers three questions:

1. **What state is the machine in?** (OFF, HEATING, COOLING, READY, PRODUCTION, LOW_PRODUCTION)
2. **Is current behavior anomalous for that state?** (per-state Isolation Forest models)
3. **How does live behavior compare to historical baselines?** (z-score evaluation and drift detection)

Data flows from a live API (or CSV simulation replay) through a rolling window buffer, feature engine, ML classifiers, and SQLite storage. Results are exposed via a local FastAPI service on port **8001**.

---

## Architecture

```
Live API / Simulation
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
        └──► db_writer → live_monitor.db
```

**ML training pipeline** (offline, 5-minute windows):

```
machine_sensor_raw → build_live_windows → cluster_live_states
  → map_live_cluster_states → train_state_classifier → train_anomaly_*.py
```

---

## Repository Layout

| Path | Description |
|------|-------------|
| `live_monitor/` | **Main pipeline** — polling loop, ML inference, FastAPI, SQLite |
| `live_monitor/ml/` | Training scripts, anomaly scorer, retrain scheduler |
| `live_monitor/ml_data/` | Trained models (`.pkl`), labeled CSVs, elbow plots |
| `scripts/` | Data fixes and simulation verification |
| `timeSeriesDB/` | Historical extruder data and segmentation outputs |
| `Dev-AI-PM/` | Full-stack PM application (backend API + frontend) |
| `Docs/` | Architecture docs, handoff notes, SUNPOR roadmap |
| `live_monitor.db` | SQLite database (raw sensor rows + process windows) |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Network access to the extruder API (or enable simulation mode)

### Install dependencies

```powershell
cd "path\to\Prediction-Maintenance"
pip install -r live_monitor/requirements.txt
```

### Run live pipeline

```powershell
$env:PYTHONPATH='.;live_monitor'
python -u live_monitor/main.py
```

- Local API docs: [http://localhost:8001/docs](http://localhost:8001/docs)
- Live extruder API (default): `http://100.119.197.81:8002/dashboard/extruder-latest-values`

### Simulation mode

In `live_monitor/config.py`, set `SIMULATION_MODE = True` to replay historical CSV data instead of calling the live API.

### Docker

```powershell
docker compose up --build
```

---

## ML Retraining

Full end-to-end retrain (5-minute live-scale windows):

```powershell
$env:PYTHONPATH='.;live_monitor'
$env:PYTHONUTF8='1'
echo yes | python live_monitor/ml/manual_retrain.py
```

**Restart the pipeline after retrain** — models are loaded at startup.

Individual steps: `build_live_windows.py` → `cluster_live_states.py` → `map_live_cluster_states.py` → `train_state_classifier.py` → `train_anomaly_*.py`

---

## Key Configuration

| Setting | Default | Purpose |
|---------|---------|---------|
| `SIMULATION_MODE` | `False` | CSV replay vs live API |
| `POLL_INTERVAL_SECONDS` | `10` | API poll frequency |
| `WINDOW_DURATION_SECONDS` | `300` | 5-minute live buffer (aligned with training) |
| `LIVE_WINDOW_MINUTES` | `5` | ML training window size |
| `RETRAIN_MIN_NEW_ROWS` | `500` | Auto-retrain threshold |

See `live_monitor/config.py` for all settings.

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

State confirmation requires **3 consecutive matching windows** before a transition is accepted.

---

## Feature Engineering

Critical features shared across classifier and anomaly models:

- Screw speed, pressure, load (mean, std, slope)
- Temperature mean, **temp_spread** (front zones Val_7–11 vs rear Val_27–32)
- **temperature_direction** (second-half mean − first-half mean in window)
- `valid_fraction` — data quality gate

---

## Verification

```powershell
$env:PYTHONPATH='.;live_monitor'
python scripts/verify_simulation_states.py
```

Checks HEATING, COOLING, and PRODUCTION state detection + anomaly scoring on historical CSV segments.

---

## Documentation

- `live_monitor/README.md` — detailed pipeline module reference
- `Docs/CURSOR_CHAT_HANDOFF.md` — development handoff and known issues
- `Docs/SUNPOR_ARCHITECTURE.md` — broader SUNPOR system architecture

---

## License

Proprietary — Standard project. Contact repository owner for usage terms.
