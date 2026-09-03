import { AppError } from "../utils/errors.js";

/**
 * Joi validation wrapper.
 *
 * Usage:
 *   router.post(
 *     "/transfers",
 *     requireAuth,
 *     validate({ body: transferSchema }),
 *     transferController.create
 *   );
 *
 * Validation runs against `body`, `query`, and `params` when their schemas
 * are supplied. Validated & coerced values replace the original request
 * fields, so downstream controllers get clean, typed input.
 */
export function validate(schemas) {
  return function validateHandler(req, _res, next) {
    try {
      for (const key of ["body", "query", "params"]) {
        const schema = schemas[key];
        if (!schema) continue;
        const { value, error } = schema.validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        if (error) {
          const message = error.details.map((detail) => detail.message).join("; ");
          throw new AppError(message, "VALIDATION_ERROR", 400);
        }
        req[key] = value;
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}