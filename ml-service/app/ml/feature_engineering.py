"""
Canonical feature order and preprocessing helpers.

This file is the *single source of truth* for the feature vector that flows
between the Node.js `mlClient` payload, the training pipeline, and the served
model. Column order MUST match the Node client field order exactly — a change
here without a corresponding change on the Node side (or in a retraining run)
would silently swap features and destroy predictions.

The training pipeline consumes pandas DataFrames with these exact column
names so scikit-learn's ColumnTransformer can address them by name. The
prediction path uses the same DataFrame shape (1 row), which avoids
scikit-learn's "X does not have valid feature names" warning at inference.
"""

from __future__ import annotations

from typing import List

import pandas as pd

from app.schemas import PredictionRequest


# The exact order and names that appear in the Node.js mlClient payload.
FEATURE_ORDER: List[str] = [
    "amount",
    "amount_to_average_ratio",
    "beneficiary_age_days",
    "is_new_beneficiary",
    "is_new_device",
    "hour_of_day",
    "transactions_last_5_minutes",
    "previous_suspicious_count",
    "behavioural_deviation",
]

# Features that benefit from standard scaling in the pipeline. The remaining
# features are integer/binary and are passed through unchanged.
CONTINUOUS_FEATURES: List[str] = [
    "amount",
    "amount_to_average_ratio",
    "behavioural_deviation",
]

# Features passed through the ColumnTransformer without scaling.
PASSTHROUGH_FEATURES: List[str] = [
    "beneficiary_age_days",
    "is_new_beneficiary",
    "is_new_device",
    "hour_of_day",
    "transactions_last_5_minutes",
    "previous_suspicious_count",
]


def to_feature_frame(request: PredictionRequest) -> pd.DataFrame:
    """Convert a validated PredictionRequest to a 1-row pandas DataFrame
    whose columns match FEATURE_ORDER exactly.

    Any drift between the schema and this file will be caught immediately by
    the unit test that iterates FEATURE_ORDER and requires each name to exist
    on the schema.
    """
    payload = request.model_dump()
    row = {name: payload[name] for name in FEATURE_ORDER}
    return pd.DataFrame([row], columns=FEATURE_ORDER)