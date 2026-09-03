"""
Dataset generator tests.

These lock down the properties that the training run depends on: seed
determinism, expected default size, approximate fraud rate, canonical
feature naming, and sensible feature ranges.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.ml.feature_engineering import FEATURE_ORDER
from training.dataset import (
    LABEL_COLUMN,
    DatasetSpec,
    dataset_checksum,
    generate_dataset,
    split_features_labels,
)


# ---- determinism ----------------------------------------------------------

def test_same_seed_produces_identical_checksum():
    spec = DatasetSpec(size=5_000, fraud_rate=0.08, seed=42)
    first = generate_dataset(spec)
    second = generate_dataset(spec)
    assert dataset_checksum(first) == dataset_checksum(second)


def test_different_seed_produces_different_checksum():
    a = generate_dataset(DatasetSpec(size=5_000, fraud_rate=0.08, seed=42))
    b = generate_dataset(DatasetSpec(size=5_000, fraud_rate=0.08, seed=43))
    assert dataset_checksum(a) != dataset_checksum(b)


def test_dataset_rows_match_requested_size():
    df = generate_dataset(DatasetSpec(size=3_000, fraud_rate=0.08, seed=42))
    assert len(df) == 3_000


def test_default_specification_yields_fifty_thousand_rows():
    # Explicitly assert the approved default so a future refactor cannot
    # quietly change it.
    spec = DatasetSpec()
    assert spec.size == 50_000
    assert spec.fraud_rate == pytest.approx(0.08, rel=0.0)
    assert spec.seed == 42


# ---- fraud rate -----------------------------------------------------------

def test_fraud_rate_is_approximately_target():
    """After label noise, the empirical fraud rate should hover near the
    configured target. We allow ±2 percentage points of drift."""
    df = generate_dataset(DatasetSpec(size=10_000, fraud_rate=0.08, seed=42))
    empirical = df[LABEL_COLUMN].mean()
    assert 0.06 <= empirical <= 0.10, f"unexpected fraud rate: {empirical:.4f}"


# ---- schema ---------------------------------------------------------------

def test_columns_match_feature_order_plus_label():
    df = generate_dataset(DatasetSpec(size=1_000, fraud_rate=0.08, seed=42))
    expected = list(FEATURE_ORDER) + [LABEL_COLUMN]
    assert list(df.columns) == expected


def test_split_features_labels_columns():
    df = generate_dataset(DatasetSpec(size=1_000, fraud_rate=0.08, seed=42))
    X, y = split_features_labels(df)
    assert list(X.columns) == list(FEATURE_ORDER)
    assert y.name == LABEL_COLUMN


# ---- feature ranges -------------------------------------------------------

def test_feature_ranges_are_sensible():
    df = generate_dataset(DatasetSpec(size=5_000, fraud_rate=0.08, seed=42))

    # Binary columns are strictly 0/1
    assert set(df["is_new_beneficiary"].unique()).issubset({0, 1})
    assert set(df["is_new_device"].unique()).issubset({0, 1})

    # Hour of day is a wrapped integer in [0, 23]
    hours = df["hour_of_day"].to_numpy()
    assert hours.min() >= 0
    assert hours.max() <= 23

    # Velocity and prior counts are non-negative integers
    assert (df["transactions_last_5_minutes"] >= 0).all()
    assert (df["previous_suspicious_count"] >= 0).all()

    # Amounts are strictly positive
    assert (df["amount"] > 0).all()

    # Ratios are positive
    assert (df["amount_to_average_ratio"] > 0).all()

    # Beneficiary age is non-negative
    assert (df["beneficiary_age_days"] >= 0).all()

    # Labels are 0/1
    assert set(df[LABEL_COLUMN].unique()).issubset({0, 1})


def test_fraud_rows_are_on_average_more_extreme():
    """Sanity check that the two classes are actually distinguishable —
    otherwise the trained model is meaningless."""
    df = generate_dataset(DatasetSpec(size=10_000, fraud_rate=0.15, seed=42))
    fraud = df[df[LABEL_COLUMN] == 1]
    legit = df[df[LABEL_COLUMN] == 0]

    assert fraud["amount"].mean() > legit["amount"].mean()
    assert fraud["amount_to_average_ratio"].mean() > legit["amount_to_average_ratio"].mean()
    assert fraud["is_new_beneficiary"].mean() > legit["is_new_beneficiary"].mean()
    assert fraud["is_new_device"].mean() > legit["is_new_device"].mean()
    assert fraud["transactions_last_5_minutes"].mean() > legit["transactions_last_5_minutes"].mean()
    assert fraud["behavioural_deviation"].mean() > legit["behavioural_deviation"].mean()


def test_rejects_invalid_spec():
    with pytest.raises(ValueError):
        generate_dataset(DatasetSpec(size=10, fraud_rate=0.08, seed=42))
    with pytest.raises(ValueError):
        generate_dataset(DatasetSpec(size=1_000, fraud_rate=0.0, seed=42))
    with pytest.raises(ValueError):
        generate_dataset(DatasetSpec(size=1_000, fraud_rate=1.0, seed=42))