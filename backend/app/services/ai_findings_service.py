"""
Operations Center AI feed from live_monitor Postgres evaluations.

Contract (Ammar → backend APIs → UI):
  GET /live-process-windows     → current state + window features
  GET /live-run-evaluations     → Module 7 Live AI + overall_status
  GET /live-feature-evaluations → Module 15 drivers (WARNING/CRITICAL)
  GET /baseline-registry        → optional LOW/MID/HIGH reference

Never invent Accuracy %. Never call live_monitor local ports.
Provenance tags in explanation_text: [MODEL_PREDICTION] / [RULE_BASED].
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.live_feature_evaluation import LiveFeatureEvaluation
from app.models.live_process_window import LiveProcessWindow
from app.models.live_run_evaluation import LiveRunEvaluation
from app.services.live_export_service import parse_uuid

_PROVENANCE_TAG_RE = re.compile(
    r"\[(MODEL_PREDICTION|RULE_BASED|DERIVED|LIVE|SIMULATED)\]",
    re.IGNORECASE,
)
_ACTION_RE = re.compile(
    r"(?:Recommended action|Empfohlene Maßnahme)\s*:\s*(.+?)(?=\s*\[(?:MODEL_PREDICTION|RULE_BASED)\]|\s*$)",
    re.IGNORECASE | re.DOTALL,
)


def extract_provenance_tags(text: Optional[str]) -> List[str]:
    if not text:
        return []
    found = []
    for m in _PROVENANCE_TAG_RE.finditer(str(text)):
        tag = m.group(1).upper()
        if tag not in found:
            found.append(tag)
    return found


def primary_provenance(
    row: LiveRunEvaluation, explanation: Optional[str] = None
) -> Tuple[str, str]:
    """Prefer explicit tags in explanation_text; else ML flags → MODEL_PREDICTION."""
    tags = extract_provenance_tags(explanation or row.explanation_text)
    if "MODEL_PREDICTION" in tags:
        return "MODEL_PREDICTION", "Modellvorhersage"
    if "RULE_BASED" in tags and "MODEL_PREDICTION" not in tags:
        # Mixed text often has RULE_BASED feature notes + ML anomaly — ML wins if flagged
        if row.ml_is_anomaly is True:
            return "MODEL_PREDICTION", "Modellvorhersage"
        return "RULE_BASED", "Regelbasierte Auswertung"
    if row.ml_is_anomaly is not None or (
        row.ml_anomaly_score is not None
        and str(row.ml_model_status or "").upper()
        in {"READY", "EVALUATED", "LOADED", "ACTIVE", ""}
    ):
        return "MODEL_PREDICTION", "Modellvorhersage"
    return "RULE_BASED", "Regelbasierte Auswertung"


def extract_recommended_action(explanation: Optional[str]) -> Optional[str]:
    """Module 16 — only the Recommended action sentence from explanation_text."""
    text = str(explanation or "").strip()
    if not text:
        return None
    m = _ACTION_RE.search(text)
    if not m:
        return None
    action = m.group(1).strip()
    action = _PROVENANCE_TAG_RE.sub("", action).strip(" .;")
    return action or None


def clean_explanation_for_display(explanation: Optional[str]) -> Optional[str]:
    """Module 7 body — explanation without action trailer; keep readable sentences."""
    text = str(explanation or "").strip()
    if not text:
        return None
    # Remove action clause (shown separately) but keep finding sentences
    without_action = _ACTION_RE.sub("", text).strip()
    # Soft-clean repeated provenance tags for display (badges show them)
    without_action = re.sub(r"\s+", " ", without_action).strip(" .")
    return without_action or text


def feature_to_prediction_card(f: LiveFeatureEvaluation) -> Dict[str, Any]:
    """Module 15 — one card per WARNING/CRITICAL feature evaluation."""
    status = str(f.feature_status or "").upper()
    z = f.z_score
    z_part = f" (z={round(float(z), 2)})" if z is not None else ""
    text = f"{f.feature_name}: {status}{z_part}"
    if f.current_value is not None:
        text += f" — Istwert {round(float(f.current_value), 3)}"
    return {
        "id": f"lfe-{f.id}",
        "kind": "live_feature_evaluation",
        "title": f.feature_name or f"Feature #{f.id}",
        "text": text,
        "feature_name": f.feature_name,
        "feature_status": f.feature_status,
        "z_score": f.z_score,
        "current_value": f.current_value,
        "baseline_mean": f.baseline_mean,
        "baseline_std": f.baseline_std,
        "live_process_window_id": f.live_process_window_id,
        "live_run_evaluation_id": f.live_run_evaluation_id,
        "severity": status.lower() if status else "warning",
        "overall_status": status,
        "value_source": "RULE_BASED",
        "display_label": "Regelbasierte Auswertung",
        "action": None,
    }


def anomaly_run_to_prediction_card(row: LiveRunEvaluation) -> Dict[str, Any]:
    """Module 15 — card when ml_is_anomaly=true."""
    source, label = primary_provenance(row)
    score = row.ml_anomaly_score
    score_txt = f" Score {round(float(score), 3)}" if score is not None else ""
    text = clean_explanation_for_display(row.explanation_text) or (
        f"ML-Anomalie erkannt.{score_txt}"
    )
    return {
        "id": f"lre-anomaly-{row.id}",
        "kind": "ml_anomaly",
        "title": f"Anomalie · Laufbewertung #{row.id}",
        "text": text,
        "severity": "critical" if row.ml_is_anomaly else "warning",
        "overall_status": row.overall_status,
        "detected_state": row.detected_state,
        "ml_is_anomaly": row.ml_is_anomaly,
        "ml_anomaly_score": row.ml_anomaly_score,
        "ml_model_status": row.ml_model_status,
        "drift_score": row.drift_score,
        "stability_status": row.stability_status,
        "active_regime": row.active_regime,
        "value_source": source,
        "display_label": label,
        "action": extract_recommended_action(row.explanation_text),
        "provenance_tags": extract_provenance_tags(row.explanation_text),
    }


def window_brief(win: LiveProcessWindow) -> Dict[str, Any]:
    return {
        "id": win.id,
        "window_start": win.window_start.isoformat() if win.window_start else None,
        "window_end": win.window_end.isoformat() if win.window_end else None,
        "confirmed_state": win.confirmed_state,
        "candidate_state": win.candidate_state,
        "machine_id": str(win.machine_id) if win.machine_id else None,
        "production_run_id": win.production_run_id,
        "avg_pressure": win.avg_pressure,
        "avg_speed": win.avg_speed,
        "avg_temp": win.avg_temp,
        "avg_load": win.avg_load,
        "row_count": win.row_count,
        "value_source": "LIVE",
        "display_label": "LIVE",
    }


def run_evaluation_payload(
    row: LiveRunEvaluation,
    *,
    feature_drivers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    explanation = row.explanation_text
    source, label = primary_provenance(row, explanation)
    action = extract_recommended_action(explanation)
    text = clean_explanation_for_display(explanation)
    if not text and row.overall_status:
        text = f"Prozessbewertung: {row.overall_status}"
    return {
        "id": f"lre-{row.id}",
        "live_run_evaluation_id": row.id,
        "live_process_window_id": row.live_process_window_id,
        "machine_id": str(row.machine_id) if row.machine_id else None,
        "production_run_id": row.production_run_id,
        "detected_state": row.detected_state,
        "overall_status": row.overall_status,
        "stability_status": row.stability_status,
        "drift_score": row.drift_score,
        "active_regime": row.active_regime,
        "ml_is_anomaly": row.ml_is_anomaly,
        "ml_anomaly_score": row.ml_anomaly_score,
        "ml_model_status": row.ml_model_status,
        "explanation_text": explanation,
        "text": text,
        "action": action,
        "value_source": source,
        "display_label": label,
        "provenance_tags": extract_provenance_tags(explanation),
        "feature_drivers": feature_drivers or [],
        "severity": str(row.overall_status or "WARNING").lower(),
    }


async def _latest_run(
    session: AsyncSession, *, machine_id: Optional[str]
) -> Optional[LiveRunEvaluation]:
    q = select(LiveRunEvaluation).order_by(LiveRunEvaluation.id.desc())
    if machine_id:
        try:
            mid = parse_uuid(str(machine_id))
            if mid:
                scoped = q.where(LiveRunEvaluation.machine_id == mid)
                row = (await session.execute(scoped.limit(1))).scalar_one_or_none()
                if row is not None:
                    return row
        except (TypeError, ValueError):
            pass
    return (await session.execute(q.limit(1))).scalar_one_or_none()


async def _features_for_run(
    session: AsyncSession, *, run: LiveRunEvaluation, limit: int = 40
) -> List[LiveFeatureEvaluation]:
    if run.id is not None:
        rows = list(
            (
                await session.execute(
                    select(LiveFeatureEvaluation)
                    .where(LiveFeatureEvaluation.live_run_evaluation_id == run.id)
                    .order_by(LiveFeatureEvaluation.id.desc())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )
        if rows:
            return rows
    if run.live_process_window_id is not None:
        return list(
            (
                await session.execute(
                    select(LiveFeatureEvaluation)
                    .where(
                        LiveFeatureEvaluation.live_process_window_id
                        == run.live_process_window_id
                    )
                    .order_by(LiveFeatureEvaluation.id.desc())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )
    return []


def _driver_dict(f: LiveFeatureEvaluation) -> Dict[str, Any]:
    return {
        "id": f.id,
        "feature_name": f.feature_name,
        "feature_status": f.feature_status,
        "z_score": f.z_score,
        "current_value": f.current_value,
        "baseline_mean": f.baseline_mean,
        "baseline_std": f.baseline_std,
        "value_source": "RULE_BASED",
        "display_label": "Regelbasierte Auswertung",
    }


async def build_ai_snapshot(
    session: AsyncSession,
    *,
    machine_id: Optional[str] = None,
    history_limit: int = 20,
) -> Dict[str, Any]:
    """
    Structured OC feed:
      - latest_window (process window)
      - latest_run / recommendation (Module 7)
      - predictions (Module 15: WARNING/CRITICAL features + ml_is_anomaly)
      - actions (Module 16: Recommended action from explanation_text)
      - risks (compat for pickRecommendation)
    """
    latest = await _latest_run(session, machine_id=machine_id)
    window = None
    recommendation = None
    risks: List[Dict[str, Any]] = []
    predictions: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []
    feature_rows: List[LiveFeatureEvaluation] = []

    if latest is not None:
        feature_rows = await _features_for_run(session, run=latest)
        drivers = [_driver_dict(f) for f in feature_rows]
        run_payload = run_evaluation_payload(latest, feature_drivers=drivers)
        risks.append(run_payload)

        recommendation = {
            **run_payload,
            # Module 7 prefers full explanation_text when present
            "text": run_payload.get("text")
            or run_payload.get("explanation_text")
            or f"Status {latest.overall_status}",
        }

        if run_payload.get("action"):
            actions.append(
                {
                    "id": f"action-{run_payload['id']}",
                    "risk_id": run_payload["id"],
                    "risk_text": run_payload.get("text"),
                    "action": run_payload["action"],
                    "severity": run_payload.get("overall_status"),
                    "value_source": run_payload.get("value_source") or "RULE_BASED",
                    "display_label": run_payload.get("display_label"),
                    "machine_id": run_payload.get("machine_id"),
                    "detected_state": run_payload.get("detected_state"),
                    "provenance_tags": run_payload.get("provenance_tags") or [],
                }
            )

        # Module 15 — WARNING/CRITICAL feature cards
        for f in feature_rows:
            st = str(f.feature_status or "").upper()
            if st in {"WARNING", "CRITICAL"}:
                predictions.append(feature_to_prediction_card(f))

        # Module 15 — ML anomaly card
        if latest.ml_is_anomaly is True:
            predictions.insert(0, anomaly_run_to_prediction_card(latest))

        if latest.live_process_window_id:
            win = (
                await session.execute(
                    select(LiveProcessWindow).where(
                        LiveProcessWindow.id == latest.live_process_window_id
                    )
                )
            ).scalar_one_or_none()
            if win:
                window = window_brief(win)

    # Extra history: anomalous / non-NORMAL runs for Predictions page
    hist_q = (
        select(LiveRunEvaluation)
        .order_by(LiveRunEvaluation.id.desc())
        .limit(max(1, min(history_limit, 50)))
    )
    if machine_id:
        try:
            mid = parse_uuid(str(machine_id))
            if mid:
                hist_q = hist_q.where(LiveRunEvaluation.machine_id == mid)
        except (TypeError, ValueError):
            pass
    history = list((await session.execute(hist_q)).scalars().all())
    seen_pred = {p["id"] for p in predictions}
    for row in history:
        if row.id == (latest.id if latest else None):
            continue
        if row.ml_is_anomaly is True:
            card = anomaly_run_to_prediction_card(row)
            if card["id"] not in seen_pred:
                predictions.append(card)
                seen_pred.add(card["id"])
        act = extract_recommended_action(row.explanation_text)
        if act and str(row.overall_status or "").upper() in {"WARNING", "CRITICAL"}:
            aid = f"action-lre-{row.id}"
            if not any(a["id"] == aid for a in actions):
                src, lab = primary_provenance(row)
                actions.append(
                    {
                        "id": aid,
                        "risk_id": f"lre-{row.id}",
                        "risk_text": clean_explanation_for_display(row.explanation_text),
                        "action": act,
                        "severity": row.overall_status,
                        "value_source": src,
                        "display_label": lab,
                        "machine_id": str(row.machine_id) if row.machine_id else None,
                        "detected_state": row.detected_state,
                        "provenance_tags": extract_provenance_tags(row.explanation_text),
                    }
                )

    return {
        "available": bool(latest is not None),
        "machine_id": machine_id,
        "latest_window": window,
        "latest_run": recommendation,
        "recommendation": recommendation,
        "risks": risks,
        "predictions": predictions,
        "actions": actions,
        "latest_run_evaluation_id": latest.id if latest else None,
        "sources": {
            "windows": "GET /live-process-windows",
            "run_evaluations": "GET /live-run-evaluations",
            "feature_evaluations": "GET /live-feature-evaluations",
            "baseline_registry": "GET /baseline-registry",
        },
        "value_source_note": (
            "Provenance from explanation_text tags [MODEL_PREDICTION]/[RULE_BASED] "
            "or ml_is_anomaly. Never invent Accuracy %."
        ),
    }


async def build_overview_risks(
    session: AsyncSession,
    *,
    machine_id: Optional[str],
) -> List[Dict[str, Any]]:
    snap = await build_ai_snapshot(session, machine_id=machine_id, history_limit=5)
    return list(snap.get("risks") or [])
