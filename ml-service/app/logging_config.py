"""
Structured JSON logging.

Matches the log line shape used by the Node.js backend so both services can be
tailed / grepped / aggregated the same way:

    {"timestamp": "...", "level": "INFO", "event": "MODEL_LOADED", ...}
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict


_RESERVED_ATTRS = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "message", "taskName",
}


class JsonFormatter(logging.Formatter):
    """A tiny structured formatter — no third-party deps."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003 (shadow)
        payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }

        # Merge any extras the caller attached with `extra={...}`.
        for key, value in record.__dict__.items():
            if key in _RESERVED_ATTRS or key.startswith("_"):
                continue
            payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging(settings) -> None:
    """Install the JSON formatter on the root logger.

    Called from `create_app()` so tests and the ASGI server pick up the same
    configuration. Uvicorn's own loggers are re-wrapped to keep output
    consistent (we pass `log_config=None` to uvicorn in `main.py`).
    """
    root = logging.getLogger()
    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)

    level = logging.DEBUG if settings.env == "development" else logging.INFO
    root.setLevel(level)

    # Silence very noisy access logs — we generate our own via middleware
    # inside route handlers when we want them.
    for noisy in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(noisy).handlers = [handler]
        logging.getLogger(noisy).propagate = False


def get_logger(name: str) -> logging.Logger:
    """Thin accessor so callers don't have to import `logging` themselves."""
    return logging.getLogger(name)