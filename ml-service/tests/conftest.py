"""
Shared pytest fixtures.

Design goals:
  - **Fast**: the full 50 000-row training run takes seconds, which is too
    slow for a tight test loop. We fit a *tiny* deterministic pipeline on
    2 000 rows for the model-behaviour and endpoint tests.
  - **Deterministic**: every fixture seeds NumPy and passes `random_state`
    to sklearn, so two CI runs on the same machine produce identical
    predictions.
  - **Isolated**: fixtures build fresh FastAPI apps via `create_app()` and
    inject the predictor directly with `attach_artifact()`. Nothing here
    touches the real `models/` directory on disk.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app import create_app
from app.ml.feature_engineering import (
    CONTINUOUS_FEATURES,
    FEATURE_ORDER,
    PASSTHROUGH_FEATURES,
)
from app.ml.model_registry import ModelArtifact
from training.dataset import DatasetSpec, generate_dataset, split_features_labels


@pytest.fixture(scope="session")
def tiny_pipeline() -> Pipeline:
    """A small, deterministic sklearn Pipeline trained on 2 000 rows.

    Uses the same architecture as production (`ColumnTransformer +
    GradientBoostingClassifier`) so tests exercise the real inference path,
    not a mock.
    """
    np.random.seed(42)
    dataset = generate_dataset(DatasetSpec(size=2_000, fraud_rate=0.15, seed=42))
    X, y = split_features_labels(dataset)
    X_train, _, y_train, _ = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("continuous", StandardScaler(), CONTINUOUS_FEATURES),
            ("passthrough", "passthrough", PASSTHROUGH_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    pipeline = Pipeline(steps=[
        ("preprocess", preprocessor),
        ("classifier", GradientBoostingClassifier(
            random_state=42, n_estimators=60, max_depth=3
        )),
    ])
    pipeline.fit(X_train, y_train)
    return pipeline


@pytest.fixture()
def tiny_artifact(tiny_pipeline: Pipeline, tmp_path: Path) -> ModelArtifact:
    """Wraps `tiny_pipeline` in a ModelArtifact with a plausible metadata
    body so predictor code paths that read `metadata` do not blow up."""
    metadata: Dict[str, Any] = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "seed": 42,
        "dataset": {"size": 2_000, "fraud_rate": 0.15, "checksum_sha256": "test"},
        "environment": {"python": "test", "numpy": "test", "sklearn": "test"},
        "pipeline": {"classifier": "GradientBoostingClassifier"},
        "prediction_threshold": 0.5,
        "metrics": {},
        "model_version": "model-v1-test",
        "feature_order": FEATURE_ORDER,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    return ModelArtifact(
        version="model-v1-test",
        pipeline=tiny_pipeline,
        metadata=metadata,
        path=tmp_path / "model-v1-test.joblib",
    )


@pytest.fixture()
def app_with_model(tiny_artifact: ModelArtifact):
    """FastAPI app with the tiny pipeline injected."""
    app = create_app()
    app.state.predictor.attach_artifact(tiny_artifact)
    return app


@pytest.fixture()
def app_without_model():
    """Fresh FastAPI app where the predictor has no artifact loaded."""
    app = create_app()
    # Reset any artifact the lifespan might have loaded from `./models/`.
    app.state.predictor._artifact = None
    return app


@pytest.fixture()
def client_with_model(app_with_model) -> TestClient:
    with TestClient(app_with_model) as client:
        yield client


@pytest.fixture()
def client_without_model(app_without_model) -> TestClient:
    with TestClient(app_without_model) as client:
        yield client


# --- Canonical payloads used by multiple test files ------------------------

SUSPICIOUS_PAYLOAD: Dict[str, Any] = {
    "amount": 75_000.0,
    "amount_to_average_ratio": 10.0,
    "beneficiary_age_days": 0.0,
    "is_new_beneficiary": 1,
    "is_new_device": 1,
    "hour_of_day": 3,
    "transactions_last_5_minutes": 6,
    "previous_suspicious_count": 2,
    "behavioural_deviation": 280.0,
}

NORMAL_PAYLOAD: Dict[str, Any] = {
    "amount": 2_500.0,
    "amount_to_average_ratio": 1.05,
    "beneficiary_age_days": 210.0,
    "is_new_beneficiary": 0,
    "is_new_device": 0,
    "hour_of_day": 13,
    "transactions_last_5_minutes": 0,
    "previous_suspicious_count": 0,
    "behavioural_deviation": 5.0,
}


@pytest.fixture()
def suspicious_payload() -> Dict[str, Any]:
    return dict(SUSPICIOUS_PAYLOAD)


@pytest.fixture()
def normal_payload() -> Dict[str, Any]:
    return dict(NORMAL_PAYLOAD)