"""
FastAPI application factory.

Kept minimal and side-effect free at import time so that:
  - `main.py` can build the app instance for uvicorn.
  - `tests/conftest.py` can build fresh app instances per test session
    without triggering global state.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import install_exception_handlers
from app.logging_config import configure_logging, get_logger
from app.ml.predictor import Predictor
from app.routers import health as health_router
from app.routers import predict as predict_router


@asynccontextmanager
async def _lifespan(app: FastAPI):
    """Startup: load the latest model artifact into memory (if present).

    Shutdown: nothing to do — the model is a pure in-memory object.
    """
    logger = get_logger(__name__)
    settings = get_settings()

    predictor = Predictor(
        model_dir=settings.model_dir,
        preferred_version=settings.model_version or None,
    )
    predictor.load_latest_if_available()
    app.state.predictor = predictor

    if predictor.is_ready:
        logger.info(
            "MODEL_LOADED",
            extra={"model_version": predictor.model_version, "path": str(predictor.model_path)},
        )
    else:
        logger.warning(
            "MODEL_NOT_LOADED",
            extra={"model_dir": str(settings.model_dir)},
        )

    yield


def create_app() -> FastAPI:
    """Construct the FastAPI application."""
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title="NexusBank — ML Fraud Prediction Service",
        version="1.0.0",
        description=(
            "Deterministic scikit-learn model that estimates the fraud "
            "probability for a single transaction. Consumed by the Node.js "
            "backend through POST /predict."
        ),
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.env != "production" else None,
        lifespan=_lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "content-type",
            "x-request-id",
            "x-transaction-id",
        ],
        expose_headers=["x-request-id", "x-transaction-id"],
    )

    install_exception_handlers(app)

    app.include_router(health_router.router)
    app.include_router(predict_router.router)

    return app


__all__ = ["create_app"]