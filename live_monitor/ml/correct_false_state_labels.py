"""Correct false state labels before model training (data-driven, no process hardcode).

Sources of truth from live_process_windows:
1) Stuck confirmed bug: candidate != confirmed → trust candidate for overlapping
   labeled windows that still have the wrong confirmed label.
2) False COOLING in clusters: labeled COOLING overlapping trusted non-COOLING
   live periods (candidate == confirmed != COOLING) → rewrite to that live state.

Used by retrain after map_live_cluster_states.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

_LIVE_MONITOR_ROOT = Path(__file__).resolve().parent.parent
if str(_LIVE_MONITOR_ROOT) not in sys.path:
    sys.path.insert(0, str(_LIVE_MONITOR_ROOT))

import config  # noqa: E402
from storage.backend_client import BackendClient  # noqa: E402

REPORT_FILE = os.path.join(config.ML_OUTPUT_DIR, "false_state_label_report.json")


def _parse_ts(value) -> pd.Timestamp | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    ts = pd.to_datetime(value, utc=True, errors="coerce")
    if pd.isna(ts):
        return None
    return ts


def _load_live_windows(*, pages: int = 100, page_size: int = 100) -> list[dict]:
    client = BackendClient()
    out: list[dict] = []
    for page in range(pages):
        rows = client.list_live_process_windows(
            limit=page_size, offset=page * page_size
        )
        if not rows:
            break
        out.extend(rows)
        if len(rows) < page_size:
            break
    return out


def _interval(row: dict) -> tuple[pd.Timestamp, pd.Timestamp] | None:
    start = _parse_ts(row.get("window_start") or row.get("created_at"))
    end = _parse_ts(row.get("window_end") or row.get("created_at"))
    if start is None:
        return None
    if end is None:
        end = start
    return start, end


def _overlaps(row_start: pd.Timestamp, row_end: pd.Timestamp, start: pd.Timestamp, end: pd.Timestamp) -> bool:
    return row_start <= end and row_end >= start


def build_corrections(live_rows: list[dict]) -> list[dict]:
    """
    Each correction: time range + target label to apply when current label matches
    `replace_from` (or any if replace_from is None).
    """
    corrections: list[dict] = []

    for row in live_rows:
        cand = str(row.get("candidate_state") or "").upper()
        conf = str(row.get("confirmed_state") or "").upper()
        iv = _interval(row)
        if not iv or not cand or not conf:
            continue
        start, end = iv

        # 1) Stuck confirmed: trust candidate
        if cand != conf:
            corrections.append(
                {
                    "reason": "candidate_confirmed_mismatch",
                    "replace_from": conf,
                    "replace_to": cand,
                    "window_start": start.isoformat(),
                    "window_end": end.isoformat(),
                    "live_id": row.get("id"),
                }
            )
            continue

        # 2) Trusted non-COOLING live period — strip overlapping cluster COOLING labels
        if cand == conf and cand != "COOLING":
            corrections.append(
                {
                    "reason": "trusted_non_cooling_period",
                    "replace_from": "COOLING",
                    "replace_to": cand,
                    "window_start": start.isoformat(),
                    "window_end": end.isoformat(),
                    "live_id": row.get("id"),
                }
            )

    return corrections


def correct_labeled_csv(labeled_path: str | None = None) -> dict:
    path = labeled_path or config.LIVE_LABELED_CSV
    live_rows = _load_live_windows()
    corrections = build_corrections(live_rows)

    report = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "live_windows_scanned": len(live_rows),
        "correction_rules": len(corrections),
        "mismatch_rules": sum(
            1 for c in corrections if c["reason"] == "candidate_confirmed_mismatch"
        ),
        "non_cooling_rules": sum(
            1 for c in corrections if c["reason"] == "trusted_non_cooling_period"
        ),
        "by_target": {},
        "corrected_rows": 0,
        "path": path,
    }

    if not corrections:
        logging.info("No live-window corrections — labeled CSV unchanged")
        _save_report(report)
        return report

    if not os.path.isfile(path):
        logging.warning("Labeled CSV missing: %s", path)
        _save_report(report)
        return report

    df = pd.read_csv(path)
    if "predicted_state" not in df.columns or "window_start" not in df.columns:
        logging.warning("Labeled CSV missing predicted_state/window_start")
        _save_report(report)
        return report

    end_col = "window_end" if "window_end" in df.columns else "window_start"
    starts = pd.to_datetime(df["window_start"], utc=True, errors="coerce")
    ends = pd.to_datetime(df[end_col], utc=True, errors="coerce").fillna(starts)

    parsed = []
    for c in corrections:
        s = _parse_ts(c["window_start"])
        e = _parse_ts(c["window_end"])
        if s is not None and e is not None:
            parsed.append((s, e, c["replace_from"], c["replace_to"], c["reason"]))

    corrected = 0
    by_target: dict[str, int] = {}
    for idx in df.index:
        label = str(df.at[idx, "predicted_state"] or "").upper()
        rs = starts.at[idx]
        re_ = ends.at[idx]
        if pd.isna(rs):
            continue
        if pd.isna(re_):
            re_ = rs
        for start, end, replace_from, replace_to, reason in parsed:
            if label != replace_from:
                continue
            if not _overlaps(rs, re_, start, end):
                continue
            df.at[idx, "predicted_state"] = replace_to
            corrected += 1
            key = f"{replace_from}->{replace_to}"
            by_target[key] = by_target.get(key, 0) + 1
            break

    df.to_csv(path, index=False)
    report["corrected_rows"] = corrected
    report["by_target"] = by_target
    _save_report(report)
    logging.info(
        "State label correction: %s rows updated (%s)",
        corrected,
        by_target,
    )
    return report


def _save_report(report: dict) -> None:
    os.makedirs(config.ML_OUTPUT_DIR, exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(correct_labeled_csv())


if __name__ == "__main__":
    main()
