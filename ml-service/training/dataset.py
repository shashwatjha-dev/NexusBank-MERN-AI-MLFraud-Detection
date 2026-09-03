"""
Deterministic synthetic transaction dataset generator.

Two runs with the same seed produce byte-identical data.

The dataset is deliberately designed around NexusBank's fraud-risk
architecture:

    Amount
       +
    Behaviour
       +
    Beneficiary
       +
    Device
       +
    Time
       +
    Velocity
       +
    Previous suspicious activity
       ↓
    Fraud label

IMPORTANT
---------
The dataset must NOT make transaction amount alone a perfect fraud signal.

Large legitimate transfers are intentionally present in the legitimate class,
while some smaller fraudulent transactions are also present in the fraud class.

This prevents the ML model from learning:

    "large amount = 90%+ fraud"

Instead it learns combinations of signals.

Fraud rate defaults to approximately 8%.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
import pandas as pd

from app.ml.feature_engineering import FEATURE_ORDER


LABEL_COLUMN = "label"

_LABEL_NOISE_RATE = 0.02


@dataclass
class DatasetSpec:
    """Parameters for a single deterministic dataset generation run."""

    size: int = 50_000
    fraud_rate: float = 0.08
    seed: int = 42
    label_noise_rate: float = _LABEL_NOISE_RATE


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------


def _clip(
    values: np.ndarray,
    lo: float,
    hi: float,
) -> np.ndarray:
    return np.clip(values, lo, hi)


def _bounded_normal(
    rng: np.random.Generator,
    n: int,
    mean: float,
    std: float,
    lo: float,
    hi: float,
) -> np.ndarray:
    values = rng.normal(
        loc=mean,
        scale=std,
        size=n,
    )

    return _clip(
        values,
        lo,
        hi,
    )


def _generate_legitimate(
    rng: np.random.Generator,
    n: int,
) -> pd.DataFrame:
    """
    Generate legitimate transactions.

    IMPORTANT:

    Legitimate transactions are NOT restricted to tiny amounts.

    A realistic legitimate user may transfer:

        ₹500
        ₹2,000
        ₹10,000
        ₹25,000
        ₹50,000
        ₹1,00,000
        ₹2,00,000+

    Therefore the legitimate class contains a meaningful number of larger
    transactions.

    This prevents amount alone from becoming a perfect fraud predictor.
    """

    # ============================================================
    # AMOUNT
    # ============================================================
    #
    # Mixture distribution:
    #
    # 70% everyday transactions
    # 20% medium-value transactions
    # 10% legitimate large transactions
    #
    # Values are in RUPEES because the Python ML contract expects
    # `amount` in rupees.
    # ============================================================

    amount_bucket = rng.choice(
        3,
        size=n,
        p=[
            0.70,
            0.20,
            0.10,
        ],
    )

    everyday_amount = rng.lognormal(
        mean=8.0,
        sigma=0.85,
        size=n,
    )

    medium_amount = rng.lognormal(
        mean=9.7,
        sigma=0.55,
        size=n,
    )

    large_legitimate_amount = rng.lognormal(
        mean=11.4,
        sigma=0.45,
        size=n,
    )

    amount = np.select(
        [
            amount_bucket == 0,
            amount_bucket == 1,
            amount_bucket == 2,
        ],
        [
            everyday_amount,
            medium_amount,
            large_legitimate_amount,
        ],
        default=everyday_amount,
    )

    amount = _clip(
        amount,
        100.0,
        500_000.0,
    )

    # ============================================================
    # HISTORICAL AMOUNT RATIO
    # ============================================================
    #
    # Mostly close to normal.
    #
    # Some legitimate users naturally make larger transfers, so
    # ratios above 1 are allowed.
    # ============================================================

    ratio = _bounded_normal(
        rng,
        n,
        mean=1.0,
        std=0.35,
        lo=0.10,
        hi=4.5,
    )

    # A small portion of legitimate transactions are larger than
    # their usual average without being fraud.
    high_ratio_mask = rng.random(n) < 0.08

    ratio[high_ratio_mask] = _bounded_normal(
        rng,
        int(high_ratio_mask.sum()),
        mean=2.2,
        std=0.65,
        lo=1.2,
        hi=4.8,
    )

    # ============================================================
    # BENEFICIARY
    # ============================================================

    beneficiary_age_days = _clip(
        rng.gamma(
            shape=5.0,
            scale=35.0,
            size=n,
        ),
        1.0,
        730.0,
    )

    # Most legitimate transfers use established beneficiaries.
    is_new_beneficiary = (
        rng.random(size=n) < 0.04
    ).astype(int)

    # ============================================================
    # DEVICE
    # ============================================================

    is_new_device = (
        rng.random(size=n) < 0.04
    ).astype(int)

    # ============================================================
    # TIME
    # ============================================================
    #
    # Legitimate users are concentrated around daytime/evening,
    # but not every legitimate transaction occurs at 1 PM.
    # ============================================================

    hour = np.round(
        rng.normal(
            loc=13.5,
            scale=3.5,
            size=n,
        )
    ).astype(int)

    hour = np.mod(
        hour,
        24,
    )

    # ============================================================
    # VELOCITY
    # ============================================================
    #
    # Usually low.
    # Occasionally 2-4 legitimate transactions can happen quickly.
    # ============================================================

    velocity = rng.poisson(
        lam=0.9,
        size=n,
    )

    velocity = _clip(
        velocity,
        0,
        8,
    ).astype(int)

    # ============================================================
    # PREVIOUS SUSPICIOUS HISTORY
    # ============================================================

    previous_suspicious = rng.poisson(
        lam=0.05,
        size=n,
    )

    previous_suspicious = _clip(
        previous_suspicious,
        0,
        3,
    ).astype(int)

    # ============================================================
    # BEHAVIOURAL DEVIATION
    # ============================================================

    behavioural = rng.normal(
        loc=8.0,
        scale=18.0,
        size=n,
    )

    behavioural = _clip(
        behavioural,
        -30.0,
        80.0,
    )

    # ============================================================
    # LEGITIMATE LABEL
    # ============================================================

    return pd.DataFrame({
        "amount": amount,
        "amount_to_average_ratio": ratio,
        "beneficiary_age_days": beneficiary_age_days,
        "is_new_beneficiary": is_new_beneficiary,
        "is_new_device": is_new_device,
        "hour_of_day": hour,
        "transactions_last_5_minutes": velocity,
        "previous_suspicious_count": previous_suspicious,
        "behavioural_deviation": behavioural,
        LABEL_COLUMN: 0,
    })


def _generate_fraud(
    rng: np.random.Generator,
    n: int,
) -> pd.DataFrame:
    """
    Generate suspicious/fraudulent transactions.

    Fraud is represented by combinations of signals rather than amount alone.

    Some fraudulent transactions are deliberately below ₹1L.

    Some legitimate transactions are deliberately above ₹1L.

    This overlap makes the ML boundary more realistic.
    """

    # ============================================================
    # AMOUNT MIXTURE
    # ============================================================
    #
    # 45% moderate suspicious amounts
    # 35% high amounts
    # 20% very high amounts
    #
    # This prevents the model from learning that every fraud must
    # be a huge transaction.
    # ============================================================

    amount_bucket = rng.choice(
        3,
        size=n,
        p=[
            0.45,
            0.35,
            0.20,
        ],
    )

    moderate_fraud_amount = rng.lognormal(
        mean=9.3,
        sigma=0.75,
        size=n,
    )

    high_fraud_amount = rng.lognormal(
        mean=11.0,
        sigma=0.75,
        size=n,
    )

    very_high_fraud_amount = rng.lognormal(
        mean=12.2,
        sigma=0.70,
        size=n,
    )

    amount = np.select(
        [
            amount_bucket == 0,
            amount_bucket == 1,
            amount_bucket == 2,
        ],
        [
            moderate_fraud_amount,
            high_fraud_amount,
            very_high_fraud_amount,
        ],
        default=moderate_fraud_amount,
    )

    amount = _clip(
        amount,
        500.0,
        1_000_000.0,
    )

    # ============================================================
    # HISTORICAL AMOUNT RATIO
    # ============================================================
    #
    # Fraud tends to be larger relative to normal history, but
    # overlap is intentionally maintained.
    # ============================================================

    ratio = rng.normal(
        loc=4.8,
        scale=2.5,
        size=n,
    )

    ratio = _clip(
        ratio,
        0.5,
        20.0,
    )

    # A meaningful minority of fraud transactions are not extreme
    # relative to historical amount.
    normal_ratio_fraud = rng.random(n) < 0.20

    ratio[normal_ratio_fraud] = _bounded_normal(
        rng,
        int(normal_ratio_fraud.sum()),
        mean=2.2,
        std=0.8,
        lo=0.7,
        hi=4.5,
    )

    # ============================================================
    # BENEFICIARY
    # ============================================================

    beneficiary_age_days = rng.exponential(
        scale=8.0,
        size=n,
    )

    beneficiary_age_days = _clip(
        beneficiary_age_days,
        0.0,
        120.0,
    )

    is_new_beneficiary = (
        rng.random(size=n) < 0.65
    ).astype(int)

    # ============================================================
    # DEVICE
    # ============================================================

    is_new_device = (
        rng.random(size=n) < 0.55
    ).astype(int)

    # ============================================================
    # TIME
    # ============================================================
    #
    # Fraud has a higher probability of occurring at unusual
    # hours, but some fraud can happen during normal hours.
    # ============================================================

    unusual_time = rng.random(n) < 0.65

    early_hour = np.round(
        rng.normal(
            loc=3.0,
            scale=1.5,
            size=n,
        )
    ).astype(int)

    normal_hour = np.round(
        rng.normal(
            loc=13.0,
            scale=4.0,
            size=n,
        )
    ).astype(int)

    hour = np.where(
        unusual_time,
        early_hour,
        normal_hour,
    )

    hour = np.mod(
        hour,
        24,
    )

    # ============================================================
    # VELOCITY
    # ============================================================

    velocity = rng.poisson(
        lam=2.8,
        size=n,
    )

    velocity = _clip(
        velocity,
        0,
        12,
    ).astype(int)

    # ============================================================
    # PREVIOUS SUSPICIOUS ACTIVITY
    # ============================================================

    previous_suspicious = rng.poisson(
        lam=0.45,
        size=n,
    )

    previous_suspicious = _clip(
        previous_suspicious,
        0,
        5,
    ).astype(int)

    # ============================================================
    # BEHAVIOURAL DEVIATION
    # ============================================================
    #
    # Higher than legitimate distribution.
    #
    # Still overlaps with legitimate activity.
    # ============================================================

    behavioural = rng.normal(
        loc=115.0,
        scale=75.0,
        size=n,
    )

    behavioural = _clip(
        behavioural,
        -20.0,
        450.0,
    )

    # ============================================================
    # FRAUD LABEL
    # ============================================================

    return pd.DataFrame({
        "amount": amount,
        "amount_to_average_ratio": ratio,
        "beneficiary_age_days": beneficiary_age_days,
        "is_new_beneficiary": is_new_beneficiary,
        "is_new_device": is_new_device,
        "hour_of_day": hour,
        "transactions_last_5_minutes": velocity,
        "previous_suspicious_count": previous_suspicious,
        "behavioural_deviation": behavioural,
        LABEL_COLUMN: 1,
    })


def _apply_label_noise(
    rng: np.random.Generator,
    df: pd.DataFrame,
    rate: float,
) -> pd.DataFrame:
    """
    Flip a small fraction of labels.

    This prevents the model from converging toward a perfectly
    separable synthetic boundary.
    """

    if rate <= 0:
        return df

    df = df.copy()

    mask = (
        rng.random(size=len(df))
        < rate
    )

    df.loc[
        mask,
        LABEL_COLUMN,
    ] = (
        1
        - df.loc[
            mask,
            LABEL_COLUMN,
        ].to_numpy()
    )

    return df


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------


def generate_dataset(
    spec: Optional[DatasetSpec] = None,
) -> pd.DataFrame:
    """
    Produce a deterministic synthetic dataset.

    Returns:

        FEATURE_ORDER + label

    with:

        0 = legitimate
        1 = suspicious/fraud
    """

    spec = spec or DatasetSpec()

    if spec.size < 100:
        raise ValueError(
            "Dataset size must be at least 100."
        )

    if not (
        0.0
        < spec.fraud_rate
        < 1.0
    ):
        raise ValueError(
            "Fraud rate must be strictly between 0 and 1."
        )

    rng = np.random.default_rng(
        spec.seed
    )

    n_fraud = int(
        round(
            spec.size
            * spec.fraud_rate
        )
    )

    n_legit = (
        spec.size
        - n_fraud
    )

    # ============================================================
    # GENERATE BOTH CLASSES
    # ============================================================

    legitimate = _generate_legitimate(
        rng,
        n_legit,
    )

    fraud = _generate_fraud(
        rng,
        n_fraud,
    )

    # ============================================================
    # COMBINE
    # ============================================================

    combined = pd.concat(
        [
            legitimate,
            fraud,
        ],
        axis=0,
        ignore_index=True,
    )

    # ============================================================
    # LABEL NOISE
    # ============================================================

    combined = _apply_label_noise(
        rng,
        combined,
        spec.label_noise_rate,
    )

    # ============================================================
    # DETERMINISTIC SHUFFLE
    # ============================================================

    shuffled_index = rng.permutation(
        len(combined)
    )

    combined = (
        combined
        .iloc[shuffled_index]
        .reset_index(drop=True)
    )

    # ============================================================
    # ENFORCE CANONICAL COLUMN ORDER
    # ============================================================

    columns = (
        list(FEATURE_ORDER)
        + [LABEL_COLUMN]
    )

    return combined[
        columns
    ]


def split_features_labels(
    df: pd.DataFrame,
) -> Tuple[
    pd.DataFrame,
    pd.Series,
]:
    """
    Return:

        X, y

    with X columns strictly matching FEATURE_ORDER.
    """

    X = df[
        list(FEATURE_ORDER)
    ].copy()

    y = df[
        LABEL_COLUMN
    ].astype(int).copy()

    return X, y


def dataset_checksum(
    df: pd.DataFrame,
) -> str:
    """
    SHA-256 checksum of the canonical dataset representation.

    Same dataset + same seed = same checksum.
    """

    canonical_columns = (
        list(FEATURE_ORDER)
        + [LABEL_COLUMN]
    )

    canonical = df[
        canonical_columns
    ].copy()

    # ============================================================
    # STABLE INTEGER TYPES
    # ============================================================

    for col in (
        "is_new_beneficiary",
        "is_new_device",
        "hour_of_day",
        "transactions_last_5_minutes",
        "previous_suspicious_count",
        LABEL_COLUMN,
    ):
        canonical[col] = (
            canonical[col]
            .astype(np.int64)
        )

    # ============================================================
    # STABLE FLOAT TYPES
    # ============================================================

    for col in (
        "amount",
        "amount_to_average_ratio",
        "beneficiary_age_days",
        "behavioural_deviation",
    ):
        canonical[col] = (
            canonical[col]
            .astype(np.float64)
        )

    # ============================================================
    # STABLE FLOAT PRECISION
    # ============================================================

    for col in (
        "amount",
        "amount_to_average_ratio",
        "beneficiary_age_days",
        "behavioural_deviation",
    ):
        canonical[col] = np.round(
            canonical[col],
            6,
        )

    # ============================================================
    # HASH
    # ============================================================

    csv_bytes = (
        canonical
        .to_csv(
            index=False,
            lineterminator="\n",
        )
        .encode("utf-8")
    )

    return hashlib.sha256(
        csv_bytes
    ).hexdigest()