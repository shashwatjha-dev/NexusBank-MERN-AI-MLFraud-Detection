"""
Pydantic request/response contract.

This file is the single source of truth for the wire format between the Node.js
`mlClient` and this service. Do not change field names, ranges, or types
without also updating `backend/services/fraud/mlClient.js`.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Shared Pydantic configuration
# ---------------------------------------------------------------------------
#
# Pydantic v2 treats names beginning with "model_" as protected by default.
# This service intentionally uses fields such as:
#
#   model_version
#   model_loaded
#
# because they describe the ML model itself.
#
# Disabling protected namespaces removes the harmless startup warnings without
# changing the API field names or behaviour.
#

MODEL_SAFE_CONFIG = ConfigDict(
    extra="forbid",
    protected_namespaces=(),
)


# --- /predict ---------------------------------------------------------------

class PredictionRequest(BaseModel):
    """Single transaction feature vector.

    Field order and names must match the Node.js `mlClient` payload exactly.
    """

    model_config = MODEL_SAFE_CONFIG

    amount: float = Field(
        ge=0.0,
        description="Transaction amount in rupees (integer paise / 100 on the caller side).",
    )

    amount_to_average_ratio: float = Field(
        ge=0.0,
        description="Current amount / user's historical average. 1.0 = same as average.",
    )

    beneficiary_age_days: float = Field(
        ge=0.0,
        description="How many days since the beneficiary was added to the user's list.",
    )

    is_new_beneficiary: Literal[0, 1] = Field(
        description="1 if the beneficiary is not yet trusted.",
    )

    is_new_device: Literal[0, 1] = Field(
        description="1 if the device has not been seen for this user before.",
    )

    hour_of_day: int = Field(
        ge=0,
        le=23,
        description="Transaction hour in 24-hour format.",
    )

    transactions_last_5_minutes: int = Field(
        ge=0,
        description="Number of completed transactions in the last 5 minutes.",
    )

    previous_suspicious_count: int = Field(
        ge=0,
        description="Number of prior FraudLog records for the user.",
    )

    behavioural_deviation: float = Field(
        description="Signed percentage deviation from the user's average amount.",
    )


class PredictionResponse(BaseModel):
    """Response body for a successful /predict call."""

    model_config = MODEL_SAFE_CONFIG

    fraud_probability: float = Field(
        ge=0.0,
        le=1.0,
        description="Predicted probability that the transaction is fraudulent.",
    )

    prediction: Literal["suspicious", "normal"] = Field(
        description="Threshold-based label. Threshold is configurable via env.",
    )

    model_version: str = Field(
        min_length=1,
        description="Identifier of the model that produced this prediction.",
    )

    request_id: Optional[str] = Field(
        default=None,
        description="Echo of x-request-id.",
    )

    transaction_id: Optional[str] = Field(
        default=None,
        description="Echo of x-transaction-id.",
    )


# --- /health ----------------------------------------------------------------

class HealthResponse(BaseModel):
    """Response body for GET /health."""

    model_config = MODEL_SAFE_CONFIG

    status: Literal["ok", "degraded"]

    service: Literal[
        "nexusbank-ml-service"
    ] = "nexusbank-ml-service"

    model_loaded: bool

    model_version: Optional[str] = None


# --- errors -----------------------------------------------------------------

class ErrorBody(BaseModel):
    """Uniform error envelope. Mirrors the Node.js backend shape so a shared
    log aggregator can render both services consistently."""

    model_config = MODEL_SAFE_CONFIG

    code: str

    message: str


class ErrorResponse(BaseModel):
    model_config = MODEL_SAFE_CONFIG

    success: Literal[False] = False

    error: ErrorBody

    request_id: Optional[str] = None