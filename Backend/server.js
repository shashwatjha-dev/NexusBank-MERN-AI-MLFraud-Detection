import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/environment.js";

// Import models FIRST so mongoose registers them before hooks attach.
import "./models/User.js";
import "./models/Account.js";
import "./models/Beneficiary.js";
import "./models/Transaction.js";
import "./models/FixedDeposit.js";
import "./models/FraudLog.js";
import "./models/AuditLog.js";
import "./models/Alert.js";
import "./models/Reward.js";
import "./models/Device.js";
import "./models/SecurityEvent.js";
import "./models/LedgerEntry.js";
import "./models/Session.js";
import "./models/PPF.js";
import "./models/PPFContribution.js";
import "./models/Notification.js";

import { initHooks as initNotificationHooks } from "./services/notificationService.js";

/**
 * Boot sequence:
 *   1. Connect to MongoDB.
 *   2. Register notification hooks (Batch 6).
 *   3. Start HTTP listener.
 *   4. Wire graceful-shutdown handlers.
 */
async function start() {
  try {
    await connectDatabase();
    initNotificationHooks();

    const server = app.listen(env.port, () => {
      console.info(
        JSON.stringify({
          event: "SERVER_STARTED",
          port: env.port,
          environment: env.nodeEnv,
        })
      );
    });

    const shutdown = async (signal) => {
      console.info(JSON.stringify({ event: "SHUTDOWN_SIGNAL", signal }));
      server.close(async (closeError) => {
        if (closeError) {
          console.error(
            JSON.stringify({
              event: "SERVER_CLOSE_ERROR",
              message: closeError.message,
            })
          );
        }
        await disconnectDatabase();
        process.exit(closeError ? 1 : 0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "SERVER_BOOT_FAILED",
        message: error?.message,
        stack: error?.stack,
      })
    );
    process.exit(1);
  }
}

start();