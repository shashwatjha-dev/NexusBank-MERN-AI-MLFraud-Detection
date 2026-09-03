import Account from "../models/Account.js";
import Beneficiary from "../models/Beneficiary.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import FraudLog from "../models/FraudLog.js";
import LedgerEntry from "../models/LedgerEntry.js";
import Alert from "../models/Alert.js";

import { AppError } from "../utils/errors.js";
import { assertPaise, formatPaise } from "../utils/money.js";

import {
  ACCOUNT_STATUS,
  FRAUD_DECISION,
  RISK_LEVEL,
  TRANSACTION_STATUS,
  SECURITY_EVENTS,
  AUDIT_ACTIONS,
  NEXUSBANK_IFSC_PREFIX,
} from "../utils/enums.js";

import { assessTransaction } from "./fraud/fraudOrchestrator.js";
import { upsertDevice } from "./deviceService.js";

import {
  findPriorTransaction,
  isDuplicateKeyError,
} from "./idempotencyService.js";

import {
  recordAudit,
  recordSecurityEvent,
} from "./auditService.js";

import {
  issueOtp,
  verifyOtp,
} from "./otpService.js";

import {
  awardTransferReward,
} from "./rewardService.js";

/*
 * ============================================================
 * TRANSFER SECURITY CONFIGURATION
 * ============================================================
 *
 * ₹5,000 or below:
 *     Direct completion unless fraud engine BLOCKS.
 *
 * Above ₹5,000:
 *     OTP is ALWAYS required unless fraud engine BLOCKS.
 *
 * IMPORTANT:
 * Risk level and OTP requirement are separate concepts.
 *
 * LOW risk + ₹10,000
 *     -> LOW + OTP
 *
 * MEDIUM risk + ₹50,000
 *     -> MEDIUM + OTP
 *
 * HIGH risk + ₹75,000
 *     -> HIGH + OTP
 *
 * BLOCKED at any amount
 *     -> BLOCKED
 */

const OTP_THRESHOLD_PAISE = 500_000;


// ============================================================
// ALERT HELPER
// ============================================================

async function createTransferAlert({
  userId,
  type,
  title,
  message,
  severity = "INFO",
  transactionId,
  amountPaise,
  riskLevel,
}) {
  try {
    await Alert.create({
      user: userId,
      title,
      message,
      type,
      severity,
      read: false,

      metadata: {
        transactionId: transactionId
          ? String(transactionId)
          : null,

        amountPaise:
          amountPaise ?? null,

        riskLevel:
          riskLevel || null,

        source:
          "TRANSFER_SERVICE",
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event:
          "TRANSFER_ALERT_CREATE_FAILED",

        type,

        user:
          String(userId),

        transactionId:
          transactionId
            ? String(transactionId)
            : null,

        message:
          error?.message,
      })
    );
  }
}


// ============================================================
// ACCOUNT RESOLUTION
// ============================================================

async function resolveSourceAccount({
  userId,
  sourceAccountId,
}) {
  if (sourceAccountId) {
    const account =
      await Account.findOne({
        _id: sourceAccountId,
        user: userId,
      });

    if (!account) {
      throw new AppError(
        "The selected account was not found for this user.",
        "SOURCE_ACCOUNT_NOT_FOUND",
        404
      );
    }

    return account;
  }

  const primary =
    await Account.findOne({
      user: userId,
      isPrimary: true,
    });

  if (primary) {
    return primary;
  }

  const first =
    await Account.findOne({
      user: userId,
    }).sort({
      createdAt: 1,
    });

  if (!first) {
    throw new AppError(
      "Bank account not found for this user.",
      "ACCOUNT_NOT_FOUND",
      404
    );
  }

  return first;
}


// ============================================================
// INTERNAL RECIPIENT
// ============================================================

async function findInternalRecipient(
  beneficiary
) {
  if (
    !beneficiary?.ifsc?.startsWith(
      NEXUSBANK_IFSC_PREFIX
    )
  ) {
    return null;
  }

  const digits =
    String(
      beneficiary.accountNumber || ""
    ).replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const candidates =
    await Account.find({
      $or: [
        {
          accountNumber:
            beneficiary.accountNumber,
        },
        {
          accountNumber:
            digits,
        },
      ],

      status:
        ACCOUNT_STATUS.ACTIVE,
    });

  if (candidates.length === 1) {
    return candidates[0];
  }

  const digitMatch =
    candidates.find(
      (account) =>
        String(
          account.accountNumber
        ).replace(/\D/g, "") ===
        digits
    );

  return digitMatch || null;
}


const isInternalBeneficiary = (
  beneficiary
) =>
  Boolean(
    beneficiary?.ifsc?.startsWith(
      NEXUSBANK_IFSC_PREFIX
    )
  );


// ============================================================
// PROCESS TRANSFER
// ============================================================

export async function processTransferRequest({
  userId,
  beneficiaryId,
  sourceAccountId,
  amountPaise,
  description,
  category,
  idempotencyKey,
  deviceIdentifier,
  browser,
  operatingSystem,
  ipAddress,
  requestId,
}) {
  assertPaise(amountPaise);


  // ----------------------------------------------------------
  // IDEMPOTENCY
  // ----------------------------------------------------------

  const prior =
    await findPriorTransaction({
      userId,
      idempotencyKey,
    });

  if (prior) {
    return {
      transaction: prior,
      duplicated: true,
    };
  }


  // ----------------------------------------------------------
  // BENEFICIARY
  // ----------------------------------------------------------

  const beneficiary =
    await Beneficiary.findOne({
      _id: beneficiaryId,
      user: userId,
    });

  if (!beneficiary) {
    throw new AppError(
      "Beneficiary not found.",
      "BENEFICIARY_NOT_FOUND",
      404
    );
  }


  // ----------------------------------------------------------
  // SOURCE ACCOUNT
  // ----------------------------------------------------------

  const sourceAccount =
    await resolveSourceAccount({
      userId,
      sourceAccountId,
    });

  if (
    sourceAccount.status !==
    ACCOUNT_STATUS.ACTIVE
  ) {
    throw new AppError(
      "Account is not available for transfers.",
      "ACCOUNT_FROZEN",
      403
    );
  }

  if (
    sourceAccount.availableBalancePaise <
    amountPaise
  ) {
    throw new AppError(
      "Available balance is insufficient.",
      "INSUFFICIENT_BALANCE",
      400
    );
  }


  // ----------------------------------------------------------
  // INTERNAL TRANSFER
  // ----------------------------------------------------------

  const isInternal =
    isInternalBeneficiary(
      beneficiary
    );

  let recipientAccount = null;

  if (isInternal) {
    recipientAccount =
      await findInternalRecipient(
        beneficiary
      );

    if (!recipientAccount) {
      throw new AppError(
        "The internal recipient account could not be located.",
        "INTERNAL_RECIPIENT_NOT_FOUND",
        404
      );
    }

    if (
      String(
        recipientAccount._id
      ) ===
      String(
        sourceAccount._id
      )
    ) {
      throw new AppError(
        "You cannot transfer to the same account.",
        "SELF_TRANSFER_NOT_ALLOWED",
        400
      );
    }
  }


  // ----------------------------------------------------------
  // DEVICE
  // ----------------------------------------------------------

  const {
    device,
    isNew: isNewDevice,
  } = await upsertDevice({
    userId,
    deviceIdentifier,
    browser,
    operatingSystem,
  });


  // ----------------------------------------------------------
  // SECURITY EVENTS
  // ----------------------------------------------------------

  await recordSecurityEvent({
    user: userId,

    eventType:
      SECURITY_EVENTS.TRANSFER_INITIATED,

    device:
      deviceIdentifier,

    ipAddress,

    metadata: {
      amountPaise,

      beneficiaryId:
        String(
          beneficiary._id
        ),
    },
  });

  if (isNewDevice) {
    await recordSecurityEvent({
      user: userId,

      eventType:
        SECURITY_EVENTS.NEW_DEVICE_SEEN,

      device:
        deviceIdentifier,

      ipAddress,

      metadata: {
        browser,
        operatingSystem,
      },
    });
  }


  // ----------------------------------------------------------
  // FRAUD ANALYSIS
  // ----------------------------------------------------------

  const analysis =
    await assessTransaction({
      userId,
      amountPaise,
      beneficiary,
      deviceIdentifier,
      isNewDeviceHint:
        isNewDevice,
      requestId,
    });


  // ----------------------------------------------------------
  // FINAL AUTHENTICATION DECISION
  // ----------------------------------------------------------
  //
  // THIS IS THE IMPORTANT FIX.
  //
  // Fraud risk and OTP requirement are separate.
  //
  // BLOCKED:
  //     always BLOCKED
  //
  // <= ₹5,000:
  //     COMPLETED
  //
  // > ₹5,000:
  //     ALWAYS OTP
  //
  // This means:
  //
  // LOW + ₹10,000
  //     -> VERIFICATION_REQUIRED
  //
  // MEDIUM + ₹50,000
  //     -> VERIFICATION_REQUIRED
  //
  // HIGH + ₹75,000
  //     -> VERIFICATION_REQUIRED
  //
  // ----------------------------------------------------------

  let effectiveDecision;

  if (
    analysis.fraudDecision ===
    FRAUD_DECISION.BLOCKED
  ) {
    effectiveDecision =
      FRAUD_DECISION.BLOCKED;
  } else if (
    amountPaise <=
    OTP_THRESHOLD_PAISE
  ) {
    effectiveDecision =
      FRAUD_DECISION.COMPLETED;
  } else {
    effectiveDecision =
      FRAUD_DECISION.VERIFICATION_REQUIRED;
  }


  // ----------------------------------------------------------
  // DECISION REASON
  // ----------------------------------------------------------

  let effectiveDecisionReason;

  if (
    effectiveDecision ===
    FRAUD_DECISION.BLOCKED
  ) {
    effectiveDecisionReason =
      analysis.decisionReason ||
      "Transfer blocked by the NexusBank fraud engine.";
  } else if (
    amountPaise <=
    OTP_THRESHOLD_PAISE
  ) {
    effectiveDecisionReason =
      "Transfer amount is within the ₹5,000 no-OTP limit. Transaction proceeding.";
  } else {
    effectiveDecisionReason =
      `Transfer amount of ${formatPaise(
        amountPaise
      )} exceeds the ₹5,000 limit. OTP verification is required before completion.`;
  }


  // ----------------------------------------------------------
  // CREATE TRANSACTION
  // ----------------------------------------------------------

  let transaction;

  try {
    transaction =
      await Transaction.create({
        user:
          userId,

        sourceAccountId:
          sourceAccount._id,

        creditLegAccountId:
          recipientAccount?._id ||
          null,

        isInternal,

        beneficiary:
          beneficiary._id,

        amountPaise,

        description,

        category,

        type:
          "TRANSFER",

        status:
          effectiveDecision ===
          FRAUD_DECISION.BLOCKED
            ? TRANSACTION_STATUS.BLOCKED
            : TRANSACTION_STATUS.PENDING,

        fraudDecision:
          effectiveDecision,

        riskLevel:
          analysis.riskLevel,

        finalRiskScore:
          analysis.finalRiskScore,

        ruleScore:
          analysis.ruleScore,

        behaviouralScore:
          analysis.behaviouralScore,

        mlProbability:
          analysis.mlProbability,

        mlRisk:
          analysis.mlRisk,

        triggeredRules:
          analysis.triggeredRules,

        behaviouralSignals:
          analysis.behaviouralSignals,

        featureSnapshot:
          analysis.featureSnapshot,

        modelVersion:
          analysis.modelVersion,

        riskConfigurationVersion:
          analysis.riskConfigurationVersion,

        mlServiceStatus:
          analysis.mlServiceStatus,

        decisionReason:
          effectiveDecisionReason,

        device:
          deviceIdentifier,

        ipAddress,

        idempotencyKey,
      });
  } catch (error) {
    if (
      isDuplicateKeyError(error)
    ) {
      const original =
        await findPriorTransaction({
          userId,
          idempotencyKey,
        });

      if (original) {
        return {
          transaction:
            original,

          duplicated:
            true,
        };
      }
    }

    throw error;
  }


  // ----------------------------------------------------------
  // FRAUD LOG
  // ----------------------------------------------------------

  if (
    analysis.riskLevel !==
    RISK_LEVEL.LOW
  ) {
    try {
      await FraudLog.create({
        transaction:
          transaction._id,

        user:
          userId,

        riskScore:
          analysis.finalRiskScore,

        riskLevel:
          analysis.riskLevel,

        ruleScore:
          analysis.ruleScore,

        behaviouralScore:
          analysis.behaviouralScore,

        mlProbability:
          analysis.mlProbability,

        mlRisk:
          analysis.mlRisk,

        triggeredRules:
          analysis.triggeredRules,

        behaviouralSignals:
          analysis.behaviouralSignals,

        featureSnapshot:
          analysis.featureSnapshot,

        modelVersion:
          analysis.modelVersion,

        riskConfigurationVersion:
          analysis.riskConfigurationVersion,

        mlServiceStatus:
          analysis.mlServiceStatus,

        decision:
          effectiveDecision,

        reviewStatus:
          "OPEN",
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          event:
            "FRAUD_LOG_CREATE_FAILED",

          transactionId:
            String(
              transaction._id
            ),

          message:
            error?.message,
        })
      );
    }
  }


  // ----------------------------------------------------------
  // DIRECT COMPLETION
  // ----------------------------------------------------------

  let transferReward = null;

  if (
    effectiveDecision ===
    FRAUD_DECISION.COMPLETED
  ) {
    transferReward =
      await completeTransfer({
        userId,

        transaction,

        sourceAccount,

        recipientAccount,

        beneficiary,

        deviceIdentifier,

        ipAddress,
      });
  }


  // ----------------------------------------------------------
  // OTP VERIFICATION REQUIRED
  // ----------------------------------------------------------

  let transferDemoOtp;
  let transferResendInSeconds;

  if (
    effectiveDecision ===
    FRAUD_DECISION.VERIFICATION_REQUIRED
  ) {
    const user =
      await User.findById(
        userId
      ).lean();

    const otpResult =
      await issueOtp({
        purpose:
          "TRANSFER_VERIFY",

        subjectId:
          transaction._id,

        email:
          user?.email ||
          null,

        name:
          user?.name ||
          null,

        transferContext: {
          amountPaise,

          beneficiaryName:
            beneficiary?.name,

          transactionId:
            String(
              transaction._id
            ),
        },

        enforceCooldown:
          false,
      });

    transferDemoOtp =
      otpResult.demoOtp;

    transferResendInSeconds =
      otpResult.resendAvailableInSeconds;


    // --------------------------------------------------------
    // SECURITY ALERT
    // --------------------------------------------------------

    await createTransferAlert({
      userId,

      type:
        "SECURITY",

      title:
        "Verification required",

      message:
        `Confirm the ${formatPaise(
          amountPaise
        )} transfer with an OTP to complete it.`,

      severity:
        "WARNING",

      transactionId:
        transaction._id,

      amountPaise,

      riskLevel:
        analysis.riskLevel,
    });


    await recordSecurityEvent({
      user:
        userId,

      eventType:
        SECURITY_EVENTS.TRANSFER_VERIFICATION_REQUIRED,

      device:
        deviceIdentifier,

      ipAddress,

      metadata: {
        transactionId:
          String(
            transaction._id
          ),

        amountPaise,

        riskLevel:
          analysis.riskLevel,
      },
    });


    await recordAudit({
      actor:
        userId,

      targetUser:
        userId,

      action:
        AUDIT_ACTIONS.TRANSFER_VERIFICATION_REQUIRED,

      transaction:
        transaction._id,

      metadata: {
        amountPaise,

        riskScore:
          analysis.finalRiskScore,

        riskLevel:
          analysis.riskLevel,
      },

      requestId,

      ipAddress,
    });
  }


  // ----------------------------------------------------------
  // BLOCKED
  // ----------------------------------------------------------

  if (
    effectiveDecision ===
    FRAUD_DECISION.BLOCKED
  ) {
    await createTransferAlert({
      userId,

      type:
        "SECURITY",

      title:
        "Transfer blocked",

      message:
        `A transfer of ${formatPaise(
          amountPaise
        )} was blocked by NexusBank's fraud engine.`,

      severity:
        "CRITICAL",

      transactionId:
        transaction._id,

      amountPaise,

      riskLevel:
        analysis.riskLevel,
    });


    await recordSecurityEvent({
      user:
        userId,

      eventType:
        SECURITY_EVENTS.TRANSFER_BLOCKED,

      device:
        deviceIdentifier,

      ipAddress,

      metadata: {
        transactionId:
          String(
            transaction._id
          ),

        amountPaise,

        riskLevel:
          analysis.riskLevel,
      },
    });


    await recordAudit({
      actor:
        userId,

      targetUser:
        userId,

      action:
        AUDIT_ACTIONS.TRANSFER_BLOCKED,

      transaction:
        transaction._id,

      metadata: {
        amountPaise,

        riskScore:
          analysis.finalRiskScore,

        riskLevel:
          analysis.riskLevel,
      },

      requestId,

      ipAddress,
    });
  }


  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  return {
    transaction: {
      ...transaction.toJSON(),

      ...(transferDemoOtp
        ? {
            demoOtp:
              transferDemoOtp,
          }
        : {}),

      ...(transferResendInSeconds
        ? {
            resendAvailableInSeconds:
              transferResendInSeconds,
          }
        : {}),

      ...(transferReward
        ? {
            reward: {
              points:
                transferReward.points,

              message:
                `Congratulations! You earned ${transferReward.points} reward points.`,
            },
          }
        : {}),
    },

    duplicated:
      false,

    device,
  };
}


// ============================================================
// COMPLETE TRANSFER
// ============================================================

async function completeTransfer({
  userId,
  transaction,
  sourceAccount,
  recipientAccount,
  beneficiary,
  deviceIdentifier,
  ipAddress,
}) {
  const amountPaise =
    transaction.amountPaise;

  const reference =
    String(
      transaction._id
    );


  // ----------------------------------------------------------
  // DEBIT SOURCE ACCOUNT
  // ----------------------------------------------------------

  const debitedSource =
    await Account.findOneAndUpdate(
      {
        _id:
          sourceAccount._id,

        user:
          userId,

        status:
          ACCOUNT_STATUS.ACTIVE,

        availableBalancePaise: {
          $gte:
            amountPaise,
        },
      },

      {
        $inc: {
          balancePaise:
            -amountPaise,

          availableBalancePaise:
            -amountPaise,
        },
      },

      {
        new: true,
      }
    );


  if (!debitedSource) {
    transaction.status =
      TRANSACTION_STATUS.FAILED;

    transaction.decisionReason =
      "Balance changed before completion.";

    await transaction.save();

    throw new AppError(
      "Balance changed before completion.",
      "INSUFFICIENT_BALANCE",
      409
    );
  }


  const sourceBalanceAfter =
    debitedSource.balancePaise;

  const sourceBalanceBefore =
    sourceBalanceAfter +
    amountPaise;


  // ----------------------------------------------------------
  // INTERNAL TRANSFER
  // ----------------------------------------------------------

  if (
    transaction.isInternal &&
    recipientAccount
  ) {
    const creditedRecipient =
      await Account.findOneAndUpdate(
        {
          _id:
            recipientAccount._id,

          status:
            ACCOUNT_STATUS.ACTIVE,
        },

        {
          $inc: {
            balancePaise:
              amountPaise,

            availableBalancePaise:
              amountPaise,
          },
        },

        {
          new: true,
        }
      );


    if (!creditedRecipient) {
      await Account.updateOne(
        {
          _id:
            sourceAccount._id,
        },

        {
          $inc: {
            balancePaise:
              amountPaise,

            availableBalancePaise:
              amountPaise,
          },
        }
      );


      transaction.status =
        TRANSACTION_STATUS.FAILED;

      transaction.decisionReason =
        "Recipient account is unavailable — refunded.";

      await transaction.save();

      throw new AppError(
        "Recipient account is unavailable. Your account was not debited.",
        "INTERNAL_CREDIT_FAILED",
        409
      );
    }


    const recipientBalanceAfter =
      creditedRecipient.balancePaise;

    const recipientBalanceBefore =
      recipientBalanceAfter -
      amountPaise;


    await LedgerEntry.insertMany([
      {
        transaction:
          transaction._id,

        account:
          sourceAccount._id,

        user:
          userId,

        direction:
          "DEBIT",

        entryType:
          "TRANSFER_OUT",

        amountPaise,

        balanceBeforePaise:
          sourceBalanceBefore,

        balanceAfterPaise:
          sourceBalanceAfter,

        reference,

        counterpartyAccount:
          recipientAccount._id,

        counterpartyName:
          beneficiary?.name ||
          null,

        counterpartyIfsc:
          beneficiary?.ifsc ||
          null,

        counterpartyAccountNumber:
          beneficiary?.accountNumber ||
          null,

        description:
          transaction.description ||
          null,

        category:
          transaction.category ||
          null,
      },

      {
        transaction:
          transaction._id,

        account:
          recipientAccount._id,

        user:
          recipientAccount.user,

        direction:
          "CREDIT",

        entryType:
          "TRANSFER_IN",

        amountPaise,

        balanceBeforePaise:
          recipientBalanceBefore,

        balanceAfterPaise:
          recipientBalanceAfter,

        reference,

        counterpartyAccount:
          sourceAccount._id,

        counterpartyName:
          null,

        counterpartyIfsc:
          sourceAccount.ifsc,

        counterpartyAccountNumber:
          sourceAccount.accountNumber,

        description:
          transaction.description ||
          "Received transfer",

        category:
          transaction.category ||
          "Transfer",
      },
    ]);
  } else {
    // --------------------------------------------------------
    // EXTERNAL TRANSFER
    // --------------------------------------------------------

    await LedgerEntry.create({
      transaction:
        transaction._id,

      account:
        sourceAccount._id,

      user:
        userId,

      direction:
        "DEBIT",

      entryType:
        "TRANSFER_OUT",

      amountPaise,

      balanceBeforePaise:
        sourceBalanceBefore,

      balanceAfterPaise:
        sourceBalanceAfter,

      reference,

      counterpartyAccount:
        null,

      counterpartyName:
        beneficiary?.name ||
        null,

      counterpartyIfsc:
        beneficiary?.ifsc ||
        null,

      counterpartyAccountNumber:
        beneficiary?.accountNumber ||
        null,

      description:
        transaction.description ||
        null,

      category:
        transaction.category ||
        null,
    });
  }


  // ----------------------------------------------------------
  // MARK COMPLETED
  // ----------------------------------------------------------

  transaction.status =
    TRANSACTION_STATUS.COMPLETED;

  transaction.fraudDecision =
    FRAUD_DECISION.COMPLETED;

  await transaction.save();


  // ----------------------------------------------------------
  // REWARD
  // ----------------------------------------------------------

  const reward =
    await awardTransferReward({
      userId,

      amountPaise,
    });


  // ----------------------------------------------------------
  // TRANSACTION ALERT
  // ----------------------------------------------------------

  await createTransferAlert({
    userId,

    type:
      "TRANSACTION",

    title:
      "Transfer completed",

    message:
      `Your transfer of ${formatPaise(
        amountPaise
      )} was completed successfully.`,

    severity:
      "INFO",

    transactionId:
      transaction._id,

    amountPaise,

    riskLevel:
      transaction.riskLevel,
  });


  // ----------------------------------------------------------
  // TRUST BENEFICIARY
  // ----------------------------------------------------------

  if (
    beneficiary &&
    !beneficiary.trusted
  ) {
    beneficiary.trusted =
      true;

    beneficiary.riskLevel =
      RISK_LEVEL.LOW;

    await beneficiary.save();
  }


  // ----------------------------------------------------------
  // SECURITY EVENT
  // ----------------------------------------------------------

  await recordSecurityEvent({
    user:
      userId,

    eventType:
      SECURITY_EVENTS.TRANSFER_COMPLETED,

    device:
      deviceIdentifier,

    ipAddress,

    metadata: {
      transactionId:
        String(
          transaction._id
        ),

      amountPaise,
    },
  });


  // ----------------------------------------------------------
  // AUDIT
  // ----------------------------------------------------------

  await recordAudit({
    actor:
      userId,

    targetUser:
      userId,

    action:
      AUDIT_ACTIONS.TRANSFER_COMPLETED,

    transaction:
      transaction._id,

    metadata: {
      amountPaise,

      isInternal:
        transaction.isInternal,

      rewardPoints:
        reward?.points ||
        0,
    },

    ipAddress,
  });


  return reward;
}


// ============================================================
// OTP VERIFICATION
// ============================================================

export async function verifyPendingTransfer({
  userId,
  transactionId,
  otp,
  deviceIdentifier,
  ipAddress,
}) {
  const transaction =
    await Transaction.findOne({
      _id:
        transactionId,

      user:
        userId,
    });


  if (!transaction) {
    throw new AppError(
      "Transaction not found.",
      "RESOURCE_NOT_FOUND",
      404
    );
  }


  if (
    transaction.status !==
    TRANSACTION_STATUS.PENDING
  ) {
    throw new AppError(
      "This transaction is not awaiting verification.",
      "TRANSACTION_NOT_PENDING",
      409
    );
  }


  if (
    transaction.fraudDecision !==
    FRAUD_DECISION.VERIFICATION_REQUIRED
  ) {
    throw new AppError(
      "This transaction does not require verification.",
      "VERIFICATION_NOT_REQUIRED",
      409
    );
  }


  const result =
    await verifyOtp({
      purpose:
        "TRANSFER_VERIFY",

      subjectId:
        transactionId,

      otp,
    });


  if (!result.valid) {
    throw new AppError(
      "The OTP is invalid or expired.",
      result.code ||
        "OTP_INVALID",
      401
    );
  }


  transaction.otpVerifiedAt =
    new Date();

  await transaction.save();


  const sourceAccount =
    transaction.sourceAccountId
      ? await Account.findOne({
          _id:
            transaction.sourceAccountId,

          user:
            userId,
        })
      : await Account.findOne({
          user:
            userId,

          isPrimary:
            true,
        }) ||
        await Account.findOne({
          user:
            userId,
        });


  if (!sourceAccount) {
    transaction.status =
      TRANSACTION_STATUS.FAILED;

    transaction.decisionReason =
      "Source account no longer exists.";

    await transaction.save();

    throw new AppError(
      "Source account not found.",
      "ACCOUNT_NOT_FOUND",
      404
    );
  }


  const recipientAccount =
    transaction.isInternal &&
    transaction.creditLegAccountId
      ? await Account.findOne({
          _id:
            transaction.creditLegAccountId,
        })
      : null;


  const beneficiary =
    await Beneficiary.findById(
      transaction.beneficiary
    );


  const reward =
    await completeTransfer({
      userId,

      transaction,

      sourceAccount,

      recipientAccount,

      beneficiary,

      deviceIdentifier,

      ipAddress,
    });


  return {
    ...transaction.toJSON(),

    ...(reward
      ? {
          reward: {
            points:
              reward.points,

            message:
              `Congratulations! You earned ${reward.points} reward points.`,
          },
        }
      : {}),
  };
}


// ============================================================
// RESEND OTP
// ============================================================

export async function resendTransferOtp({
  userId,
  transactionId,
  ipAddress,
}) {
  const transaction =
    await Transaction.findOne({
      _id:
        transactionId,

      user:
        userId,
    });


  if (!transaction) {
    throw new AppError(
      "Transaction not found.",
      "RESOURCE_NOT_FOUND",
      404
    );
  }


  if (
    transaction.status !==
    TRANSACTION_STATUS.PENDING
  ) {
    throw new AppError(
      "This transaction is not awaiting verification.",
      "TRANSACTION_NOT_PENDING",
      409
    );
  }


  if (
    transaction.fraudDecision !==
    FRAUD_DECISION.VERIFICATION_REQUIRED
  ) {
    throw new AppError(
      "This transaction does not require verification.",
      "VERIFICATION_NOT_REQUIRED",
      409
    );
  }


  const [
    user,
    beneficiary,
  ] = await Promise.all([
    User.findById(
      userId
    ).lean(),

    Beneficiary.findById(
      transaction.beneficiary
    ).lean(),
  ]);


  const otpResult =
    await issueOtp({
      purpose:
        "TRANSFER_VERIFY",

      subjectId:
        transaction._id,

      email:
        user?.email ||
        null,

      name:
        user?.name ||
        null,

      transferContext: {
        amountPaise:
          transaction.amountPaise,

        beneficiaryName:
          beneficiary?.name,

        transactionId:
          String(
            transaction._id
          ),
      },

      enforceCooldown:
        true,
    });


  await recordSecurityEvent({
    user:
      userId,

    eventType:
      SECURITY_EVENTS.OTP_ISSUED,

    ipAddress,

    metadata: {
      transactionId:
        String(
          transaction._id
        ),

      reason:
        "resend",
    },
  });


  return {
    expiresInSeconds:
      otpResult.expiresInSeconds,

    resendAvailableInSeconds:
      otpResult.resendAvailableInSeconds,

    demoOtp:
      otpResult.demoOtp,
  };
}


// ============================================================
// FRAUD DEMO
// ============================================================

export async function previewTransferRisk({
  userId,
  amountPaise,
  beneficiary,
  deviceIdentifier,
  requestId,
}) {
  return assessTransaction({
    userId,
    amountPaise,
    beneficiary,
    deviceIdentifier,
    requestId,
  });
}