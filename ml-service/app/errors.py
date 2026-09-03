"""
Application-level exceptions and FastAPI exception handlers.

The response envelope matches the Node.js backend's error shape so the two
services surface identically to clients and log aggregators:

    {
      "success": false,
      "error":   { "code": "MODEL_UNAVAILABLE", "message": "..." },
      "request_id": "..."
    }
"""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.logging_config import get_logger
from app.schemas import ErrorBody, ErrorResponse


class ServiceError(Exception):
    """Application-level error with an explicit code + HTTP status.

    Raise from routers / services instead of bare HTTPException so the
    error envelope stays uniform.
    """

    def __init__(self, message: str, code: str = "APPLICATION_ERROR", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _request_id(request: Request) -> Optional[str]:
    return request.headers.get("x-request-id")


def _build_error(code: str, message: str, request_id: Optional[str], status_code: int) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message), request_id=request_id)
    return JSONResponse(status_code=status_code, content=body.model_dump())


def install_exception_handlers(app: FastAPI) -> None:
    logger = get_logger(__name__)

    @app.exception_handler(ServiceError)
    async def _service_error(request: Request, exc: ServiceError):
        return _build_error(exc.code, exc.message, _request_id(request), exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        # Pydantic v2 returns a list of dicts — flatten to a single message.
        details = exc.errors()
        message = "; ".join(
            f"{'.'.join(str(part) for part in err.get('loc', [])) or 'body'}: {err.get('msg', 'invalid')}"
            for err in details
        ) or "Invalid request payload."
        return _build_error("VALIDATION_ERROR", message, _request_id(request), 422)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException):
        code = "HTTP_ERROR"
        if exc.status_code == 404:
            code = "ROUTE_NOT_FOUND"
        elif exc.status_code == 405:
            code = "METHOD_NOT_ALLOWED"
        return _build_error(code, str(exc.detail), _request_id(request), exc.status_code)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.exception(
            "UNHANDLED_EXCEPTION",
            extra={
                "request_id": _request_id(request),
                "path": request.url.path,
                "method": request.method,
            },
        )
        return _build_error(
            "INTERNAL_ERROR",
            "Something went wrong.",
            _request_id(request),
            500,
        )