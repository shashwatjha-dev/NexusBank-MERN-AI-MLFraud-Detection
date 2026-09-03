"""
FastAPI endpoint tests using the built-in TestClient.

Covers:
  - happy path (200) with a full, valid payload
  - validation failures (422) for missing/invalid/extra fields
  - request-id / transaction-id correlation on the response
  - MODEL_UNAVAILABLE → 503 when no artifact is loaded
  - /health status transitions
"""

from __future__ import annotations


# ---- /health --------------------------------------------------------------

def test_health_reports_ok_when_model_loaded(client_with_model):
    response = client_with_model.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "nexusbank-ml-service"
    assert body["model_loaded"] is True
    assert body["model_version"] == "model-v1-test"


def test_health_reports_degraded_when_model_missing(client_without_model):
    response = client_without_model.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["model_loaded"] is False
    assert body["model_version"] is None


# ---- /predict happy path --------------------------------------------------

def test_predict_returns_expected_schema(client_with_model, suspicious_payload):
    response = client_with_model.post("/predict", json=suspicious_payload)
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "fraud_probability",
        "prediction",
        "model_version",
        "request_id",
        "transaction_id",
    }
    assert 0.0 <= body["fraud_probability"] <= 1.0
    assert body["prediction"] in {"suspicious", "normal"}
    assert body["model_version"] == "model-v1-test"


def test_predict_suspicious_labelled_suspicious(client_with_model, suspicious_payload):
    body = client_with_model.post("/predict", json=suspicious_payload).json()
    assert body["prediction"] == "suspicious"
    assert body["fraud_probability"] > 0.5


def test_predict_normal_labelled_normal(client_with_model, normal_payload):
    body = client_with_model.post("/predict", json=normal_payload).json()
    assert body["prediction"] == "normal"
    assert body["fraud_probability"] < 0.5


# ---- correlation headers --------------------------------------------------

def test_predict_echoes_request_and_transaction_ids(client_with_model, normal_payload):
    response = client_with_model.post(
        "/predict",
        json=normal_payload,
        headers={
            "x-request-id": "req-abc-123",
            "x-transaction-id": "txn-xyz-789",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("x-request-id") == "req-abc-123"
    assert response.headers.get("x-transaction-id") == "txn-xyz-789"

    body = response.json()
    assert body["request_id"] == "req-abc-123"
    assert body["transaction_id"] == "txn-xyz-789"


def test_predict_without_correlation_ids_still_succeeds(client_with_model, normal_payload):
    response = client_with_model.post("/predict", json=normal_payload)
    assert response.status_code == 200
    body = response.json()
    assert body["request_id"] is None
    assert body["transaction_id"] is None


# ---- validation ---------------------------------------------------------

def test_predict_rejects_missing_field(client_with_model, normal_payload):
    payload = dict(normal_payload)
    del payload["amount"]
    response = client_with_model.post("/predict", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "amount" in body["error"]["message"]


def test_predict_rejects_extra_field(client_with_model, normal_payload):
    payload = dict(normal_payload)
    payload["surprise"] = "extra"
    response = client_with_model.post("/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_predict_rejects_out_of_range_hour(client_with_model, normal_payload):
    payload = dict(normal_payload)
    payload["hour_of_day"] = 25
    response = client_with_model.post("/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_predict_rejects_non_binary_flag(client_with_model, normal_payload):
    payload = dict(normal_payload)
    payload["is_new_beneficiary"] = 2
    response = client_with_model.post("/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_predict_rejects_negative_amount(client_with_model, normal_payload):
    payload = dict(normal_payload)
    payload["amount"] = -10.0
    response = client_with_model.post("/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


# ---- MODEL_UNAVAILABLE ----------------------------------------------------

def test_predict_returns_503_when_model_not_loaded(client_without_model, normal_payload):
    response = client_without_model.post("/predict", json=normal_payload)
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "MODEL_UNAVAILABLE"


def test_predict_503_preserves_uniform_envelope(client_without_model, normal_payload):
    response = client_without_model.post(
        "/predict",
        json=normal_payload,
        headers={"x-request-id": "req-503-check"},
    )
    body = response.json()
    assert body["success"] is False
    assert body["request_id"] == "req-503-check"
    assert "error" in body and "code" in body["error"] and "message" in body["error"]