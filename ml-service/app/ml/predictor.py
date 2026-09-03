"""
In-memory predictor wired into the FastAPI application state.

The Predictor is intentionally stateful: it owns a reference to the loaded
sklearn Pipeline and refuses to run inference if no model is loaded.

Zero fabrication: if no model is available, `predict_one` raises
`ServiceError("Model not loaded.", "MODEL_UNAVAILABLE", 503)`. It never
returns a synthetic probability. The Node.js `mlClient` interprets a 503 as
`serviceStatus: UNAVAILABLE` and the Node fraud engine already has a safety
fallback for that case (see Phase 2 Batch 3).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from app.errors import ServiceError
from app.logging_config import get_logger
from app.ml.feature_engineering import to_feature_frame
from app.ml.model_registry import ModelArtifact, load_latest
from app.schemas import PredictionRequest


logger = get_logger(__name__)


class Predictor:
    """Lightweight facade around the loaded sklearn Pipeline."""

    def __init__(self, model_dir: Path, preferred_version: Optional[str] = None):
        self._model_dir = Path(model_dir)
        self._preferred_version = preferred_version
        self._artifact: Optional[ModelArtifact] = None

    # ---- lifecycle -------------------------------------------------------

    def load_latest_if_available(self) -> bool:
        """Attempt to load the latest valid model. Returns True on success.

        Never raises: a missing / corrupt model dir is a normal state at
        service boot before the first `python -m training.train` run.
        """
        try:
            artifact = load_latest(self._model_dir, self._preferred_version)
        except Exception:  # pragma: no cover — I/O failures are logged, not thrown.
            logger.exception("MODEL_LOAD_FAILED", extra={"model_dir": str(self._model_dir)})
            self._artifact = None
            return False

        self._artifact = artifact
        return artifact is not None

    def attach_artifact(self, artifact: ModelArtifact) -> None:
        """Direct-injection hook used by tests (see `tests/conftest.py`)."""
        self._artifact = artifact

    # ---- introspection ---------------------------------------------------

    @property
    def is_ready(self) -> bool:
        return self._artifact is not None

    @property
    def model_version(self) -> Optional[str]:
        return self._artifact.version if self._artifact else None

    @property
    def model_path(self) -> Optional[Path]:
        return self._artifact.path if self._artifact else None

    @property
    def metadata(self) -> Optional[Dict[str, Any]]:
        return self._artifact.metadata if self._artifact else None

    # ---- inference -------------------------------------------------------

    def predict_one(self, request: PredictionRequest, threshold: float) -> Dict[str, Any]:
        """Score a single transaction feature vector.

        Returns a dict with the keys `fraud_probability`, `prediction`, and
        `model_version` — matching the Batch A `PredictionResponse` contract.

        Raises `ServiceError(MODEL_UNAVAILABLE, 503)` if no model is loaded,
        or `ServiceError(MODEL_INFERENCE_FAILED, 500)` if the underlying
        pipeline raises. In both cases the Node.js caller falls back to its
        safe path — no fake probability is ever synthesised here.
        """
        if not self.is_ready or self._artifact is None:
            raise ServiceError(
                message="ML model is not loaded. Run `python -m training.train` first.",
                code="MODEL_UNAVAILABLE",
                status_code=503,
            )

        frame = to_feature_frame(request)

        try:
            probabilities = self._artifact.pipeline.predict_proba(frame)
        except Exception as exc:
            logger.exception(
                "MODEL_INFERENCE_FAILED",
                extra={"model_version": self._artifact.version},
            )
            raise ServiceError(
                message="Model inference failed.",
                code="MODEL_INFERENCE_FAILED",
                status_code=500,
            ) from exc

        # scikit-learn `predict_proba` returns shape (n_samples, n_classes).
        # We trained with `1 = fraud`; guard against a model that lost that
        # convention rather than silently returning the wrong column.
        classes = getattr(self._artifact.pipeline, "classes_", None)
        if classes is None:
            fraud_index = probabilities.shape[1] - 1
        else:
            try:
                fraud_index = int(list(classes).index(1))
            except ValueError:
                fraud_index = probabilities.shape[1] - 1

        probability = float(probabilities[0, fraud_index])
        # Clamp for safety — scikit-learn is well-behaved but a downstream
        # transformer could in principle produce a tiny out-of-range float.
        probability = max(0.0, min(1.0, probability))
        prediction = "suspicious" if probability >= threshold else "normal"

        return {
            "fraud_probability": probability,
            "prediction": prediction,
            "model_version": self._artifact.version,
        }