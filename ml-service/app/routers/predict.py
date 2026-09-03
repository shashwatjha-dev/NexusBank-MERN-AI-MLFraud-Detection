"""
POST /predict — single-transaction fraud prediction.

Consumed by the Node.js `mlClient` (Phase 2, Batch 3). The response schema and
field names are frozen by `app/schemas.py:PredictionResponse` — do not change
them without updating the Node client.

Request headers echoed back on the response:
  - x-request-id      → correlation with the Node backend request log
  - x-transaction-id  → correlation with the Transaction / FraudLog documents
"""

from __future__ import annotations

from fastapi import APIRouter, Request, Response

from app.config import get_settings
from app.errors import ServiceError
from app.logging_config import get_logger
from app.schemas import PredictionRequest, PredictionResponse


router = APIRouter(tags=["predict"])
logger = get_logger(__name__)


@router.post(
    "/predict",
    response_model=PredictionResponse,
    responses={
        200: {"description": "Prediction produced by the loaded model."},
        422: {"description": "Invalid or malformed feature payload."},
        503: {"description": "Model is not loaded. Train it and reload the service."},
    },
)
def predict(payload: PredictionRequest, request: Request, response: Response) -> PredictionResponse:
    settings = get_settings()
    predictor = request.app.state.predictor

    request_id = request.headers.get("x-request-id")
    transaction_id = request.headers.get("x-transaction-id")

    if not predictor.is_ready:
        # Raise instead of returning — the centralized handler wraps this in
        # the uniform error envelope and returns 503. No fake probability is
        # ever synthesised.
        raise ServiceError(
            message="ML model is not loaded. Run `python -m training.train` first.",
            code="MODEL_UNAVAILABLE",
            status_code=503,
        )

    result = predictor.predict_one(payload, threshold=settings.prediction_threshold)

    logger.info(
        "PREDICTION_MADE",
        extra={
            "request_id": request_id,
            "transaction_id": transaction_id,
            "model_version": result["model_version"],
            "fraud_probability": round(result["fraud_probability"], 4),
            "prediction": result["prediction"],
        },
    )

    # Echo correlation headers so downstream logs on both sides link up.
    if request_id:
        response.headers["x-request-id"] = request_id
    if transaction_id:
        response.headers["x-transaction-id"] = transaction_id

    return PredictionResponse(
        fraud_probability=result["fraud_probability"],
        prediction=result["prediction"],
        model_version=result["model_version"],
        request_id=request_id,
        transaction_id=transaction_id,
    )