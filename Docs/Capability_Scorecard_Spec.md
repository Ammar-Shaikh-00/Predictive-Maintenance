# ZITTA Capability Scorecard — Spec for AI/ML, Backend, Frontend

**Version:** 1.0.0  
**Date:** 17 August 2026  
**Product:** ZITTA Digital Production Control Center — Operations Center card *Digitalisierungsfortschritt*  
**Audience:** AI/ML developers, backend, frontend  
**Status:** Ready to implement — catalog is frozen until ML signs off  

**Single source of truth:**
- `Docs/capability_component_catalog.json` — **only** catalog file. Use for DB seed **and** runtime (backend loads this file). AI/ML edits this file when weights, formulas, or labels change.

This document does **not** ask anyone to invent Accuracy %. Digitalization, work health, and model accuracy stay separate.

---

## 1. Goal

The current card is a **binary checklist** (connected vs missing). Five sources are on, five are off, weighted total **55%**. That is honest but weak for a client: it looks like “the app is half empty.”

**Target:** same card becomes a **capability scorecard**.

- Show which components exist in *this* system.
- Show **how well each one is working** (`work_pct` 0–100).
- Keep locked items visible, with the **feature they unlock**.
- All weights, German labels, formulas, and unlocks are **owned by AI/ML** in a table.
- Backend **executes** those formulas against live data and exposes a GET API.
- Frontend **only renders** the API payload.

Client story: *“Live extrusion is running. Quality, energy, ERP are the next unlocks — here is exactly what they enable.”*

---

## 2. Honesty rules (non-negotiable)

1. Never invent **Accuracy %**. Module 5 stays locked until `model_versions.validated = true`.
2. Never mix these three numbers:
   - `digitalization_progress` = coverage (is the source connected / contributing?)
   - `work_pct` = health of a connected component
   - model accuracy = only after validated `model_versions`
3. Never mark a locked source as active.
4. Every runtime value carries `value_source`: `LIVE | DERIVED | MODEL_PREDICTION | RULE_BASED | MANUAL`.
5. If a probe fails, status becomes `degraded` or `locked` and `work_pct = 0`. Do not keep a painted last number.
6. Cosmetic items (VPN, generic SQL database, user management) are **out of scope**.

---

## 3. Who does what

### 3.1 AI/ML (catalog owner)

| Task | Deliverable |
|---|---|
| Freeze `component_key` list | `capability_component_catalog.json` |
| Set `weight` (must sum to 100 for digitalization rows) | JSON |
| Write `work_pct_formula` per component | JSON — backend implements literally |
| German + English labels, hints, unlocks | JSON |
| Define expected ML states | `OFF, HEATING, READY, LOW_PRODUCTION, PRODUCTION, COOLING` |
| Define stale windows | `stale_after_seconds` |
| Decide which rows appear on the OC card | `show_on_scorecard` |
| Maintain `model_versions` when a model is validated | DB row — **never** a UI-only flag |
| After retrain: copy `.pkl` to live-monitor `ml_data/` and `POST /ml/reload-models` | Ops note |
| Review first live payload vs formulas | Sign-off on `GET /operations-center/capability` |

ML does **not** compute the scorecard on a laptop and paste numbers into the UI. ML owns the **rules**. Backend runs the rules every poll.

### 3.2 Backend

| Task | Deliverable |
|---|---|
| Create tables below + Alembic migration | `capability_component`, `capability_snapshot` |
| Seed catalog from JSON | Idempotent bootstrap |
| Implement formula probes (health, TSDB age, `detected_state`, model list, baselines, QC counts, …) | Service |
| Overlay live `ai_server` health (already exists) | Reuse `ai_service_health` |
| Machine state from `live_run_evaluation.detected_state` (already switched) | Keep |
| `GET /operations-center/capability` | Runtime API |
| Optionally embed the same object on `GET /operations-center/overview` | Avoid extra frontend poll |
| Persist last snapshot for audit | `capability_snapshot` |
| Admin `PUT` catalog (optional) | Only if ML needs to tune weights without a code deploy |

### 3.3 Frontend

| Task | Deliverable |
|---|---|
| Stop using local `ALWAYS_CONNECTED` / hardcoded 10-tick slice as source of truth | Read API |
| Render `digitalization_progress` as the big % | Existing ring |
| Each row: status icon + `label_de` + `work_pct` bar (or lock) + hint | New row UI |
| Locked row shows `unlocks[].label_de` | “Schaltet frei: …” |
| Footer: machines connected + models loaded + locked count | From API |
| No demo math, no invented Accuracy | Provenance badge if useful |

---

## 4. Three scores (do not collapse into one)

| Score | Formula | What the client should hear |
|---|---|---|
| **Digitalisierung** | Sum of `weight` where `contributes_to_digitalization=true` and runtime status is `active` or `degraded` | “How much of the plant data spine is connected?” Current honest value with five core sources: **55**. |
| **Arbeitsgrad (optional ring)** | Weighted average of `work_pct` over those same digitalization rows | “Of what is connected, how healthy is it?” |
| **KI-Serving** | Mean `work_pct` of `category=ml` rows that are `enabled_in_product` | “Are models loaded and evaluating?” **Not** accuracy. |

Example with today’s plant:

- Digitalisierung **55%** (ai_server 10 + machine_data 15 + machine_state 10 + live_sensors 10 + production_history 10).
- Qualitätsdaten / Wartung / Material / Energie / Bediener / Validierte Modelle still **0 weight credited**.
- Anomalie-Modelle can show **100% work** (6/6 loaded) without increasing the 55% bar.

---

## 5. What to show on the Operations Center card

### 5.1 Header

- Title: **Digitalisierungsfortschritt**
- Big number: `digitalization_progress` (integer 0–100)
- Progress bar: same number
- Optional subtitle: `Arbeitsgrad {capability_work_index}%` only if product wants a second number — default **off** until ML agrees

### 5.2 Primary checklist (always visible, `show_on_scorecard=true` and `contributes_to_digitalization=true`)

Order is `sort_order`. Do not hide locked rows.

| # | component_key | German | Weight | Expected now |
|---|---|---|---|---|
| 1 | `ai_server` | KI-Server | 10 | active |
| 2 | `machine_data` | Maschinendaten | 15 | active |
| 3 | `machine_state` | Maschinenstatus | 10 | active |
| 4 | `live_sensors` | Live-Sensoren | 10 | active |
| 5 | `production_history` | Produktionshistorie | 10 | active |
| 6 | `quality_data` | Qualitätsdaten | 15 | **locked** |
| 7 | `maintenance_history` | Wartung | 10 | **locked** |
| 8 | `material_batches` | Material | 5 | **locked** |
| 9 | `energy_data` | Energie | 5 | **locked** |
| 10 | `operator_events` | Bediener | 5 | **locked** |
| 11 | `models_validated` | Validierte Modelle | 5 | **locked** |

Weights **sum to 100**. That is the digitalization bar.

Per row UI:

- `active` → green check + `work_pct` (e.g. `96%`)
- `degraded` → amber check + `work_pct` + hint
- `locked` → empty box + `0%` + unlock benefit

### 5.3 Secondary ML strip (same card, below the 11, or a compact “KI-Schicht” block)

These **do not** add to 55%. They prove the live AI pipeline is real.

| component_key | German | Typical work_pct source |
|---|---|---|
| `live_process_windows` | Prozessfenster | Window age ≤ 120s |
| `live_run_evaluations` | Live-Bewertung | Evaluation age ≤ 120s |
| `state_classifier` | Zustandsklassifikator | `.pkl` loaded |
| `anomaly_models` | Anomalie-Modelle | `len(ml_models_loaded)/6` |
| `drift_monitor` | Drift-Überwachung | `drift_score` present |
| `baseline_registry` | Baseline-Register | LOW/MID/HIGH regimes |
| `prediction_readiness` | Vorhersagebereitschaft | AI service readiness — **not Accuracy** |

### 5.4 Footer

- `{connected_machines} von {total_machines} Maschinen angebunden`
- `{models_loaded}/6 Modelle aktiv` (from `anomaly_models`)
- `{locked_count} Quellen offen`

### 5.5 Not on this card (keep elsewhere)

- OPC-UA, ERP/MES (`show_on_scorecard=false`) — Setup wizard / missing sources
- Alarms & tickets — already a KPI
- OEE, ROI, Accuracy — other modules

---

## 6. Runtime status mapping

| status | Meaning | Credits digitalization weight? |
|---|---|---|
| `active` | Probe passed, not stale | Yes |
| `degraded` | Connected but stale / incomplete | Yes (honest: connected but unhealthy) |
| `locked` | Source not connected or not enabled | No |
| `not_applicable` | Out of product scope | No |

`degraded` still counts toward 55% because the **source exists**. `work_pct` tells the client it is unhealthy.

---

## 7. Database tables

Keep existing `data_sources`, `feature_capabilities`, `machine_integrations`. Add two tables. Do not duplicate live facts that already live in `live_run_evaluation`, TimescaleDB, etc.

### 7.1 `capability_component` — ML catalog (seed from JSON)

One row per `component_key` per `company_id`. ML owns this. Backend rarely writes except seed/admin PUT.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `company_id` | varchar(64) not null | default `default` |
| `component_key` | varchar(64) not null | e.g. `anomaly_models` |
| `label_de` | varchar(160) not null | |
| `label_en` | varchar(160) not null | |
| `category` | varchar(32) not null | `infrastructure \| data \| ml \| integration \| operations` |
| `sort_order` | int not null | |
| `show_on_scorecard` | boolean not null | |
| `contributes_to_digitalization` | boolean not null | |
| `weight` | numeric(5,2) not null | 0 if not in the 100% bar |
| `enabled_in_product` | boolean not null | |
| `unlocks_feature_keys` | jsonb not null default `[]` | |
| `value_source_default` | varchar(32) not null | |
| `work_pct_formula` | text not null | Exact string from JSON |
| `probe` | text not null | Human-readable probe |
| `stale_after_seconds` | int null | |
| `hint_active_de` | varchar(240) | |
| `hint_locked_de` | varchar(240) | |
| `settings` | jsonb not null default `{}` | thresholds overrides |

**Unique:** `(company_id, component_key)`

**Check:** sum of `weight` where `contributes_to_digitalization=true` AND `enabled_in_product=true` = 100.

### 7.2 `capability_snapshot` — last computed result (audit / debug)

Written by backend after each recompute. UI may use live compute; snapshot is for history.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `created_at` | timestamptz | |
| `company_id` | varchar(64) not null | |
| `machine_id` | UUID null | Selected machine |
| `digitalization_progress` | numeric(5,2) not null | |
| `capability_work_index` | numeric(5,2) null | |
| `ml_serving_index` | numeric(5,2) null | |
| `connected_machines` | int | |
| `total_machines` | int | |
| `payload` | jsonb not null | Full API body |
| `value_source` | varchar(32) not null | `DERIVED` |

**Index:** `(company_id, machine_id, created_at desc)`

### 7.3 Existing tables the probes read (do not replace)

| Table / system | Used for |
|---|---|
| `live_run_evaluation.detected_state` | `machine_state` |
| `live_process_window` | `live_process_windows` |
| TimescaleDB extruder latest | `machine_data`, `live_sensors` |
| `production_run` | `production_history` |
| `baseline_registry` | `baseline_registry` |
| AI service `/health` | `ai_server`, `anomaly_models` list if exposed |
| live-monitor `GET /health` | `ml_models_loaded`, pipeline |
| quality / maintenance / energy / material import tables | locked sources when they get data |
| `model_versions` (when it exists) | `models_validated` |
| `data_sources.status` | optional override if a source is manually marked connected |

---

## 8. APIs

Base path: backend (today `:8002`). Auth: same as Operations Center overview.

### 8.1 `GET /operations-center/capability`

**Query:** `company_id=default` (required), `machine_id=` UUID or slug (optional, selected extruder).

**Response 200:**

```json
{
  "company_id": "default",
  "machine_id": "6f37c433-44e9-4a66-b019-cc342a95cc54",
  "generated_at": "2026-08-17T12:00:00Z",
  "digitalization_progress": 55,
  "capability_work_index": 91,
  "ml_serving_index": 85,
  "connected_machines": 1,
  "total_machines": 1,
  "models_loaded": 6,
  "models_expected": 6,
  "value_source": "DERIVED",
  "components": [
    {
      "component_key": "machine_state",
      "label_de": "Maschinenstatus",
      "category": "ml",
      "status": "active",
      "work_pct": 100,
      "weight": 10,
      "contributes_to_digitalization": true,
      "value_source": "MODEL_PREDICTION",
      "hint_de": "detected_state von live_run_evaluation",
      "detail": {
        "detected_state": "LOW_PRODUCTION",
        "age_seconds": 8
      },
      "unlocks": []
    },
    {
      "component_key": "quality_data",
      "label_de": "Qualitätsdaten",
      "category": "data",
      "status": "locked",
      "work_pct": 0,
      "weight": 15,
      "contributes_to_digitalization": true,
      "value_source": "LIVE",
      "hint_de": "QC-Import nicht verbunden — schaltet Ausschussfrüherkennung frei",
      "detail": { "qc_event_count": 0 },
      "unlocks": [
        {
          "feature_key": "quality_degradation_prediction",
          "label_de": "Vorhersage Qualitätsverschlechterung"
        },
        {
          "feature_key": "scrap_prediction",
          "label_de": "Ausschussvorhersage"
        }
      ]
    }
  ]
}
```

### 8.2 `GET /operations-center/overview`

Keep current contract. **Add** `capability` object (same shape as §8.1) so the homepage stays one poll.

### 8.3 Probes backend already has (reuse, do not duplicate)

| Probe | Endpoint / table |
|---|---|
| AI service | `GET {AI_SERVICE_URL}/health` |
| Live-monitor | `GET http://live-monitor:9003/health` → `ml_models_loaded` |
| Plant state | `live_run_evaluation.detected_state` |
| Overview | `GET /operations-center/overview` |
| Order board | `GET /production-run/order-board` |

### 8.4 Optional later

| Method | Path | Who |
|---|---|---|
| `PUT` | `/operations-center/capability/catalog` | Admin / ML — replace catalog rows |
| `POST` | `/operations-center/capability/recompute` | Force snapshot write |
| `GET` | `/operations-center/capability/snapshots?limit=50` | History |

---

## 9. Formulas backend must implement (from catalog)

Implement **exactly** as `work_pct_formula`. If a probe cannot run, `work_pct=0`, `status=locked` or `degraded`.

| component_key | work_pct | status rule |
|---|---|---|
| `ai_server` | 100 if `/health` ok else 0 | active / locked |
| `machine_data` | 100 if latest point ≤ 60s; decay to 0 by 11 min | degraded if 60s–11 min |
| `machine_state` | 100 if `detected_state` in expected 6 states and age ≤ 120s; 40 if stale; else 0 | |
| `live_sensors` | present mapped channels / expected channels × 100 | degraded if &lt; 80% |
| `production_history` | 100 if ≥1 run with product + start; 60 if run exists but sparse; else 0 | |
| `quality_data` | days-with-QC in last 30 / 30 × 100, else 0 | locked if 0 events |
| `maintenance_history` | history_days / 60 × 100 capped 100, else 0 | locked if 0 events |
| `material_batches` | linked_runs / total_runs × 100 | locked if 0 batches |
| `energy_data` | 100 with reading + baseline; 50 reading only; else 0 | |
| `operator_events` | min(100, events_7d × 10) | locked if 0 |
| `models_validated` | 100 if validated `model_versions` else **0** | always locked until ML writes the row |
| `live_process_windows` | 100 if window_end ≤ 120s else 0 | |
| `live_run_evaluations` | 100 if eval ≤ 120s else 0 | |
| `state_classifier` | 100 if loaded else 0 | |
| `anomaly_models` | loaded / 6 × 100 | degraded if 1–5 |
| `drift_monitor` | 100 if `drift_score` not null; 40 if pipeline up without score; else 0 | degraded allowed |
| `baseline_registry` | regimes_present / 3 × 100 | |
| `prediction_readiness` | AI-reported readiness or **0** — never derive from source weights | |

Expected ML states: `OFF`, `HEATING`, `READY`, `LOW_PRODUCTION`, `PRODUCTION`, `COOLING`.

Digitalization:

```
digitalization_progress = sum(weight)
  for components where contributes_to_digitalization
  and status in (active, degraded)
```

---

## 10. Unlock map (locked row → client benefit)

| Missing component | Unlocks (German) |
|---|---|
| Qualitätsdaten | Vorhersage Qualitätsverschlechterung; Ausschussvorhersage |
| Wartung | Restnutzungsdauer |
| Material | Materialverhaltensanalyse; Ausschussvorhersage |
| Energie | Energieoptimierung |
| Bediener | supports quality + RUL (recommended, not required alone) |
| Validierte Modelle | Validierte Modellgenauigkeit (Module 5) |

Required vs recommended is in JSON `unlock_features`.

---

## 11. Current plant vs catalog (sanity check for ML)

As of 17 Aug 2026 on the edge node:

| Fact | Implication |
|---|---|
| live-monitor on :9003, models loaded 6/6 | `anomaly_models` work_pct ≈ 100 |
| `detected_state` / evaluations in Postgres | `machine_state` from **evaluation**, not window `confirmed_state` |
| TimescaleDB + backend 8002 | `machine_data`, `live_sensors` live |
| Production runs exist | `production_history` on; product name may still be placeholder |
| QC / CMMS / energy / batches / operator | keep **locked**, work_pct 0 |
| No validated `model_versions` | `models_validated` locked; **no Accuracy %** |
| Drift CSV was missing in container logs | `drift_monitor` may be `degraded` — that is OK |

---

## 12. Implementation sequence (after ML sign-off)

1. ML reviews `capability_component_catalog.json`. Change weights/formulas **in that file**, not in chat.
2. Backend loads the same JSON at runtime (mtime reload). `GET /operations-center/capability` and `overview.capability`.
3. Frontend scorecard renders API rows + `work_pct` — no local weights.
4. Joint check: locked rows still locked; 55% still 55% until a new source actually has data.
5. Only then show `capability_work_index` as a second number if the client wants it.
6. Optional later: Alembic `capability_component` table as a seed copy of this file.

---

## 13. AI/ML sign-off checklist

- [ ] Component keys and German labels approved  
- [ ] Digitalization weights still sum to **100**  
- [ ] Every formula is computable from existing DB / health endpoints (or explicitly `locked` until a connector exists)  
- [ ] No formula outputs Accuracy %  
- [ ] Unlock features match product promises  
- [ ] Stale windows (60s / 120s / 300s) accepted for Mini-PC polling  
- [ ] `models_validated` stays locked until a real `model_versions` row is written  

Signed off by (AI/ML): ________________  Date: ________

---

## 14. File index

| File | Use |
|---|---|
| `Docs/Capability_Scorecard_Spec.md` | Design spec (this document) |
| `Docs/capability_component_catalog.json` | **Single source of truth** — seed DB + runtime catalog |

**Workflow:** AI/ML edits the JSON → bump `updated_at` / `spec_version` → backend re-seeds or reloads from the same path. No duplicate CSV or frontend hardcoding.
