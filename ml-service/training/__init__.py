"""Training pipeline for the NexusBank fraud model.

Modules
-------
`dataset`  — deterministic synthetic transaction generator + checksum helper.
`evaluate` — model evaluation metrics (ROC-AUC, PR-AUC, F1, precision,
             recall, confusion matrix).
`train`    — orchestrates dataset → pipeline → fit → evaluate → persist.

Nothing here is imported by the FastAPI application at runtime — the training
pipeline is invoked manually via `python -m training.train`. This keeps the
serving surface small and its cold-start fast.
"""

from training import dataset, evaluate, train


__all__ = ["dataset", "evaluate", "train"]