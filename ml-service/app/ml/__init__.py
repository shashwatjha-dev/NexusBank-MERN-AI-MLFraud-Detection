"""ML sub-package.

The three modules below form a tight cooperation:

    feature_engineering  →  canonical feature order (single source of truth)
    model_registry       →  filesystem I/O for artifacts + metadata + versioning
    predictor            →  in-memory inference wrapper wired into FastAPI state

Nothing here trains the model — training lives in `training/`.
"""

from app.ml.feature_engineering import (
    FEATURE_ORDER,
    CONTINUOUS_FEATURES,
    to_feature_frame,
)
from app.ml.model_registry import (
    ModelArtifact,
    load_latest,
    save_artifact,
)
from app.ml.predictor import Predictor


__all__ = [
    "FEATURE_ORDER",
    "CONTINUOUS_FEATURES",
    "to_feature_frame",
    "ModelArtifact",
    "load_latest",
    "save_artifact",
    "Predictor",
]
