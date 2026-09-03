"""
Model evaluation.

Given a fitted estimator and a held-out (X, y) split, computes the metrics
that get written into the model metadata JSON:

    - ROC-AUC       (threshold-free ranking quality)
    - PR-AUC        (average precision — informative under class imbalance)
    - F1            (at the configured decision threshold)
    - precision     (at the configured decision threshold)
    - recall        (at the configured decision threshold)
    - confusion_matrix (2x2, at the configured decision threshold)

No metric is ever hardcoded or synthesised — everything is computed from
the held-out predictions.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate_binary(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """Compute the metric bundle for a binary fraud classifier.

    `model` must expose `predict_proba` — our sklearn Pipeline does.
    """
    proba = model.predict_proba(X)

    # Locate the "1 = fraud" column by class label rather than by index, so
    # the metrics can't be flipped by a future refactor.
    classes = getattr(model, "classes_", None)
    if classes is None:
        fraud_index = proba.shape[1] - 1
    else:
        try:
            fraud_index = int(list(classes).index(1))
        except ValueError:
            fraud_index = proba.shape[1] - 1

    fraud_proba = proba[:, fraud_index]
    predictions = (fraud_proba >= threshold).astype(int)

    cm = confusion_matrix(y, predictions, labels=[0, 1])

    return {
        "threshold": float(threshold),
        "roc_auc": float(roc_auc_score(y, fraud_proba)),
        "pr_auc": float(average_precision_score(y, fraud_proba)),
        "f1": float(f1_score(y, predictions, zero_division=0)),
        "precision": float(precision_score(y, predictions, zero_division=0)),
        "recall": float(recall_score(y, predictions, zero_division=0)),
        "confusion_matrix": {
            "labels": [0, 1],
            "matrix": cm.astype(int).tolist(),
            "true_negatives": int(cm[0, 0]),
            "false_positives": int(cm[0, 1]),
            "false_negatives": int(cm[1, 0]),
            "true_positives": int(cm[1, 1]),
        },
        "positives_in_holdout": int(np.sum(y == 1)),
        "negatives_in_holdout": int(np.sum(y == 0)),
    }