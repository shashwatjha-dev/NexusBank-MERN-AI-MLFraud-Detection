import { AppError } from "../utils/errors.js";
import { ROLES } from "../utils/enums.js";

/**
 * Role-based access control. `requireRole('ADMIN')` restricts a route to
 * administrators only.
 */
export function requireRole(...allowedRoles) {
  return function roleGuard(req, _res, next) {
    if (!req.user?.role) {
      return next(
        new AppError("Authentication required.", "AUTHENTICATION_REQUIRED", 401)
      );
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `${allowedRoles.join(" or ")} access required.`,
          "FORBIDDEN",
          403
        )
      );
    }
    return next();
  };
}

export const requireAdmin = requireRole(ROLES.ADMIN);
export const requireCustomer = requireRole(ROLES.CUSTOMER);