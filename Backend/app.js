import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "./config/environment.js";
import { requestContext } from "./middleware/requestContext.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { notFound } from "./middleware/notFound.js";
import apiRoutes from "./routes/index.js";

/**
 * Express application setup. The middleware order is deliberate:
 *
 *   1. helmet             — baseline security headers
 *   2. cors               — controlled origin allow-list
 *   3. express.json       — body parser with a hard byte cap
 *   4. static uploads     — serves profile photos and other uploaded files
 *   5. requestContext     — attaches req.requestId and echoes x-request-id
 *   6. morgan             — one-line JSON access log with the request id
 *   7. /api routes        — mounted exactly once through routes/index.js
 *   8. notFound            — 404 fallback that funnels into the error handler
 *   9. errorMiddleware     — centralized error envelope
 */

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

/* =========================================================
   PATH CONFIGURATION
   ========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================================================
   SECURITY HEADERS
   ========================================================= */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/* =========================================================
   CORS
   ========================================================= */

const corsOrigin = env.corsOrigins.includes("*")
  ? true
  : env.corsOrigins;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    exposedHeaders: ["x-request-id"],
  })
);

/* =========================================================
   BODY PARSER
   ========================================================= */

app.use(
  express.json({
    limit: "100kb",
  })
);

/* =========================================================
   STATIC UPLOADS
   =========================================================
 *
 * Profile photos are stored by authRoutes.js in:
 *
 *   backend/uploads/profile/
 *
 * Therefore:
 *
 *   /uploads/profile/<filename>
 *
 * becomes publicly accessible through this server.
 */

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads"),
    {
      fallthrough: true,
      index: false,
      maxAge: "1d",
    }
  )
);

/* =========================================================
   REQUEST CONTEXT
   ========================================================= */

app.use(requestContext);

/* =========================================================
   HTTP ACCESS LOGGING
   ========================================================= */

app.use(
  morgan((tokens, req, res) =>
    JSON.stringify({
      event: "HTTP_REQUEST",
      requestId: req.requestId,
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      status: Number(
        tokens.status(req, res)
      ),
      durationMs: Number(
        tokens["response-time"](req, res)
      ),
    })
  )
);

/* =========================================================
   API ROUTES
   ========================================================= */

app.use("/api", apiRoutes);

/* =========================================================
   404 + ERROR HANDLING
   ========================================================= */

app.use(notFound);

app.use(errorMiddleware);

export default app;