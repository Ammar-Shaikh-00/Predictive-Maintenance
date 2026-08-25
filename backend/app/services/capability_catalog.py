"""Runtime loader for Docs/capability_component_catalog.json — single source of truth.

AI/ML edits the JSON. Backend reloads on mtime change (seed and live probes use this file).
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_CACHE: Dict[str, Any] = {"path": None, "mtime": None, "data": None}

CATALOG_FILENAME = "capability_component_catalog.json"


def catalog_search_paths() -> List[Path]:
    env = (os.getenv("CAPABILITY_CATALOG_PATH") or "").strip()
    if not env:
        try:
            from app.core.config import get_settings

            env = str(getattr(get_settings(), "capability_catalog_path", "") or "").strip()
        except Exception:
            env = ""
    here = Path(__file__).resolve()
    # services -> app -> backend -> repo
    repo_root = here.parents[3]
    backend_root = here.parents[2]
    paths: List[Path] = []
    if env:
        paths.append(Path(env))
    paths.extend(
        [
            Path("/app/catalogs") / CATALOG_FILENAME,
            repo_root / "Docs" / CATALOG_FILENAME,
            backend_root / "catalogs" / CATALOG_FILENAME,
            backend_root.parent / "Docs" / CATALOG_FILENAME,
        ]
    )
    # de-dupe while keeping order
    seen = set()
    unique: List[Path] = []
    for p in paths:
        key = str(p)
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)
    return unique


def resolve_catalog_path() -> Optional[Path]:
    for path in catalog_search_paths():
        try:
            if path.is_file():
                return path
        except OSError:
            continue
    return None


def clear_catalog_cache() -> None:
    _CACHE["path"] = None
    _CACHE["mtime"] = None
    _CACHE["data"] = None


def load_capability_catalog(*, force: bool = False) -> Dict[str, Any]:
    """Load catalog JSON. Reloads when the file mtime changes so AI/ML edits apply."""
    path = resolve_catalog_path()
    if path is None:
        raise FileNotFoundError(
            "capability_component_catalog.json not found. "
            "Set CAPABILITY_CATALOG_PATH or keep Docs/capability_component_catalog.json."
        )
    mtime = path.stat().st_mtime
    if (
        not force
        and _CACHE.get("data") is not None
        and _CACHE.get("path") == str(path)
        and _CACHE.get("mtime") == mtime
    ):
        return _CACHE["data"]

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or not isinstance(data.get("components"), list):
        raise ValueError("Catalog JSON must contain a components array")
    data["_loaded_from"] = str(path)
    _CACHE["path"] = str(path)
    _CACHE["mtime"] = mtime
    _CACHE["data"] = data
    return data


def catalog_unlock_index(catalog: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    features = catalog.get("unlock_features") or []
    return {
        str(row.get("feature_key")): row
        for row in features
        if isinstance(row, dict) and row.get("feature_key")
    }


def digitalization_weight_sum(catalog: Dict[str, Any]) -> float:
    total = 0.0
    for row in catalog.get("components") or []:
        if row.get("contributes_to_digitalization") and row.get("enabled_in_product", True):
            total += float(row.get("weight") or 0)
    return total


def catalog_meta(catalog: Dict[str, Any]) -> Tuple[str, Optional[str]]:
    return (
        str(catalog.get("spec_version") or "0"),
        catalog.get("updated_at"),
    )
