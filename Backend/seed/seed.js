/**
 * NexusBank seed script (Phase 5 aware).
 *
 * When the database has no seeded users the script creates the full demo
 * dataset (admin + 3 customers) exactly like Phase 4 — plus every customer
 * gets a Salary Account in addition to their primary Savings Account so
 * the multi-account dashboards look populated on first run.
 *
 * When the database already contains seeded users, the script is
 * NON-DESTRUCTIVE: it only adds the missing secondary accounts, and
 * back-fills `isPrimary/ifsc/branch` on existing accounts. No transactions,
 * fraud logs, audit logs, alerts or rewards are ever touched.
 *
 * Run:
 *   npm run seed
 */

import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import User from "../models/User.js";
import Account from "../models/Account.js";
import Beneficiary from "../models/Beneficiary.js";
import Transaction from "../models/Transaction.js";
import FraudLog from "../models/FraudLog.js";
import Device from "../models/Device.js";
import SecurityEvent from "../models/SecurityEvent.js";
import FixedDeposit from "../models/FixedDeposit.js";
import Reward from "../models/Reward.js";
import Alert from "../models/Alert.js";
import AuditLog from "../models/AuditLog.js";
import { hashPassword } from "../utils/password.js";
import { assessTransaction } from "../services/fraud/fraudOrchestrator.js";
import {
  ROLES,
  ACCOUNT_STATUS,
  TRANSACTION_STATUS,
  FRAUD_DECISION,
  RISK_LEVEL,
  SECURITY_EVENTS,
  AUDIT_ACTIONS,
} from "../utils/enums.js";

// ---------- helpers ----------

const rupees = (n) => Math.round(n * 100);
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);
const uid = () => new mongoose.Types.ObjectId().toString();

const DEFAULT_IFSC = "NEXB0000001";
const DEFAULT_BRANCH = "NexusBank — Bengaluru Central";

async function clearAllCollections() {
  const models = [
    User, Account, Beneficiary, Transaction, FraudLog,
    Device, SecurityEvent, FixedDeposit, Reward, Alert, AuditLog,
  ];
  await Promise.all(models.map((m) => m.deleteMany({})));
}

async function createUser({ name, email, phone, password, role, accountNumber, balancePaise, label = "Primary Savings" }) {
  const user = await User.create({
    name, email, phone,
    passwordHash: await hashPassword(password),
    role, accountNumber,
    verificationStatus: "VERIFIED",
    securityScore: 92,
  });
  const account = await Account.create({
    user: user._id,
    accountNumber,
    accountType: "SAVINGS",
    label,
    ifsc: DEFAULT_IFSC,
    branch: DEFAULT_BRANCH,
    balancePaise,
    availableBalancePaise: balancePaise,
    currency: "INR",
    status: ACCOUNT_STATUS.ACTIVE,
    isPrimary: true,
  });
  return { user, account };
}

async function seedTransaction({
  user, account, beneficiary, amountPaise, description, category,
  createdAt, deviceIdentifier, isNewDeviceHint = false,
}) {
  const analysis = await assessTransaction({
    userId: user._id, amountPaise, beneficiary, deviceIdentifier,
    isNewDeviceHint, requestId: `seed-${uid()}`, now: createdAt,
  });

  const isBlocked = analysis.riskLevel === RISK_LEVEL.HIGH;
  const status = isBlocked ? TRANSACTION_STATUS.BLOCKED : TRANSACTION_STATUS.COMPLETED;

  const transaction = await Transaction.create({
    user: user._id, beneficiary: beneficiary._id, amountPaise,
    description, category, idempotencyKey: `seed-${uid()}`,
    device: deviceIdentifier, status,
    fraudDecision: analysis.fraudDecision, riskLevel: analysis.riskLevel,
    finalRiskScore: analysis.finalRiskScore, ruleScore: analysis.ruleScore,
    behaviouralScore: analysis.behaviouralScore, mlProbability: analysis.mlProbability,
    mlRisk: analysis.mlRisk, triggeredRules: analysis.triggeredRules,
    behaviouralSignals: analysis.behaviouralSignals, featureSnapshot: analysis.featureSnapshot,
    modelVersion: analysis.modelVersion, riskConfigurationVersion: analysis.riskConfigurationVersion,
    mlServiceStatus: analysis.mlServiceStatus, decisionReason: analysis.decisionReason,
    otpVerifiedAt: analysis.fraudDecision === FRAUD_DECISION.VERIFICATION_REQUIRED
      ? new Date(createdAt.getTime() + 60_000) : null,
    createdAt, updatedAt: createdAt,
  });

  await Transaction.updateOne({ _id: transaction._id }, { $set: { createdAt, updatedAt: createdAt } });

  if (analysis.riskLevel !== RISK_LEVEL.LOW) {
    await FraudLog.create({
      transaction: transaction._id, user: user._id,
      riskScore: analysis.finalRiskScore, riskLevel: analysis.riskLevel,
      ruleScore: analysis.ruleScore, behaviouralScore: analysis.behaviouralScore,
      mlProbability: analysis.mlProbability, mlRisk: analysis.mlRisk,
      triggeredRules: analysis.triggeredRules, behaviouralSignals: analysis.behaviouralSignals,
      featureSnapshot: analysis.featureSnapshot, modelVersion: analysis.modelVersion,
      riskConfigurationVersion: analysis.riskConfigurationVersion,
      mlServiceStatus: analysis.mlServiceStatus, decision: analysis.fraudDecision,
      reviewStatus: "OPEN", createdAt, updatedAt: createdAt,
    });
  }

  if (!isBlocked) {
    await Account.updateOne(
      { _id: account._id },
      { $inc: { balancePaise: -amountPaise, availableBalancePaise: -amountPaise } }
    );
  }

  await AuditLog.create({
    actor: user._id, targetUser: user._id, transaction: transaction._id,
    action: isBlocked ? AUDIT_ACTIONS.TRANSFER_BLOCKED : AUDIT_ACTIONS.TRANSFER_COMPLETED,
    metadata: { amountPaise, riskLevel: analysis.riskLevel },
    requestId: `seed-${uid()}`, createdAt,
  });

  return { transaction, analysis };
}

// ---------- data ----------

const ADMIN = {
  name: "Priya Sharma (Admin)", email: "admin@nexusbank.dev",
  phone: "+91 98100 00001", password: "Admin@12345",
  role: ROLES.ADMIN, accountNumber: "4829-10000001", balancePaise: rupees(0),
};

const CUSTOMERS = [
  {
    name: "Aisha Verma", email: "aisha@nexusbank.dev",
    phone: "+91 98100 00002", password: "Aisha@12345",
    accountNumber: "4829-20000002", openingBalancePaise: rupees(842560),
    knownDevice: "aisha-macbook-chrome", newDevice: "aisha-unknown-android",
    secondary: { accountNumber: "482930000012", accountType: "CURRENT", label: "Salary Account", balancePaise: rupees(325000) },
  },
  {
    name: "Rohan Iyer", email: "rohan@nexusbank.dev",
    phone: "+91 98100 00003", password: "Rohan@12345",
    accountNumber: "4829-20000003", openingBalancePaise: rupees(125000),
    knownDevice: "rohan-thinkpad-firefox", newDevice: "rohan-unknown-iphone",
    secondary: { accountNumber: "482930000013", accountType: "SAVINGS", label: "Family Savings", balancePaise: rupees(78000) },
  },
  {
    name: "Meera Kapoor", email: "meera@nexusbank.dev",
    phone: "+91 98100 00004", password: "Meera@12345",
    accountNumber: "4829-20000004", openingBalancePaise: rupees(450000),
    knownDevice: "meera-ipad-safari", newDevice: "meera-unknown-desktop",
    secondary: { accountNumber: "482930000014", accountType: "CURRENT", label: "Business Current", balancePaise: rupees(180000) },
  },
];

const BENEFICIARIES = [
  { name: "Rent — Ashoka Apartments", bankName: "HDFC Bank", ifsc: "HDFC0001234", accountNumber: "50100123456789", nickname: "Landlord", daysOld: 240, trusted: true },
  { name: "Zomato Bills", bankName: "ICICI Bank", ifsc: "ICIC0004321", accountNumber: "004301250011", nickname: "Food", daysOld: 200, trusted: true },
  { name: "Ayaan Sharma", bankName: "State Bank of India", ifsc: "SBIN0005678", accountNumber: "34567890123", nickname: "Friend", daysOld: 110, trusted: true },
  { name: "Nexus Electronics", bankName: "Axis Bank", ifsc: "UTIB0009876", accountNumber: "918010012345", nickname: "Electronics", daysOld: 45, trusted: true },
  { name: "Rahul Menon", bankName: "Yes Bank", ifsc: "YESB0000123", accountNumber: "056677889900", nickname: "Colleague", daysOld: 3, trusted: false },
];

function transactionScriptFor(customerIndex) {
  const base = [
    { daysAgo: 45, amount: 15000, description: "Monthly rent", category: "Bills", beneficiaryIndex: 0, deviceKind: "known" },
    { daysAgo: 42, amount: 780, description: "Zomato dinner", category: "Food", beneficiaryIndex: 1, deviceKind: "known" },
    { daysAgo: 38, amount: 4200, description: "Loan repayment to Ayaan", category: "Transfer", beneficiaryIndex: 2, deviceKind: "known" },
    { daysAgo: 30, amount: 18500, description: "Weekend electronics", category: "Shopping", beneficiaryIndex: 3, deviceKind: "known" },
    { daysAgo: 25, amount: 620, description: "Zomato lunch", category: "Food", beneficiaryIndex: 1, deviceKind: "known" },
    { daysAgo: 15, amount: 15000, description: "Monthly rent", category: "Bills", beneficiaryIndex: 0, deviceKind: "known" },
    { daysAgo: 12, amount: 1850, description: "Zomato groceries", category: "Food", beneficiaryIndex: 1, deviceKind: "known" },
    { daysAgo: 7, amount: 2450, description: "Weekend split with Ayaan", category: "Transfer", beneficiaryIndex: 2, deviceKind: "known" },
    { hoursAgo: 40, amount: 35000, description: "Transfer to new colleague", category: "Transfer", beneficiaryIndex: 4, deviceKind: "known" },
    { hoursAgo: 4, amount: 75000, description: "Late night electronics splurge", category: "Shopping", beneficiaryIndex: 4, deviceKind: "new" },
  ];
  return base.map((row) => ({ ...row, amount: Math.round(row.amount * (1 + customerIndex * 0.15)) }));
}

// ---------- full seed (empty DB) ----------

async function runFullSeed() {
  await clearAllCollections();

  const { user: admin } = await createUser(ADMIN);

  const customerContexts = [];
  for (let index = 0; index < CUSTOMERS.length; index += 1) {
    const spec = CUSTOMERS[index];
    const { user, account } = await createUser({
      name: spec.name, email: spec.email, phone: spec.phone,
      password: spec.password, role: ROLES.CUSTOMER,
      accountNumber: spec.accountNumber, balancePaise: spec.openingBalancePaise,
      label: "Primary Savings",
    });

    // Secondary account (Phase 5 multi-account).
    if (spec.secondary) {
      await Account.create({
        user: user._id,
        accountNumber: spec.secondary.accountNumber,
        accountType: spec.secondary.accountType,
        label: spec.secondary.label,
        ifsc: DEFAULT_IFSC, branch: DEFAULT_BRANCH,
        balancePaise: spec.secondary.balancePaise,
        availableBalancePaise: spec.secondary.balancePaise,
        currency: "INR", status: ACCOUNT_STATUS.ACTIVE, isPrimary: false,
      });
    }

    const beneficiaries = [];
    for (const template of BENEFICIARIES) {
      const createdAt = daysAgo(template.daysOld);
      const b = await Beneficiary.create({
        user: user._id, name: template.name, nickname: template.nickname,
        bankName: template.bankName, ifsc: template.ifsc,
        accountNumber: template.accountNumber, trusted: template.trusted,
        riskLevel: template.trusted ? RISK_LEVEL.LOW : RISK_LEVEL.MEDIUM,
        createdAt, updatedAt: createdAt,
      });
      await Beneficiary.updateOne({ _id: b._id }, { $set: { createdAt, updatedAt: createdAt } });
      beneficiaries.push(b);
    }

    await Device.create({
      user: user._id, deviceIdentifier: spec.knownDevice,
      browser: "Chrome", operatingSystem: "macOS", trusted: true,
      firstSeenAt: daysAgo(180), lastSeenAt: hoursAgo(6),
    });

    await SecurityEvent.insertMany([
      { user: user._id, eventType: SECURITY_EVENTS.LOGIN, device: spec.knownDevice, createdAt: daysAgo(10) },
      { user: user._id, eventType: SECURITY_EVENTS.OTP_VERIFIED, device: spec.knownDevice, createdAt: daysAgo(10) },
      { user: user._id, eventType: SECURITY_EVENTS.LOGIN, device: spec.knownDevice, createdAt: daysAgo(3) },
      { user: user._id, eventType: SECURITY_EVENTS.LOGIN_FAILED, device: spec.newDevice, createdAt: hoursAgo(6) },
      { user: user._id, eventType: SECURITY_EVENTS.NEW_DEVICE_SEEN, device: spec.newDevice, metadata: { browser: "Chrome", operatingSystem: "Android" }, createdAt: hoursAgo(4) },
    ]);

    await Alert.insertMany([
      { user: user._id, title: "Welcome to NexusBank", message: "Your account is set up and ready.", type: "SYSTEM", severity: "INFO", read: true, createdAt: daysAgo(60) },
      { user: user._id, title: "New login detected", message: "A new sign-in was detected from an unfamiliar device.", type: "SECURITY", severity: "WARNING", read: false, createdAt: hoursAgo(6) },
      { user: user._id, title: "Reward points added", message: "You earned 120 points on your recent transfers.", type: "REWARD", severity: "INFO", read: false, createdAt: daysAgo(2) },
    ]);

    await Reward.insertMany([
      { user: user._id, points: 250, reason: "Welcome bonus", type: "BONUS", createdAt: daysAgo(60) },
      { user: user._id, points: 40, reason: "Trusted transfer", type: "EARNED", createdAt: daysAgo(30) },
      { user: user._id, points: 80, reason: "Trusted transfer", type: "EARNED", createdAt: daysAgo(15) },
      { user: user._id, points: 120, reason: "Monthly loyalty", type: "EARNED", createdAt: daysAgo(2) },
    ]);

    const principal = Math.round(spec.openingBalancePaise * 0.1);
    const interestRate = 7.25;
    const durationMonths = 12;
    const maturityAmount = Math.round(principal * (1 + (interestRate / 100) * (durationMonths / 12)));
    await FixedDeposit.create({
      user: user._id, principalPaise: principal, interestRate,
      durationMonths, maturityAmountPaise: maturityAmount,
      startDate: daysAgo(30), maturityDate: daysAgo(-335), status: "ACTIVE",
    });

    customerContexts.push({ user, account, beneficiaries, spec });
  }

  for (let i = 0; i < customerContexts.length; i += 1) {
    const ctx = customerContexts[i];
    const script = transactionScriptFor(i);
    for (const step of script) {
      const beneficiary = ctx.beneficiaries[step.beneficiaryIndex];
      const createdAt = step.daysAgo !== undefined ? daysAgo(step.daysAgo) : hoursAgo(step.hoursAgo);
      const deviceIdentifier = step.deviceKind === "new" ? ctx.spec.newDevice : ctx.spec.knownDevice;
      await seedTransaction({
        user: ctx.user, account: ctx.account, beneficiary,
        amountPaise: rupees(step.amount), description: step.description,
        category: step.category, createdAt, deviceIdentifier,
        isNewDeviceHint: step.deviceKind === "new",
      });
    }
  }

  await SecurityEvent.create({
    user: admin._id, eventType: SECURITY_EVENTS.LOGIN,
    device: "admin-workstation", createdAt: daysAgo(1),
  });
  await AuditLog.create({
    actor: admin._id, targetUser: admin._id,
    action: AUDIT_ACTIONS.USER_LOGIN, createdAt: daysAgo(1),
  });
}

// ---------- non-destructive migration (existing DB) ----------

async function runMigrationOnly() {
  console.info(JSON.stringify({ event: "SEED_MIGRATION_ONLY" }));

  // 1. Back-fill isPrimary / ifsc / branch on existing accounts.
  const usersWithAccounts = await Account.distinct("user");
  for (const userId of usersWithAccounts) {
    const accounts = await Account.find({ user: userId }).sort({ createdAt: 1 });
    if (!accounts.length) continue;
    const hasPrimary = accounts.some((a) => a.isPrimary === true);
    for (let i = 0; i < accounts.length; i += 1) {
      const a = accounts[i];
      const updates = {};
      if (!a.ifsc) updates.ifsc = DEFAULT_IFSC;
      if (!a.branch) updates.branch = DEFAULT_BRANCH;
      if (!hasPrimary && i === 0) updates.isPrimary = true;
      if (Object.keys(updates).length) {
        // eslint-disable-next-line no-await-in-loop
        await Account.updateOne({ _id: a._id }, { $set: updates });
      }
    }
  }

  // 2. Ensure each demo customer has a secondary account.
  for (const spec of CUSTOMERS) {
    const user = await User.findOne({ email: spec.email }); // eslint-disable-line no-await-in-loop
    if (!user) continue;
    const count = await Account.countDocuments({ user: user._id }); // eslint-disable-line no-await-in-loop
    if (count >= 2 || !spec.secondary) continue;
    // eslint-disable-next-line no-await-in-loop
    await Account.create({
      user: user._id,
      accountNumber: spec.secondary.accountNumber,
      accountType: spec.secondary.accountType,
      label: spec.secondary.label,
      ifsc: DEFAULT_IFSC, branch: DEFAULT_BRANCH,
      balancePaise: spec.secondary.balancePaise,
      availableBalancePaise: spec.secondary.balancePaise,
      currency: "INR", status: ACCOUNT_STATUS.ACTIVE, isPrimary: false,
    });
  }
}

// ---------- entrypoint ----------

async function main() {
  await connectDatabase();
  console.info(JSON.stringify({ event: "SEED_START" }));

  const existingUsers = await User.countDocuments({});
  const forceFresh = process.argv.includes("--fresh");

  if (existingUsers === 0 || forceFresh) {
    await runFullSeed();
  } else {
    await runMigrationOnly();
  }

  console.info(JSON.stringify({
    event: "SEED_COMPLETE",
    mode: existingUsers === 0 || forceFresh ? "FULL" : "MIGRATION_ONLY",
    admin: { email: ADMIN.email, password: ADMIN.password },
    customers: CUSTOMERS.map((c) => ({ email: c.email, password: c.password })),
  }));

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(JSON.stringify({ event: "SEED_FAILED", message: error?.message, stack: error?.stack }));
  try { await disconnectDatabase(); } catch { /* ignore */ }
  process.exit(1);
});