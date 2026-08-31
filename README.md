# Predictive Maintenance — Extruder Live Monitor

Industrial **predictive maintenance** for a plastic extruder. The live pipeline polls machine sensors, classifies operating state, scores anomalies for that state, and compares live features to historical baselines.

Results are stored in **PostgreSQL through the backend HTTP APIs**. Live-monitor does not write SQLite as the source of truth.

Repository: [github.com/Ammar-Shaikh-00/Predictive-Maintenance](https://github.com/Ammar-Shaikh-00/Predictive-Maintenance)

---

## What it answers

1. **What state is the machine in?** `OFF`, `HEATING`, `READY`, `LOW_PRODUCTION`, `PRODUCTION`, `COOLING`
2. **Is this window unusual for that state?** per-state Isolation Forest
3. **How does live behavior compare to history?** baseline registry, z-scores, drift

It does **not** invent Accuracy % or remaining useful life. `/health` `prediction_readiness` is **serving health** (models loaded vs expected), not model accuracy.

---

## Architecture

```
Plant latest-values API
        │
        ▼
  live_monitor (port 8001)
        │  poll → 5-min window → features
        │
        ├── state classifier (RandomForest, 6 states)
        ├── per-state Isolation Forest
        ├── baseline / drift evaluation
        │
        ▼
  backend FastAPI  →  PostgreSQL
        │
        ▼
  frontend (operations, dashboards)
```

**Offline training (PC only):**

```
GET /machine-raw-data  →  build_live_windows  →  cluster_live_states
  →  map_live_cluster_states  →  train_state_classifier  →  train_anomaly_*.py
```

Copy new `.pkl` files into `live_monitor/ml_data/`, then `POST /ml/reload-models`.  
`POST /ml/trigger-retrain` returns **403** — Docker live-monitor is inference-only.

---

## Repository layout

| Path | Role |
|------|------|
| `live_monitor/` | Live poll loop, features, ML inference, evaluation, backend writes |
| `live_monitor/ml/` | Offline train / cluster / retrain scripts |
| `live_monitor/ml_data/` | Trained `.pkl` models and labeled window CSVs |
| `live_monitor/run_retrain.py` | PC-only retrain entry (not started by `main.py`) |
| `backend/` | FastAPI + Postgres domain APIs |
| `frontend/` | Operations Center and dashboards |
| `Docs/capability_component_catalog.json` | Capability scorecard formulas (ML-owned; backend executes) |
| `Docs/` | Architecture and capability spec |
| `timeSeriesDB/` | Historical segmentation outputs used for baseline tooling |

---

## Live pipeline (`live_monitor/`)

Default poll interval is **10 seconds**. A window is **5 minutes**, aligned with training.

Each cycle:

1. Fetch latest sensors (`API_URL`)
2. Append to rolling buffer
3. Compute features (speed, pressure, load, zone temperatures, `temp_spread`, `temperature_direction`, `valid_fraction`)
4. Candidate + confirmed state (confirm after **3** matching windows)
5. Write window to backend Postgres
6. Guard → baseline → per-feature eval → overall run eval (anomaly + drift)
7. Expose latest snapshot on port **8001**

**Sensors used:** `Val_1` (screw speed), `Val_5` (load), `Val_6` (pressure), `Val_7`–`Val_11` and `Val_27`–`Val_32` (temperature zones).

Default extruder: `machine_id=6f37c433-44e9-4a66-b019-cc342a95cc54`, `line_id=29`.

### Persistence

Live windows, run evaluations, feature evaluations, and baseline registry go to backend Postgres via `BACKEND_BASE_URL` (local default is often `http://127.0.0.1:8002`; plant LAN often `http://192.168.100.24:8002`).

### Retrain vs serve

| Where | What |
|-------|------|
| PC | `python live_monitor/run_retrain.py` |
| Live-monitor / Docker | Load `.pkl` only; `POST /ml/reload-models` after copy |
| Health | `retrain_mode: external_pc_only`, `scheduler_status: disabled` |

---

## Machine states

| State | Meaning |
|-------|---------|
| OFF | Idle / powered down |
| HEATING | Temperature rising |
| COOLING | Temperature falling |
| READY | Transitional / pre-production |
| PRODUCTION | Normal production |
| LOW_PRODUCTION | Reduced throughput |

---

## Machine learning

| Model | Role |
|-------|------|
| RandomForest classifier | Window features → one of six states |
| Isolation Forest (one per state) | Anomaly score/flag for the active state |
| Drift detector | Feature z-scores vs baseline stats |

Anomaly fields are stored on live run evaluations with the rest of the evaluation payload.

---

## Capability scorecard

Operations Center digitalization is **not** a hardcoded UI percentage.

- ML owns weights and formulas in `Docs/capability_component_catalog.json`
- Backend runs `GET /operations-center/capability`
- Frontend only renders the payload
- Catalog must be available to the backend (`CAPABILITY_CATALOG_PATH` or `Docs/` mount)

---

## Useful endpoints

**Live-monitor (8001)**

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Pipeline 2.3: models loaded, sensors expected, serving readiness |
| GET | `/ml/model-status` | Per-state model files |
| POST | `/ml/reload-models` | Hot-load `.pkl` after PC retrain |
| POST | `/ml/trigger-retrain` | Always 403 |
| GET | `/live/current-window` | 404 until first window is written |
| GET | `/live/current-evaluation` | 404 until first evaluation |

**Backend (8002)** — live ML tables include `/live-process-windows`, `/live-run-evaluations`, `/live-feature-evaluations`, `/production-run/`, `/operations-center/capability`.

---

## License

Proprietary. Contact the repository owner for usage terms.
