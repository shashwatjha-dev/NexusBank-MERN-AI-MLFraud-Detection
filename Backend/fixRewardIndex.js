import "dotenv/config";
import mongoose from "mongoose";
import { env } from "./config/environment.js";

async function main() {
  await mongoose.connect(env.mongoUrl, {
    dbName: env.dbName,
    serverSelectionTimeoutMS: 5000,
  });

  const collection = mongoose.connection.collection("rewards");

  const indexes = await collection.indexes();

  console.log("\nCurrent reward indexes:\n");
  console.table(
    indexes.map((index) => ({
      name: index.name,
      key: JSON.stringify(index.key),
      unique: index.unique ?? false,
    }))
  );

  const staleIndex = indexes.find(
    (index) => index.name === "user_id_1"
  );

  if (staleIndex) {
    console.log("\nRemoving stale index: user_id_1");
    await collection.dropIndex("user_id_1");
    console.log("✅ Stale index removed.");
  } else {
    console.log("\nNo stale user_id_1 index found.");
  }

  await mongoose.disconnect();
  console.log("✅ Database disconnected.");
}

main().catch(async (error) => {
  console.error("❌ Failed:", error.message);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});