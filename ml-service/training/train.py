"""
NexusBank fraud model — training pipeline.

Run:
    python -m training.train

What it does:
    1. Reads settings from `.env` (see `app/config.py`).
    2. Seeds Python's `random`, NumPy, and scikit-learn.
    3. Generates 50 000 deterministic synthetic transactions (default).
    4. Stratified 80/20 train/test split (seed 42).
    5. Builds the approved pipeline:
           ColumnTransformer
               ├── StandardScaler on CONTINUOUS_FEATURES
               └── passthrough    on PASSTHROUGH_FEATURES
           → GradientBoostingClassifier(random_state=42)
    6. Fits, evaluates on the held-out split.
    7. Persists the versioned artifact + metadata sidecar via
       `app.ml.model_registry.save_artifact`.
    8. Prints a one-line JSON summary so the training log is grep-able.

Nothing about the artifact or its metadata is hardcoded — every field is
either computed from the fit / evaluation or read from environment config.
"""

from __future__ import annotations

import json
import platform
import random
import sys
from datetime import datetime, timezone
from typing import Any, Dict

import numpy as np
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import get_settings
from app.logging_config import configure_logging, get_logger
from app.ml.feature_engineering import (
    CONTINUOUS_FEATURES,
    FEATURE_ORDER,
    PASSTHROUGH_FEATURES,
)
from app.ml.model_registry import save_artifact
from training.dataset import (
    DatasetSpec,
    dataset_checksum,
    generate_dataset,
    split_features_labels,
)
from training.evaluate import evaluate_binary


def _seed_everything(seed: int) -> None:
    """Seed the sources of randomness that our pipeline touches.

    scikit-learn respects the `random_state` we pass to the estimator and to
    `train_test_split`, so we do not need to seed a scikit-learn-wide global.
    """
    random.seed(seed)
    np.random.seed(seed)


def _build_pipeline(seed: int) -> Pipeline:
    """Build the approved sklearn Pipeline.

    The ColumnTransformer references columns by name, so we hand it a pandas
    DataFrame (as opposed to a raw numpy array). This keeps the training and
    inference paths in agreement on column semantics.
    """
    preprocessor = ColumnTransformer(
        transformers=[
            ("continuous", StandardScaler(), CONTINUOUS_FEATURES),
            ("passthrough", "passthrough", PASSTHROUGH_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    classifier = GradientBoostingClassifier(random_state=seed)

    return Pipeline(steps=[
        ("preprocess", preprocessor),
        ("classifier", classifier),
    ])


def _build_metadata(
    *,
    seed: int,
    dataset_size: int,
    fraud_rate: float,
    metrics: Dict[str, Any],
    checksum: str,
    trained_at: datetime,
    threshold: float,
) -> Dict[str, Any]:
    """Assemble the metadata sidecar dict.

    The model_registry adds `model_version`, `feature_order`, and `saved_at`
    when it persists the artifact — do not duplicate those keys here.
    """
    return {
        "trained_at": trained_at.isoformat(),
        "seed": int(seed),
        "dataset": {
            "size": int(dataset_size),
            "fraud_rate": float(fraud_rate),
            "checksum_sha256": checksum,
        },
        "environment": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "sklearn": sklearn.__version__,
            "platform": platform.platform(),
        },
        "pipeline": {
            "preprocessor": {
                "continuous_scaled": list(CONTINUOUS_FEATURES),
                "passthrough": list(PASSTHROUGH_FEATURES),
            },
            "classifier": "sklearn.ensemble.GradientBoostingClassifier",
            "classifier_params": {"random_state": int(seed)},
        },
        "prediction_threshold": float(threshold),
        "metrics": metrics,
    }


def run() -> Dict[str, Any]:
    """Execute the full training pipeline. Returns the summary dict."""
    settings = get_settings()
    configure_logging(settings)
    logger = get_logger("training.train")

    seed = settings.train_random_seed
    _seed_everything(seed)

    logger.info(
        "TRAINING_START",
        extra={
            "seed": seed,
            "dataset_size": settings.train_dataset_size,
            "fraud_rate": settings.train_fraud_rate,
        },
    )

    # 1. Dataset ----------------------------------------------------------
    spec = DatasetSpec(
        size=settings.train_dataset_size,
        fraud_rate=settings.train_fraud_rate,
        seed=seed,
    )
    dataset = generate_dataset(spec)
    checksum = dataset_checksum(dataset)
    logger.info(
        "DATASET_GENERATED",
        extra={
            "rows": len(dataset),
            "positives": int(dataset["label"].sum()),
            "checksum_sha256": checksum,
        },
    )

    # 2. Split ------------------------------------------------------------
    X, y = split_features_labels(dataset)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=settings.train_test_split,
        stratify=y,
        random_state=seed,
    )
    logger.info(
        "SPLIT_READY",
        extra={"train_rows": len(X_train), "test_rows": len(X_test)},
    )

    # 3. Fit --------------------------------------------------------------
    pipeline = _build_pipeline(seed=seed)
    pipeline.fit(X_train, y_train)
    logger.info("PIPELINE_FIT_COMPLETE")

    # 4. Evaluate ---------------------------------------------------------
    metrics = evaluate_binary(pipeline, X_test, y_test, threshold=settings.prediction_threshold)
    logger.info(
        "EVALUATION_COMPLETE",
        extra={
            "roc_auc": round(metrics["roc_auc"], 4),
            "pr_auc": round(metrics["pr_auc"], 4),
            "f1": round(metrics["f1"], 4),
            "precision": round(metrics["precision"], 4),
            "recall": round(metrics["recall"], 4),
        },
    )

    # 5. Persist ----------------------------------------------------------
    trained_at = datetime.now(timezone.utc)
    metadata = _build_metadata(
        seed=seed,
        dataset_size=len(dataset),
        fraud_rate=settings.train_fraud_rate,
        metrics=metrics,
        checksum=checksum,
        trained_at=trained_at,
        threshold=settings.prediction_threshold,
    )
    artifact = save_artifact(
        pipeline=pipeline,
        model_dir=settings.model_dir,
        metadata=metadata,
    )
    logger.info(
        "ARTIFACT_SAVED",
        extra={"model_version": artifact.version, "path": str(artifact.path)},
    )

    summary = {
        "model_version": artifact.version,
        "artifact_path": str(artifact.path),
        "metadata_path": str(artifact.path.with_suffix("").with_suffix(".metadata.json")),
        "rows": int(len(dataset)),
        "positives": int(dataset["label"].sum()),
        "dataset_checksum": checksum,
        "metrics": {
            "roc_auc": metrics["roc_auc"],
            "pr_auc": metrics["pr_auc"],
            "f1": metrics["f1"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
        },
    }
    # One-line JSON summary. Handy for CI + humans grepping the log.
    print(json.dumps({"event": "TRAINING_SUMMARY", **summary}, default=str))
    return summary


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:  # pragma: no cover
        # Print a machine-readable failure marker for wrappers/CI.
        print(json.dumps({
            "event": "TRAINING_FAILED",
            "message": str(exc),
            "type": exc.__class__.__name__,
        }))
        sys.exit(1)