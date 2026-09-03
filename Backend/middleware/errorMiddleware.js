import { AppError } from "../utils/errors.js";

/**
 * Centralized error handler. Every controller that throws goes through here.
 * The response shape mirrors the success envelope:
 *
 *   {
 *     "success": false,
 *     "error":   { "code": "VALIDATION_ERROR", "message": "..." },
 *     "requestId": <uuid>
 *   }
 *
 * 5xx errors are logged with the full stack for the operator. The client is
 * given a generic message so we never leak internals over the wire.
 */
export function errorMiddleware(error, req, res, _next) {
  let status = error.status || 500;
  let code = error.code || "INTERNAL_ERROR";
  let message = error.message || "Something went wrong.";

  // Mongoose validation error
  if (error?.name === "ValidationError") {
    status = 400;
    code = "VALIDATION_ERROR";
    message = Object.values(error.errors || {})
      .map((detail) => detail.message)
      .join("; ") || "Validation failed.";
  }

  // Mongoose duplicate-key error
  if (error?.code === 11000) {
    status = 409;
    code = "DUPLICATE_RESOURCE";
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    message = `A record with this ${field} already exists.`;
  }

  // Mongoose cast error (bad ObjectId in :id params etc.)
  if (error?.name === "CastError") {
    status = 400;
    code = "INVALID_IDENTIFIER";
    message = "The supplied identifier is malformed.";
  }

  if (status >= 500) {
    console.error(
      JSON.stringify({
        event: "REQUEST_ERROR",
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        message: error.message,
        stack: error.stack,
      })
    );
  }

  return res.status(status).json({
    success: false,
    error: {
      code,
      message: status >= 500 && !(error instanceof AppError)
        ? "Something went wrong."
        : message,
    },
    requestId: req.requestId || null,
  });
}