import dotenv from "dotenv";

/**
 * Loads and validates environment variables. Called at module-import time
 * so any misconfiguration surfaces before the HTTP server starts.
 *
 * Required (server refuses to boot without these):
 *   MONGO_URL, DB_NAME, JWT_SECRET
 *
 * Optional:
 *   PORT              default 5000
 *   NODE_ENV          default "development"
 *   JWT_EXPIRES_IN    default "2h"
 *   ML_SERVICE_URL    default null  (Phase 3 turns this on)
 *   CORS_ORIGINS      default "*"   (comma-separated list)
 */

dotenv.config();

const required = ["MONGO_URL", "DB_NAME", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      `Copy backend/.env.example to backend/.env and fill them in.`
  );
}

if (String(process.env.JWT_SECRET).length < 24) {
  throw new Error(
    "JWT_SECRET must be at least 24 characters. Use a long random string."
  );
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUrl: process.env.MONGO_URL,
  dbName: process.env.DB_NAME,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  mlServiceUrl: process.env.ML_SERVICE_URL || null,
  corsOrigins: (process.env.CORS_ORIGINS || "*")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
});