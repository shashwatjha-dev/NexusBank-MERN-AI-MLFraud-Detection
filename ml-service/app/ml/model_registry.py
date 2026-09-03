"""
On-disk model artifact registry.

Layout inside `MODEL_DIR`:

    model-v1-2026-02-15.joblib          # the sklearn Pipeline
    model-v1-2026-02-15.metadata.json   # sidecar with training provenance

Rules:
  - `save_artifact` writes both files atomically (temp → rename).
  - `load_latest` picks the artifact with the most recent metadata `trained_at`
    (falling back to filesystem mtime) and refuses artifacts whose metadata
    disagrees with the filename or whose feature order does not match the
    current canonical `FEATURE_ORDER`.
  - No metadata → the artifact is skipped. We never load a `.joblib` we can't
    describe.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib

from app.ml.feature_engineering import FEATURE_ORDER


MODEL_FILENAME_RE = re.compile(r"^(?P<version>model-v\d+-\d{4}-\d{2}-\d{2})\.joblib$")


@dataclass
class ModelArtifact:
    """A fully-loaded model artifact plus its metadata."""

    version: str
    pipeline: Any
    metadata: Dict[str, Any]
    path: Path


@dataclass
class _CandidateArtifact:
    version: str
    path: Path
    metadata_path: Path
    metadata: Dict[str, Any] = field(default_factory=dict)


def _make_version(prefix: str = "model-v1") -> str:
    """Build a filesystem-safe version string, e.g. `model-v1-2026-02-15`."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"{prefix}-{today}"


def _resolve_model_dir(model_dir: Path) -> Path:
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    return model_dir


def _atomic_write(path: Path, writer) -> None:
    """Write to a temp file in the same directory, then rename onto `path`.
    This avoids partially-written artifacts if the process is killed mid-write.
    """
    directory = path.parent
    with tempfile.NamedTemporaryFile(
        mode="wb", dir=directory, prefix=".tmp-", suffix=path.suffix, delete=False
    ) as handle:
        tmp_name = Path(handle.name)
        writer(handle)
    os.replace(tmp_name, path)


def _list_candidates(model_dir: Path) -> List[_CandidateArtifact]:
    candidates: List[_CandidateArtifact] = []
    if not model_dir.exists():
        return candidates

    for entry in model_dir.iterdir():
        if not entry.is_file():
            continue
        match = MODEL_FILENAME_RE.match(entry.name)
        if not match:
            continue
        version = match.group("version")
        metadata_path = entry.with_suffix("").with_suffix(".metadata.json")
        # entry.with_suffix("") strips ".joblib"; we want <version>.metadata.json
        metadata_path = entry.parent / f"{version}.metadata.json"
        if not metadata_path.exists():
            continue
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        candidates.append(
            _CandidateArtifact(
                version=version,
                path=entry,
                metadata_path=metadata_path,
                metadata=metadata,
            )
        )
    return candidates


def _validate_metadata(candidate: _CandidateArtifact) -> bool:
    md = candidate.metadata
    if md.get("model_version") != candidate.version:
        return False
    feature_order = md.get("feature_order")
    if not isinstance(feature_order, list) or feature_order != FEATURE_ORDER:
        return False
    return True


def _sort_key(candidate: _CandidateArtifact):
    trained_at = candidate.metadata.get("trained_at")
    try:
        if isinstance(trained_at, str):
            return datetime.fromisoformat(trained_at.replace("Z", "+00:00"))
    except ValueError:
        pass
    return datetime.fromtimestamp(candidate.path.stat().st_mtime, tz=timezone.utc)


def load_latest(model_dir: Path, preferred_version: Optional[str] = None) -> Optional[ModelArtifact]:
    """Load the most recent valid artifact. Returns None if none is usable.

    If `preferred_version` is provided (from the `MODEL_VERSION` env variable),
    we try to load exactly that version. If it is missing or invalid, we log
    and fall back to the newest valid artifact.
    """
    model_dir = _resolve_model_dir(model_dir)
    candidates = [c for c in _list_candidates(model_dir) if _validate_metadata(c)]

    if not candidates:
        return None

    chosen: Optional[_CandidateArtifact] = None
    if preferred_version:
        chosen = next((c for c in candidates if c.version == preferred_version), None)

    if chosen is None:
        candidates.sort(key=_sort_key, reverse=True)
        chosen = candidates[0]

    pipeline = joblib.load(chosen.path)
    return ModelArtifact(
        version=chosen.version,
        pipeline=pipeline,
        metadata=chosen.metadata,
        path=chosen.path,
    )


def save_artifact(pipeline, model_dir: Path, metadata: Dict[str, Any], version: Optional[str] = None) -> ModelArtifact:
    """Persist a trained pipeline plus its metadata sidecar.

    `metadata` must include (at minimum): trained_at, seed, dataset_size,
    fraud_rate, python_version, sklearn_version, metrics.

    `feature_order` and `model_version` are added/overwritten here so the two
    can never disagree with the filename or the canonical FEATURE_ORDER.
    """
    model_dir = _resolve_model_dir(model_dir)
    version = version or _make_version()

    joblib_path = model_dir / f"{version}.joblib"
    metadata_path = model_dir / f"{version}.metadata.json"

    full_metadata = {
        **metadata,
        "model_version": version,
        "feature_order": FEATURE_ORDER,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }

    def _dump_joblib(handle) -> None:
        joblib.dump(pipeline, handle)

    def _dump_metadata(handle) -> None:
        handle.write(json.dumps(full_metadata, indent=2, default=str).encode("utf-8"))

    _atomic_write(joblib_path, _dump_joblib)
    _atomic_write(metadata_path, _dump_metadata)

    return ModelArtifact(
        version=version,
        pipeline=pipeline,
        metadata=full_metadata,
        path=joblib_path,
    )