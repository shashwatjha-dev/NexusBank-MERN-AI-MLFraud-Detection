import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  TRANSACTION_STATUS,
  FRAUD_DECISION,
} from "../utils/enums.js";
import { formatPaise } from "../utils/money.js";

async function safeCreate({
  user,
  type,
  title,
  body,
  priority,
  meta,
  dedupeKey,
}) {
  try {
    if (!user || !type) return null;

    if (dedupeKey) {
      const existing = await Notification.findOne({
        user,
        type,
        "meta.dedupeKey": dedupeKey,
      }).lean();

      if (existing) return existing;
    }

    const doc = await Notification.create({
      user,
      type,
      title,
      body: body || "",
      priority:
        priority || NOTIFICATION_PRIORITY.INFO,
      meta: {
        ...(meta || {}),
        ...(dedupeKey
          ? { dedupeKey }
          : {}),
      },
    });

    console.info(
      JSON.stringify({
        event: "NOTIFICATION_CREATED",
        user: String(user),
        type,
        notificationId: String(doc._id),
      })
    );

    return doc.toJSON();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "NOTIFICATION_CREATE_FAILED",
        type,
        message: error?.message,
      })
    );

    return null;
  }
}

export async function createNotification(
  payload
) {
  return safeCreate(payload);
}

export async function listForUser(
  userId,
  {
    limit = 20,
    skip = 0,
    unreadOnly = false,
  } = {}
) {
  const filter = {
    user: userId,
  };

  if (unreadOnly) {
    filter.read = false;
  }

  const [
    items,
    total,
    unread,
  ] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(filter),

    Notification.countDocuments({
      user: userId,
      read: false,
    }),
  ]);

  return {
    items,
    total,
    unread,
    limit,
    skip,
  };
}

export async function unreadCount(
  userId
) {
  return Notification.countDocuments({
    user: userId,
    read: false,
  });
}

export async function markRead(
  userId,
  notifId
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      notifId
    )
  ) {
    return null;
  }

  return Notification.findOneAndUpdate(
    {
      _id: notifId,
      user: userId,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    },
    {
      new: true,
    }
  ).lean();
}

export async function markAllRead(
  userId
) {
  const result =
    await Notification.updateMany(
      {
        user: userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

  return {
    modified:
      result.modifiedCount || 0,
  };
}

/* =========================================================
   TRANSACTION NOTIFICATION HOOK
   ========================================================= */

let hooksInitialised = false;

export function initHooks() {
  if (hooksInitialised) return;

  const Transaction =
    mongoose.model("Transaction");

  /*
   * IMPORTANT:
   * Register the hook before marking initialization complete.
   */
  Transaction.schema.post(
    "save",
    async function (doc) {
      try {
        const txId = String(doc._id);

        const amount = formatPaise(
          doc.amountPaise
        );

        /* ---------------------------------------------
           BLOCKED
        --------------------------------------------- */

        if (
          doc.fraudDecision ===
            FRAUD_DECISION.BLOCKED ||
          doc.status ===
            TRANSACTION_STATUS.BLOCKED
        ) {
          await safeCreate({
            user: doc.user,

            type:
              NOTIFICATION_TYPES.TRANSFER_BLOCKED,

            title:
              "Transfer blocked",

            body:
              `A transfer of ${amount} was blocked by NexusBank's fraud engine.`,

            priority:
              NOTIFICATION_PRIORITY.DANGER,

            meta: {
              transactionId: txId,
              amountPaise:
                doc.amountPaise,
              riskLevel:
                doc.riskLevel,
            },

            dedupeKey:
              `tx:${txId}:blocked`,
          });

          return;
        }

        /* ---------------------------------------------
           OTP / VERIFICATION REQUIRED
        --------------------------------------------- */

        if (
          doc.fraudDecision ===
            FRAUD_DECISION.VERIFICATION_REQUIRED &&
          doc.status ===
            TRANSACTION_STATUS.PENDING
        ) {
          await safeCreate({
            user: doc.user,

            type:
              NOTIFICATION_TYPES.TRANSFER_VERIFICATION_REQUIRED,

            title:
              "Verification required",

            body:
              `Confirm the ${amount} transfer with an OTP to complete it.`,

            priority:
              NOTIFICATION_PRIORITY.WARNING,

            meta: {
              transactionId: txId,
              amountPaise:
                doc.amountPaise,
              riskLevel:
                doc.riskLevel,
            },

            dedupeKey:
              `tx:${txId}:verification`,
          });

          return;
        }

        /* ---------------------------------------------
           COMPLETED
        --------------------------------------------- */

        if (
          doc.status ===
            TRANSACTION_STATUS.COMPLETED ||
          doc.fraudDecision ===
            FRAUD_DECISION.COMPLETED
        ) {
          await safeCreate({
            user: doc.user,

            type:
              NOTIFICATION_TYPES.TRANSFER_COMPLETED,

            title:
              "Transfer completed",

            body:
              `Your transfer of ${amount} was completed successfully.`,

            priority:
              NOTIFICATION_PRIORITY.SUCCESS,

            meta: {
              transactionId: txId,
              amountPaise:
                doc.amountPaise,
              riskLevel:
                doc.riskLevel,
            },

            dedupeKey:
              `tx:${txId}:completed`,
          });
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            event:
              "NOTIF_HOOK_TX_FAILED",
            message:
              error?.message,
            stack:
              error?.stack,
          })
        );
      }
    }
  );

  /* =======================================================
     FIXED DEPOSIT
     ======================================================= */

  const FixedDeposit =
    mongoose.model("FixedDeposit");

  FixedDeposit.schema.post(
    "save",
    async function (doc) {
      try {
        if (!doc.isNew) return;

        await safeCreate({
          user: doc.user,

          type:
            NOTIFICATION_TYPES.FD_CREATED,

          title:
            "Fixed Deposit booked",

          body:
            `Your ${formatPaise(
              doc.principalPaise
            )} FD has been booked successfully.`,

          priority:
            NOTIFICATION_PRIORITY.SUCCESS,

          meta: {
            fixedDepositId:
              String(doc._id),
          },

          dedupeKey:
            `fd:${doc._id}:created`,
        });
      } catch (error) {
        console.error(
          JSON.stringify({
            event:
              "NOTIF_HOOK_FD_FAILED",
            message:
              error?.message,
          })
        );
      }
    }
  );

  /* =======================================================
     PPF CONTRIBUTION
     ======================================================= */

  try {
    const PPFContribution =
      mongoose.model(
        "PPFContribution"
      );

    PPFContribution.schema.post(
      "save",
      async function (doc) {
        try {
          await safeCreate({
            user: doc.user,

            type:
              NOTIFICATION_TYPES.PPF_CONTRIBUTION,

            title:
              "PPF contribution recorded",

            body:
              `Your PPF contribution of ${formatPaise(
                doc.amountPaise
              )} has been recorded.`,

            priority:
              NOTIFICATION_PRIORITY.SUCCESS,

            meta: {
              ppfContributionId:
                String(doc._id),

              amountPaise:
                doc.amountPaise,

              financialYear:
                doc.financialYear,
            },

            dedupeKey:
              `ppf:${doc._id}:contribution`,
          });
        } catch (error) {
          console.error(
            JSON.stringify({
              event:
                "NOTIF_HOOK_PPF_FAILED",
              message:
                error?.message,
            })
          );
        }
      }
    );
  } catch {
    // Model may not exist in older environments.
  }

  hooksInitialised = true;

  console.info(
    JSON.stringify({
      event:
        "NOTIFICATION_HOOKS_INITIALISED",
    })
  );
}