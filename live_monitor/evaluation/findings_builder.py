"""Build plain-language AI findings for Operations Center (Module 7 / 15 / 16).

Texts are German to match the OC UI. Frontend already parses
"Empfohlene Maßnahme:" for Module 16 actions.
"""

from __future__ import annotations

import json
from typing import Any

from ml.drift_detector import human_feature_name

VALUE_MODEL = "MODEL_PREDICTION"
VALUE_RULE = "RULE_BASED"
VALUE_DERIVED = "DERIVED"

_FEATURE_LABELS = {
    "screw_speed_mean": "Schneckendrehzahl",
    "pressure_mean": "Extruderdruck",
    "load_mean": "Motorlast",
    "temperature_mean": "Temperatur",
    "pressure_per_rpm": "Druck je RPM",
    "load_per_pressure": "Last je Druck",
    "temp_spread": "Temperaturdifferenz",
    "mean_Val_1": "Schneckendrehzahl",
    "mean_Val_5": "Motorlast",
    "mean_Val_6": "Extruderdruck",
}


def _label(feature_name: str) -> str:
    if feature_name in _FEATURE_LABELS:
        return _FEATURE_LABELS[feature_name]
    return human_feature_name(feature_name)


def _severity_rank(severity: str) -> int:
    order = {"INFO": 0, "WARNING": 1, "CRITICAL": 2}
    return order.get(severity, 0)


def build_findings(
    *,
    confirmed_state: str | None,
    overall_status: str | None,
    stability_status: str | None,
    feature_results: list[Any] | None,
    ml_result: dict[str, Any] | None,
    drift_result: dict[str, Any] | None,
    baseline_result: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """
    Return structured findings for UI consumption.

    Shape:
      text, severity, value_source, state, ml_is_anomaly,
      feature_drivers[], recommended_action
    """
    findings: list[dict[str, Any]] = []
    state = confirmed_state or "UNKNOWN"
    ml_flag = bool(ml_result.get("ml_is_anomaly")) if ml_result else False
    drivers_from_features: list[str] = []

    flagged = [
        r
        for r in (feature_results or [])
        if getattr(r, "feature_status", None) in ("WARNING", "CRITICAL")
    ]
    for row in flagged:
        name = getattr(row, "feature_name", "feature")
        drivers_from_features.append(name)
        status = getattr(row, "feature_status", "WARNING")
        z_score = getattr(row, "z_score", None)
        direction = (
            "über" if (getattr(row, "deviation_abs", 0) or 0) > 0 else "unter"
        )
        z_txt = f" (z={float(z_score):.2f})" if z_score is not None else ""
        findings.append(
            {
                "text": (
                    f"{_label(name)} liegt {direction} der normalen Baseline"
                    f"{z_txt}."
                ),
                "severity": status,
                "value_source": VALUE_RULE,
                "state": state,
                "ml_is_anomaly": ml_flag,
                "feature_drivers": [name],
                "recommended_action": (
                    f"{_label(name)}-Sollwerte und letzte Material-/Prozessänderungen prüfen."
                ),
            }
        )

    if ml_result and ml_result.get("ml_is_anomaly") is True:
        score = ml_result.get("ml_anomaly_score")
        score_txt = f" Score={float(score):.2f}." if score is not None else ""
        findings.append(
            {
                "text": (
                    f"Aktuelles Verhalten wirkt für Zustand {state} ungewöhnlich."
                    f"{score_txt}"
                ),
                "severity": "WARNING" if overall_status != "CRITICAL" else "CRITICAL",
                "value_source": VALUE_MODEL,
                "state": state,
                "ml_is_anomaly": True,
                "feature_drivers": drivers_from_features[:5],
                "recommended_action": (
                    "Mit dem letzten stabilen Produktionsfenster vergleichen und "
                    "Drehzahl-, Druck- und Temperaturtrends prüfen."
                ),
            }
        )
    elif ml_result and ml_result.get("ml_model_status") not in (None, "ok", "ready"):
        status = ml_result.get("ml_model_status")
        if status and status not in ("scored",):
            findings.append(
                {
                    "text": f"Anomalie-Modellstatus für {state}: {status}.",
                    "severity": "INFO",
                    "value_source": VALUE_DERIVED,
                    "state": state,
                    "ml_is_anomaly": False,
                    "feature_drivers": [],
                    "recommended_action": "Keine Bedienhandlung für den Modellstatus nötig.",
                }
            )

    if drift_result and drift_result.get("drift_detected"):
        details = drift_result.get("drift_details") or {}
        names = [
            (details.get(f, {}) or {}).get("display_name")
            or _label(f)
            or human_feature_name(f)
            for f in drift_result.get("drifting_features") or []
        ]
        joined = ", ".join(names) if names else "wichtigen Prozessmerkmalen"
        findings.append(
            {
                "text": (
                    f"Anhaltende Drift gegenüber der stabilen Produktions-Baseline in: "
                    f"{joined}."
                ),
                "severity": "WARNING",
                "value_source": VALUE_MODEL,
                "state": state,
                "ml_is_anomaly": ml_flag,
                "feature_drivers": list(drift_result.get("drifting_features") or []),
                "recommended_action": (
                    "Die nächsten Fenster beobachten; bei fortgesetzter Drift Verschleiß, "
                    "Materialcharge und Temperaturzonen prüfen."
                ),
            }
        )

    if stability_status == "UNSTABLE":
        findings.append(
            {
                "text": "Prozessvariabilität ist hoch — die Maschine kann instabil sein.",
                "severity": "WARNING",
                "value_source": VALUE_DERIVED,
                "state": state,
                "ml_is_anomaly": ml_flag,
                "feature_drivers": ["screw_speed_std", "pressure_std"],
                "recommended_action": (
                    "Keine Sollwertänderungen, bis Drehzahl und Druck stabiler sind."
                ),
            }
        )
    elif stability_status == "TRANSITION":
        findings.append(
            {
                "text": "Leichte Variabilität — möglicher Zustandswechsel.",
                "severity": "INFO",
                "value_source": VALUE_DERIVED,
                "state": state,
                "ml_is_anomaly": ml_flag,
                "feature_drivers": [],
                "recommended_action": "Auf Zustandsbestätigung warten, bevor eingegriffen wird.",
            }
        )

    if not findings:
        regime = (baseline_result or {}).get("active_regime") or "UNKNOWN"
        method = (baseline_result or {}).get("baseline_selection_method") or "NONE"
        findings.append(
            {
                "text": (
                    f"Kein aktives Risiko für Zustand {state}. "
                    f"Prozess wirkt normal für Regime {regime} "
                    f"(Baseline={method})."
                ),
                "severity": "INFO",
                "value_source": VALUE_DERIVED,
                "state": state,
                "ml_is_anomaly": False,
                "feature_drivers": [],
                "recommended_action": "Normale Überwachung fortsetzen.",
            }
        )

    findings.sort(key=lambda f: _severity_rank(str(f.get("severity"))), reverse=True)
    return findings


def format_explanation_text(findings: list[dict[str, Any]]) -> str:
    """Human-readable explanation for live_run_evaluation.explanation_text (OC Module 7)."""
    if not findings:
        return "Keine Befunde."

    top = findings[0]
    parts = [str(top.get("text") or "").strip()]
    action = top.get("recommended_action")
    if action and top.get("severity") in ("WARNING", "CRITICAL"):
        parts.append(f"Empfohlene Maßnahme: {action}")

    for item in findings[1:3]:
        text = str(item.get("text") or "").strip()
        if text:
            source = item.get("value_source") or VALUE_DERIVED
            parts.append(f"[{source}] {text}")

    return " ".join(parts)


def findings_as_json(findings: list[dict[str, Any]]) -> str:
    """Compact JSON for logs / future backend field."""
    compact = [
        {
            "text": f.get("text"),
            "severity": f.get("severity"),
            "value_source": f.get("value_source"),
            "state": f.get("state"),
            "ml_is_anomaly": f.get("ml_is_anomaly"),
            "feature_drivers": f.get("feature_drivers") or [],
            "recommended_action": f.get("recommended_action"),
        }
        for f in findings[:8]
    ]
    return json.dumps(compact, ensure_ascii=False)


def build_prediction_risks(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Module 15/16 style risk cards (WARNING/CRITICAL only)."""
    risks: list[dict[str, Any]] = []
    for finding in findings:
        severity = str(finding.get("severity") or "INFO")
        if severity not in ("WARNING", "CRITICAL"):
            continue
        risks.append(
            {
                "title": "Prozessrisiko",
                "text": finding.get("text"),
                "severity": severity,
                "value_source": finding.get("value_source") or VALUE_DERIVED,
                "state": finding.get("state"),
                "feature_drivers": finding.get("feature_drivers") or [],
                "recommended_action": finding.get("recommended_action"),
                "is_customer_decision_relevant": True,
            }
        )
    return risks
