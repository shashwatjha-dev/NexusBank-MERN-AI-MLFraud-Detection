import AuditLog from "../models/AuditLog.js";
import SecurityEvent from "../models/SecurityEvent.js";
import Alert from "../models/Alert.js";

/**
 * Write-only audit + security logging.
 *
 * These functions never throw — a logging failure must not roll back
 * the business transaction it is observing.
 *
 * Audit logs remain in AuditLog.
 * Security events remain in SecurityEvent.
 *
 * Additionally, important security events create an in-app Alert
 * so they appear in the customer's Alerts page.
 */

// ============================================================
// AUDIT LOG
// ============================================================

export async function recordAudit(payload) {
  try {
    return await AuditLog.create(payload);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "AUDIT_WRITE_FAILED",
        payload,
        message: error?.message,
      })
    );

    return null;
  }
}


// ============================================================
// SECURITY ALERT CONFIGURATION
// ============================================================

const SECURITY_ALERTS = {
  LOGIN: {
    title: "New login detected",
    message:
      "A new login to your NexusBank account was detected.",
    severity: "INFO",
  },

  LOGIN_FAILED: {
    title: "Failed login attempt",
    message:
      "A failed login attempt was detected on your NexusBank account.",
    severity: "WARNING",
  },

  LOGOUT: {
    title: "You signed out",
    message:
      "Your NexusBank session was signed out successfully.",
    severity: "INFO",
  },

  OTP_ISSUED: {
    title: "OTP verification requested",
    message:
      "A verification OTP was requested for your NexusBank account.",
    severity: "INFO",
  },

  OTP_VERIFIED: {
    title: "OTP verified",
    message:
      "Your NexusBank verification OTP was successfully verified.",
    severity: "INFO",
  },

  OTP_FAILED: {
    title: "OTP verification failed",
    message:
      "An incorrect or expired OTP was entered for your NexusBank account.",
    severity: "WARNING",
  },

  PASSWORD_CHANGED: {
    title: "Password changed",
    message:
      "Your NexusBank account password was changed successfully.",
    severity: "INFO",
  },

  BENEFICIARY_ADDED: {
    title: "New beneficiary added",
    message:
      "A new beneficiary was added to your NexusBank account.",
    severity: "WARNING",
  },

  BENEFICIARY_REMOVED: {
    title: "Beneficiary removed",
    message:
      "A beneficiary was removed from your NexusBank account.",
    severity: "WARNING",
  },

  NEW_DEVICE_SEEN: {
    title: "New device detected",
    message:
      "Your NexusBank account was accessed from a new device.",
    severity: "WARNING",
  },

  ACCOUNT_OPENED: {
    title: "Account opened",
    message:
      "A new NexusBank account was opened successfully.",
    severity: "INFO",
  },

  ACCOUNT_PRIMARY_CHANGED: {
    title: "Primary account changed",
    message:
      "Your primary NexusBank account was changed.",
    severity: "INFO",
  },
};


// ============================================================
// SECURITY EVENT
// ============================================================

export async function recordSecurityEvent(
  payload
) {
  try {
    const securityEvent =
      await SecurityEvent.create(
        payload
      );

    /*
     * --------------------------------------------------------
     * CREATE CUSTOMER-FACING SECURITY ALERT
     * --------------------------------------------------------
     *
     * Transfer events are intentionally excluded here.
     * Transfer alerts are handled by transferService.js:
     *
     *   TRANSFER_COMPLETED
     *   TRANSFER_VERIFICATION_REQUIRED
     *   TRANSFER_BLOCKED
     *
     * This prevents duplicate alerts.
     */

    const eventType =
      payload?.eventType;

    const alertConfig =
      SECURITY_ALERTS[eventType];

    if (
      alertConfig &&
      payload?.user
    ) {
      try {
        await Alert.create({
          user: payload.user,

          title:
            alertConfig.title,

          message:
            alertConfig.message,

          type: "SECURITY",

          severity:
            alertConfig.severity,

          read: false,

          metadata: {
            securityEventId:
              String(
                securityEvent._id
              ),

            eventType,

            device:
              payload.device ||
              null,

            ipAddress:
              payload.ipAddress ||
              null,

            ...(payload.metadata ||
              {}),
          },
        });
      } catch (alertError) {
        /*
         * Alert failure must NEVER break
         * the underlying security-event logging.
         */
        console.error(
          JSON.stringify({
            event:
              "SECURITY_ALERT_CREATE_FAILED",

            securityEvent:
              String(
                securityEvent._id
              ),

            eventType,

            message:
              alertError?.message,
          })
        );
      }
    }

    return securityEvent;
  } catch (error) {
    console.error(
      JSON.stringify({
        event:
          "SECURITY_EVENT_WRITE_FAILED",

        payload,

        message:
          error?.message,
      })
    );

    return null;
  }
}