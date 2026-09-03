import { AppError } from "../utils/errors.js";

/**
 * Catch-all for unmapped routes. Kept as a normal middleware so it feeds into
 * the centralized error handler (uniform response shape).
 */
export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND", 404));
}