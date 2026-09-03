/**
 * Base application error. Every intentional 4xx should throw an AppError.
 * The centralized errorMiddleware maps it to the standard error envelope.
 *
 * Never wrap unexpected errors in AppError — let them fall through so they
 * get 500 + logged with a full stack trace.
 */
export class AppError extends Error {
  constructor(message, code = "APPLICATION_ERROR", status = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

/**
 * Convenience factory functions so controllers stay readable.
 */
export const badRequest = (message, code = "VALIDATION_ERROR") =>
  new AppError(message, code, 400);

export const unauthorized = (message = "Authentication required.") =>
  new AppError(message, "AUTHENTICATION_REQUIRED", 401);

export const forbidden = (message = "You are not allowed to perform this action.") =>
  new AppError(message, "FORBIDDEN", 403);

export const notFound = (message = "Resource not found.") =>
  new AppError(message, "RESOURCE_NOT_FOUND", 404);

export const conflict = (message, code = "CONFLICT") =>
  new AppError(message, code, 409);