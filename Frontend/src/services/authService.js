import {
  apiClient,
  unwrap,
  TOKEN_STORAGE_KEY,
} from "./apiClient.js";

const deviceIdentifier = () => {
  const key = "nexusbank.device-id";

  const existing =
    window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const generated =
    `web-${
      crypto.randomUUID?.() ||
      Math.random()
        .toString(36)
        .slice(2)
    }`;

  window.localStorage.setItem(
    key,
    generated
  );

  return generated;
};

export const authService = {
  /* =======================================================
     REGISTER
     ======================================================= */

  async register(payload) {
    return unwrap(
      await apiClient.post(
        "/auth/register",
        payload
      )
    );
  },

  /* =======================================================
     LOGIN
     ======================================================= */

  async login({
    email,
    password,
  }) {
    const res =
      await apiClient.post(
        "/auth/login",
        {
          email,
          password,

          deviceIdentifier:
            deviceIdentifier(),

          browser:
            navigator.userAgentData
              ?.brands?.[0]?.brand ||
            navigator.userAgent.slice(
              0,
              40
            ),

          operatingSystem:
            navigator.platform ||
            null,
        }
      );

    return unwrap(res);
  },

  /* =======================================================
     LOGIN OTP
     ======================================================= */

  async verifyOtp({
    userId,
    otp,
  }) {
    const res =
      await apiClient.post(
        "/auth/verify-otp",
        {
          userId,
          otp,
          deviceIdentifier:
            deviceIdentifier(),
        }
      );

    return unwrap(res);
  },

  async resendLoginOtp({
    userId,
  }) {
    return unwrap(
      await apiClient.post(
        "/auth/resend-otp",
        {
          userId,
        }
      )
    );
  },

  /* =======================================================
     FORGOT PASSWORD
     ======================================================= */

  /**
   * Step 1:
   * Submit registered email and request
   * a password-reset OTP.
   */
  async forgotPassword(
    email
  ) {
    const res =
      await apiClient.post(
        "/auth/forgot-password",
        {
          email:
            String(email || "")
              .trim()
              .toLowerCase(),
        }
      );

    return unwrap(res);
  },

  /**
   * Step 2:
   * Verify the password-reset OTP.
   *
   * Backend returns a short-lived
   * resetToken after successful verification.
   */
  async verifyPasswordResetOtp({
    userId,
    otp,
  }) {
    const res =
      await apiClient.post(
        "/auth/verify-password-reset-otp",
        {
          userId,
          otp:
            String(otp || "").trim(),
        }
      );

    return unwrap(res);
  },

  /**
   * Step 3:
   * Set the new password using the
   * resetToken received after OTP verification.
   */
  async resetPassword({
    userId,
    resetToken,
    newPassword,
    confirmPassword,
  }) {
    const res =
      await apiClient.post(
        "/auth/reset-password",
        {
          userId,
          resetToken,
          newPassword,
          confirmPassword,
        }
      );

    return {
      data: unwrap(res),
      message:
        res.data?.message,
    };
  },

  /* =======================================================
     CURRENT USER
     ======================================================= */

  async me() {
    return (
      unwrap(
        await apiClient.get(
          "/auth/me"
        )
      )?.user
    );
  },

  /* =======================================================
     LOGOUT
     ======================================================= */

  async logout() {
    try {
      await apiClient.post(
        "/auth/logout"
      );
    } catch {
      /*
       * Logout should still clear the
       * local token even if the server
       * request fails.
       */
    }
  },

  /* =======================================================
     CHANGE PASSWORD
     ======================================================= */

  async changePassword(
    payload
  ) {
    const res =
      await apiClient.post(
        "/auth/change-password",
        payload
      );

    return {
      data: unwrap(res),
      message:
        res.data?.message,
    };
  },

  /* =======================================================
     PROFILE
     ======================================================= */

  async updateProfile(
    payload
  ) {
    const res =
      await apiClient.put(
        "/auth/profile",
        payload
      );

    return {
      data:
        unwrap(res)?.user,
      message:
        res.data?.message,
    };
  },

  /* =======================================================
     PREFERENCES
     ======================================================= */

  async updatePreferences(
    payload
  ) {
    const res =
      await apiClient.put(
        "/auth/preferences",
        payload
      );

    return {
      data:
        unwrap(res)?.user,
      message:
        res.data?.message,
    };
  },

  /* =======================================================
     SESSIONS
     ======================================================= */

  async listSessions() {
    return unwrap(
      await apiClient.get(
        "/auth/sessions"
      )
    );
  },

  async revokeSession(id) {
    const res =
      await apiClient.delete(
        `/auth/sessions/${id}`
      );

    return {
      message:
        res.data?.message,
    };
  },

  async revokeAllOtherSessions() {
    const res =
      await apiClient.delete(
        "/auth/sessions"
      );

    return {
      data: unwrap(res),
      message:
        res.data?.message,
    };
  },

  /* =======================================================
     TOKEN MANAGEMENT
     ======================================================= */

  saveToken(token) {
    window.localStorage.setItem(
      TOKEN_STORAGE_KEY,
      token
    );
  },

  clearToken() {
    window.localStorage.removeItem(
      TOKEN_STORAGE_KEY
    );
  },

  deviceIdentifier,
};