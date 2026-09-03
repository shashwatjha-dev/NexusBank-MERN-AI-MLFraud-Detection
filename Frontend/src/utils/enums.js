// Mirrors backend/utils/enums.js — keep names/values in exact sync.

export const RISK_LEVEL = { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" };

export const FRAUD_DECISION = {
  COMPLETED: "COMPLETED",
  VERIFICATION_REQUIRED: "VERIFICATION_REQUIRED",
  BLOCKED: "BLOCKED",
};

export const TRANSACTION_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
};

export const ROLES = { CUSTOMER: "CUSTOMER", ADMIN: "ADMIN" };

export const RISK_LABEL = {
  LOW: "Low risk",
  MEDIUM: "Verification required",
  HIGH: "Blocked",
};

export const RISK_COLOR_VAR = {
  LOW: "var(--risk-low)",
  MEDIUM: "var(--risk-medium)",
  HIGH: "var(--risk-high)",
};