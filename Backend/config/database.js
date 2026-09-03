import mongoose from "mongoose";
import { env } from "./environment.js";

/**
 * MongoDB connection helpers.
 *
 * `connectDatabase()` establishes the connection and installs event listeners
 * so any post-boot connection state change is logged in the same structured
 * JSON format the rest of the server uses.
 *
 * The database name is passed explicitly rather than being embedded in the
 * URL — this lets us reuse a single MONGO_URL across dev / test / seed with
 * only DB_NAME changing.
 */

let listenersInstalled = false;

function installConnectionListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;

  mongoose.connection.on("disconnected", () => {
    console.warn(JSON.stringify({ event: "DATABASE_DISCONNECTED" }));
  });
  mongoose.connection.on("reconnected", () => {
    console.info(JSON.stringify({ event: "DATABASE_RECONNECTED" }));
  });
  mongoose.connection.on("error", (error) => {
    console.error(
      JSON.stringify({
        event: "DATABASE_ERROR",
        message: error?.message,
      })
    );
  });
}

export async function connectDatabase() {
  installConnectionListeners();
  await mongoose.connect(env.mongoUrl, {
    dbName: env.dbName,
    serverSelectionTimeoutMS: 5000,
  });
  console.info(
    JSON.stringify({
      event: "DATABASE_CONNECTED",
      database: env.dbName,
    })
  );
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.info(JSON.stringify({ event: "DATABASE_DISCONNECTED_CLEAN" }));
}