import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authService } from "../services/authService.js";
import { registerUnauthorizedHandler } from "../services/apiClient.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [status, setStatus] = useState("loading");
  // loading | authenticated | anonymous

  const [pendingLogin, setPendingLogin] = useState(null);

  /*
   * ============================================================
   * SIGN OUT
   * ============================================================
   */
  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Logout should always clear the local session.
    }

    authService.clearToken();
    setUser(null);
    setStatus("anonymous");
    setPendingLogin(null);
  }, []);

  /*
   * ============================================================
   * GLOBAL UNAUTHORIZED HANDLER
   * ============================================================
   *
   * A protected API returning 401 means the current token is no
   * longer valid. Clear the client session.
   *
   * Public APIs such as forgot-password are not affected because
   * this handler only changes authentication state; it does not
   * perform navigation.
   */
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      authService.clearToken();
      setUser(null);
      setStatus("anonymous");
      setPendingLogin(null);
    });

    return () => {
      registerUnauthorizedHandler(null);
    };
  }, []);

  /*
   * ============================================================
   * RESTORE EXISTING SESSION
   * ============================================================
   */
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const token = window.localStorage.getItem("nexusbank.token");

      /*
       * No token = normal anonymous state.
       *
       * This is NOT an error and should not prevent public pages
       * such as Login / Register / Forgot Password from rendering.
       */
      if (!token) {
        if (mounted) {
          setUser(null);
          setStatus("anonymous");
        }
        return;
      }

      try {
        const fresh = await authService.me();

        if (!mounted) return;

        /*
         * If the backend returned no user for some reason, treat
         * the session as anonymous rather than authenticated.
         */
        if (!fresh) {
          authService.clearToken();
          setUser(null);
          setStatus("anonymous");
          return;
        }

        setUser(fresh);
        setStatus("authenticated");
      } catch (error) {
        /*
         * Invalid / expired token.
         *
         * A 401 here is expected session-expiry behaviour, not a
         * React routing error.
         */
        if (!mounted) return;

        authService.clearToken();
        setUser(null);
        setStatus("anonymous");
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * START LOGIN
   * ============================================================
   */
  const startLogin = useCallback(async (credentials) => {
    const result = await authService.login(credentials);

    setPendingLogin(result);

    return result;
  }, []);

  /*
   * ============================================================
   * RESEND LOGIN OTP
   * ============================================================
   */
  const resendOtp = useCallback(async () => {
    if (!pendingLogin?.userId) {
      throw new Error("No pending sign-in.");
    }

    const result = await authService.resendLoginOtp({
      userId: pendingLogin.userId,
    });

    setPendingLogin((prev) =>
      prev
        ? {
            ...prev,
            ...result,
          }
        : prev
    );

    return result;
  }, [pendingLogin?.userId]);

  /*
   * ============================================================
   * COMPLETE LOGIN
   * ============================================================
   */
  const completeLogin = useCallback(async ({ userId, otp }) => {
    const result = await authService.verifyOtp({
      userId,
      otp,
    });

    /*
     * Save token BEFORE switching to authenticated state.
     */
    authService.saveToken(result.token);

    setUser(result.user);
    setStatus("authenticated");
    setPendingLogin(null);

    return result.user;
  }, []);

  /*
   * ============================================================
   * CONTEXT VALUE
   * ============================================================
   */
  const value = useMemo(
    () => ({
      user,
      status,
      pendingLogin,

      startLogin,
      completeLogin,
      resendOtp,
      signOut,

      setUser,
    }),
    [
      user,
      status,
      pendingLogin,
      startLogin,
      completeLogin,
      resendOtp,
      signOut,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}