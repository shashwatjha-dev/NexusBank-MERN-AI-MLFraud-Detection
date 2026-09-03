import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import User from "../models/User.js";
import Account from "../models/Account.js";
import Beneficiary from "../models/Beneficiary.js";
import Transaction from "../models/Transaction.js";
import FraudLog from "../models/FraudLog.js";
import Device from "../models/Device.js";
import SecurityEvent from "../models/SecurityEvent.js";
import AuditLog from "../models/AuditLog.js";

import { processTransferRequest } from "../services/transferService.js";
import { hashPassword } from "../utils/password.js";
import { ROLES, ACCOUNT_STATUS, TRANSACTION_STATUS } from "../utils/enums.js";

/**
 * Integration test for transfer idempotency + atomic debit.
 *
 * This test needs a running local MongoDB. If MongoDB is not reachable
 * inside 3 seconds we skip the suite gracefully — pure-logic tests still run.
 *
 * ENV:
 *   MONGO_URL   default mongodb://localhost:27017
 *   DB_NAME     default nexusbank_test        (kept separate from dev DB)
 *
 * Run with:
 *   npm test
 */

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME_TEST || "nexusbank_test";

let mongoAvailable = false;

async function tryConnect() {
  try {
    await mongoose.connect(MONGO_URL, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 3000,
    });
    mongoAvailable = true;
  } catch (_error) {
    mongoAvailable = false;
  }
}

describe("transferService — idempotency & atomic debit", async () => {
  before(async () => {
    await tryConnect();
    if (!mongoAvailable) return;
    await Promise.all(
      [
        User,
        Account,
        Beneficiary,
        Transaction,
        FraudLog,
        Device,
        SecurityEvent,
        AuditLog,
      ].map((m) => m.deleteMany({}))
    );
  });

  after(async () => {
    if (mongoAvailable) {
      await mongoose.disconnect();
    }
  });

  it("skips gracefully when MongoDB is not available", (t) => {
    if (mongoAvailable) {
      t.diagnostic("MongoDB is available — running integration tests below.");
    } else {
      t.diagnostic(
        `MongoDB not reachable at ${MONGO_URL}. Skipping idempotency integration tests. ` +
          `Start local Mongo (or export MONGO_URL) and re-run \`npm test\` to include this suite.`
      );
      t.skip();
    }
  });

  it("same idempotencyKey → one debit, one Transaction row", async (t) => {
    if (!mongoAvailable) return t.skip();

    // Arrange: user + account + beneficiary
    const user = await User.create({
      name: "Idempotency Tester",
      email: `idem-${Date.now()}@nexusbank.test`,
      phone: "+91 98100 00099",
      passwordHash: await hashPassword("Testing@12345"),
      role: ROLES.CUSTOMER,
      accountNumber: `4829-90${Date.now().toString().slice(-8)}`,
    });
    const account = await Account.create({
      user: user._id,
      accountNumber: user.accountNumber,
      balancePaise: 100_000, // ₹1,000.00
      availableBalancePaise: 100_000,
      status: ACCOUNT_STATUS.ACTIVE,
    });
    const beneficiary = await Beneficiary.create({
      user: user._id,
      name: "Trusted Payee",
      nickname: "Friend",
      accountNumber: "12345678",
      ifsc: "HDFC0001234",
      bankName: "HDFC Bank",
      trusted: true,
    });

    const idempotencyKey = `test-idem-${Date.now()}`;
    const commonPayload = {
      userId: user._id,
      beneficiaryId: beneficiary._id,
      amountPaise: 25_000, // ₹250.00
      description: "Idempotency test",
      category: "Transfer",
      idempotencyKey,
      deviceIdentifier: "test-device",
      browser: "Chrome",
      operatingSystem: "Linux",
      ipAddress: "127.0.0.1",
      requestId: "test-req",
    };

    // Act: fire two concurrent requests with the SAME idempotencyKey.
    const [a, b] = await Promise.all([
      processTransferRequest({ ...commonPayload }),
      processTransferRequest({ ...commonPayload }),
    ]);

    // Assert: exactly one Transaction row exists for this key + one debit.
    const rows = await Transaction.find({ user: user._id, idempotencyKey }).lean();
    assert.equal(rows.length, 1, "expected exactly one Transaction row");

    const oneWasDuplicate = a.duplicated || b.duplicated;
    assert.ok(oneWasDuplicate, "expected one of the two responses to be marked duplicated");

    const refreshed = await Account.findById(account._id).lean();
    const expected = 100_000 - 25_000;
    // For a low-risk transfer the debit is 25_000; if the fraud engine ever
    // upgrades this scenario to VERIFICATION_REQUIRED, the balance stays at
    // 100_000 (pending). Either way, the balance must never be below zero
    // and must never show a double debit.
    assert.ok(
      refreshed.balancePaise === expected || refreshed.balancePaise === 100_000,
      `unexpected balance after concurrent transfers: ${refreshed.balancePaise}`
    );
    assert.ok(refreshed.balancePaise >= 0, "balance went negative");
    t.diagnostic(
      `Balance after concurrent duplicate transfers: ${refreshed.balancePaise} paise (started 100000).`
    );
  });

  it("repeat request after completion returns the original transaction", async (t) => {
    if (!mongoAvailable) return t.skip();

    const user = await User.create({
      name: "Repeat Tester",
      email: `repeat-${Date.now()}@nexusbank.test`,
      phone: "+91 98100 00100",
      passwordHash: await hashPassword("Testing@12345"),
      role: ROLES.CUSTOMER,
      accountNumber: `4829-91${Date.now().toString().slice(-8)}`,
    });
    await Account.create({
      user: user._id,
      accountNumber: user.accountNumber,
      balancePaise: 200_000,
      availableBalancePaise: 200_000,
      status: ACCOUNT_STATUS.ACTIVE,
    });
    const beneficiary = await Beneficiary.create({
      user: user._id,
      name: "Trusted Payee",
      accountNumber: "87654321",
      ifsc: "ICIC0004321",
      bankName: "ICICI Bank",
      trusted: true,
    });

    const idempotencyKey = `test-repeat-${Date.now()}`;
    const payload = {
      userId: user._id,
      beneficiaryId: beneficiary._id,
      amountPaise: 5_000,
      description: "First",
      category: "Transfer",
      idempotencyKey,
      deviceIdentifier: "test-device",
      ipAddress: "127.0.0.1",
      requestId: "test-req",
    };

    const first = await processTransferRequest(payload);
    const second = await processTransferRequest(payload);

    assert.equal(second.duplicated, true, "second call must be marked duplicated");

    const firstId = String(first.transaction.id || first.transaction._id);
    const secondId = String(second.transaction.id || second.transaction._id);
    assert.equal(firstId, secondId, "duplicate must return the same transaction id");
    t.diagnostic(`Returned original transaction id: ${firstId}`);
  });
});