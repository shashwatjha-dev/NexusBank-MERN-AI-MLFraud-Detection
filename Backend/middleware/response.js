/**
 * Uniform success envelope for every non-error API response.
 *
 *   {
 *     "success": true,
 *     "data": <payload>,
 *     "message": <human string>,
 *     "requestId": <uuid>
 *   }
 *
 * Error responses share the same shape (see errorMiddleware.js) so the frontend
 * only has to understand one response contract.
 */
export function ok(res, data, message = "Request completed successfully", status = 200) {
  return res.status(status).json({
    success: true,
    data,
    message,
    requestId: res.getHeader("x-request-id") || null,
  });
}

export function created(res, data, message = "Resource created successfully") {
  return ok(res, data, message, 201);
}

export function accepted(res, data, message = "Request accepted for processing") {
  return ok(res, data, message, 202);
}