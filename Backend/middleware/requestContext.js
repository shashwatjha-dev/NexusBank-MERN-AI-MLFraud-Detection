import { v4 as uuid } from "uuid";

/**
 * Attaches a stable requestId to every request/response for cross-service
 * tracing (Node.js backend ↔ Python ML service ↔ frontend logs).
 *
 * Clients may supply their own id via the `x-request-id` header. Otherwise
 * one is generated. The same id is echoed on the response header so browsers
 * and log aggregators can correlate the two sides of the call.
 */
export function requestContext(req, res, next) {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.length <= 128 ? incoming : uuid();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}