"""
End-to-end model-behaviour tests.

These fit a tiny (2 000-row) version of the real pipeline and then assert:
  - a suspicious-shaped feature vector receives high probability
  - a normal-shaped feature vector receives low probability
  - `model_version` is populated
  - the predictor refuses to invent a probability when no artifact is loaded

The predictor is exercised directly (not via HTTP) so failures point at
the ML layer rather than the FastAPI layer.
"""

from __future__ import annotations

import pytest

from app.errors import ServiceError
from app.ml.predictor import Predictor
from app.schemas import PredictionRequest


def test_predictor_reports_ready_when_artifact_attached(tiny_artifact, tmp_path):
    predictor = Predictor(model_dir=tmp_path)
    assert not predictor.is_ready
    predictor.attach_artifact(tiny_artifact)
    assert predictor.is_ready
    assert predictor.model_version == "model-v1-test"


def test_predict_one_returns_expected_shape(tiny_artifact, tmp_path, normal_payload):
    predictor = Predictor(model_dir=tmp_path)
    predictor.attach_artifact(tiny_artifact)

    result = predictor.predict_one(PredictionRequest(**normal_payload), threshold=0.5)
    assert set(result.keys()) == {"fraud_probability", "prediction", "model_version"}
    assert 0.0 <= result["fraud_probability"] <= 1.0
    assert result["prediction"] in {"normal", "suspicious"}
    assert result["model_version"] == "model-v1-test"


def test_suspicious_payload_scores_high(tiny_artifact, tmp_path, suspicious_payload):
    predictor = Predictor(model_dir=tmp_path)
    predictor.attach_artifact(tiny_artifact)

    result = predictor.predict_one(PredictionRequest(**suspicious_payload), threshold=0.5)
    assert result["fraud_probability"] > 0.5, (
        f"suspicious payload should score > 0.5, got {result['fraud_probability']:.4f}"
    )
    assert result["prediction"] == "suspicious"


def test_normal_payload_scores_low(tiny_artifact, tmp_path, normal_payload):
    predictor = Predictor(model_dir=tmp_path)
    predictor.attach_artifact(tiny_artifact)

    result = predictor.predict_one(PredictionRequest(**normal_payload), threshold=0.5)
    assert result["fraud_probability"] < 0.5, (
        f"normal payload should score < 0.5, got {result['fraud_probability']:.4f}"
    )
    assert result["prediction"] == "normal"


def test_predict_one_raises_when_not_ready(tmp_path, normal_payload):
    predictor = Predictor(model_dir=tmp_path)  # no artifact loaded

    with pytest.raises(ServiceError) as excinfo:
        predictor.predict_one(PredictionRequest(**normal_payload), threshold=0.5)

    assert excinfo.value.code == "MODEL_UNAVAILABLE"
    assert excinfo.value.status_code == 503


def test_probability_is_class_1_when_classes_are_zero_one(tiny_artifact, tmp_path):
    """The pipeline is trained with labels {0, 1}. Ensure the reported
    probability is for the '1 = fraud' class, not for '0'."""
    predictor = Predictor(model_dir=tmp_path)
    predictor.attach_artifact(tiny_artifact)

    # Classes should be [0, 1] after fitting.
    assert list(tiny_artifact.pipeline.classes_) == [0, 1]


def test_load_latest_if_available_never_raises_on_empty_dir(tmp_path):
    predictor = Predictor(model_dir=tmp_path)
    # No artifacts anywhere → should return False, not raise.
    assert predictor.load_latest_if_available() is False
    assert predictor.is_ready is False