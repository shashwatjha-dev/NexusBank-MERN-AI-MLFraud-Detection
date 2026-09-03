"""
Health & liveness endpoints.

  GET /            → minimal service banner (helpful during manual probing)
  GET /health      → HealthResponse — used by the Node backend and any monitor
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas import HealthResponse


router = APIRouter(tags=["health"])


@router.get("/", include_in_schema=False)
def root():
    return {
        "service": "nexusbank-ml-service",
        "docs": "/docs",
        "health": "/health",
        "predict": "/predict",
    }


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={
        200: {"description": "Service is running. `model_loaded` indicates ML readiness."},
    },
)
def health(request: Request) -> HealthResponse:
    predictor = request.app.state.predictor
    return HealthResponse(
        status="ok" if predictor.is_ready else "degraded",
        model_loaded=predictor.is_ready,
        model_version=predictor.model_version,
    )