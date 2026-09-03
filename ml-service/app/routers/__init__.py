"""Route modules.

`health` — service liveness + model readiness.
`predict` — the single-transaction inference endpoint consumed by the
             Node.js backend's `mlClient`.
"""

from app.routers import health, predict


__all__ = ["health", "predict"]