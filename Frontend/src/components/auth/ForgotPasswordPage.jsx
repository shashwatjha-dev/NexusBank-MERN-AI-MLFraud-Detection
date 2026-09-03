import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LockKeyhole,
  Mail,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Headphones,
  Smartphone,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { authService } from "../../services/authService.js";

import "./ForgotPasswordPage.css";

/* =========================================================
   PASSWORD RULES
   ========================================================= */

const PASSWORD_RULES = [
  {
    key: "length",
    label: "8–72 characters",
    test: (value) =>
      value.length >= 8 &&
      value.length <= 72,
  },
  {
    key: "letter",
    label: "At least one letter",
    test: (value) =>
      /[A-Za-z]/.test(value),
  },
  {
    key: "number",
    label: "At least one number",
    test: (value) =>
      /\d/.test(value),
  },
];

/* =========================================================
   PAGE
   ========================================================= */

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [demoOtp, setDemoOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  /* =======================================================
     OTP COUNTDOWN
     ======================================================= */

  useEffect(() => {
    if (expiresIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setExpiresIn((value) =>
        Math.max(0, value - 1)
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [expiresIn]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((value) =>
        Math.max(0, value - 1)
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [resendIn]);

  /* =======================================================
     PASSWORD VALIDATION
     ======================================================= */

  const passwordRules = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        valid: rule.test(newPassword),
      })),
    [newPassword]
  );

  const passwordValid =
    passwordRules.every(
      (rule) => rule.valid
    );

  const passwordsMatch =
    newPassword.length > 0 &&
    newPassword === confirmPassword;

  const formValid =
    passwordValid && passwordsMatch;

  /* =======================================================
     HELPERS
     ======================================================= */

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleError = (err, fallback) => {
    setError(
      err?.message || fallback
    );
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(
      seconds / 60
    );

    const remaining = seconds % 60;

    return `${minutes}:${String(
      remaining
    ).padStart(2, "0")}`;
  };

  const currentStep =
    step === "email"
      ? 1
      : step === "otp"
        ? 2
        : step === "password"
          ? 3
          : 3;

  /* =======================================================
     STEP 1 — EMAIL
     ======================================================= */

  const handleEmailSubmit = async (
    event
  ) => {
    event.preventDefault();

    clearMessages();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Please enter your registered email address."
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        await authService.forgotPassword(
          normalizedEmail
        );

      setEmail(normalizedEmail);

      if (result?.userId) {
        setUserId(result.userId);
      }

      setMaskedEmail(
        result?.maskedEmail ||
          normalizedEmail
      );

      setDemoOtp(
        result?.demoOtp || ""
      );

      setExpiresIn(
        Number(
          result?.expiresInSeconds || 300
        )
      );

      setResendIn(
        Number(
          result?.resendAvailableInSeconds ||
            60
        )
      );

      setStep("otp");
    } catch (err) {
      handleError(
        err,
        "Unable to send the verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     STEP 2 — VERIFY OTP
     ======================================================= */

  const handleOtpSubmit = async (
    event
  ) => {
    event.preventDefault();

    clearMessages();

    const normalizedOtp =
      otp.trim();

    if (
      !/^\d{6}$/.test(
        normalizedOtp
      )
    ) {
      setError(
        "Enter the 6-digit verification code."
      );
      return;
    }

    if (!userId) {
      setError(
        "Password reset session is missing. Please request a new code."
      );

      setStep("email");
      return;
    }

    setLoading(true);

    try {
      const result =
        await authService.verifyPasswordResetOtp(
          {
            userId,
            otp: normalizedOtp,
          }
        );

      if (!result?.resetToken) {
        throw new Error(
          "Verification completed but the reset session could not be created."
        );
      }

      setResetToken(
        result.resetToken
      );

      setStep("password");
    } catch (err) {
      handleError(
        err,
        "The verification code is incorrect or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     RESEND OTP
     ======================================================= */

  const handleResend = async () => {
    if (resendIn > 0 || !email) {
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const result =
        await authService.forgotPassword(
          email
        );

      setDemoOtp(
        result?.demoOtp || ""
      );

      setExpiresIn(
        Number(
          result?.expiresInSeconds || 300
        )
      );

      setResendIn(
        Number(
          result?.resendAvailableInSeconds ||
            60
        )
      );

      if (result?.userId) {
        setUserId(result.userId);
      }

      setSuccess(
        "A new verification code has been sent."
      );

      setOtp("");
    } catch (err) {
      handleError(
        err,
        "Unable to resend the verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     STEP 3 — RESET PASSWORD
     ======================================================= */

  const handlePasswordSubmit =
    async (event) => {
      event.preventDefault();

      clearMessages();

      if (!passwordValid) {
        setError(
          "Please meet all password requirements."
        );
        return;
      }

      if (!passwordsMatch) {
        setError(
          "Passwords do not match."
        );
        return;
      }

      if (!resetToken || !userId) {
        setError(
          "Your password reset session has expired. Please start again."
        );

        setStep("email");
        return;
      }

      setLoading(true);

      try {
        await authService.resetPassword({
          userId,
          resetToken,
          newPassword,
          confirmPassword,
        });

        setStep("success");

        setSuccess(
          "Your password has been changed successfully."
        );
      } catch (err) {
        handleError(
          err,
          "Unable to reset your password. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     BACK
     ======================================================= */

  const goBack = () => {
    clearMessages();

    if (step === "otp") {
      setStep("email");
      setOtp("");
      return;
    }

    if (step === "password") {
      setStep("otp");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    navigate("/login");
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="forgot-page">

      {/* Background */}
      <div className="forgot-bg-glow forgot-bg-glow-one" />
      <div className="forgot-bg-glow forgot-bg-glow-two" />
      <div className="forgot-bg-grid" />

      {/* ===================================================
          HEADER
          =================================================== */}

      <header className="forgot-header">

        <Link
          to="/login"
          className="forgot-brand"
        >
          <div className="forgot-brand-logo">
            <span>N</span>
          </div>

          <div className="forgot-brand-text">
            <strong>
              Nexus<span>Bank</span>
            </strong>

            <small>
              Smart Banking, Smarter You
            </small>
          </div>
        </Link>

        <div className="forgot-secure-badge">
          <Lock size={16} />
          <span>
            Bank-level Security
          </span>
          <i />
        </div>

      </header>

      {/* ===================================================
          MAIN CONTAINER
          =================================================== */}

      <main className="forgot-main">

        <section className="forgot-shell">

          {/* =================================================
              LEFT SIDE
              ================================================= */}

          <div className="forgot-left">

            <div className="forgot-left-inner">

              <div className="forgot-heading">

                <div className="forgot-title-row">
                  <div>
                    <h1>
                      Forgot{" "}
                      <span>Password</span>
                    </h1>

                    <p>
                      Reset your password
                      in 3 simple steps
                    </p>
                  </div>
                </div>

              </div>

              {/* Progress */}

              <div className="forgot-stepper">

                <ProgressStep
                  number="1"
                  label="Email"
                  subLabel="Verify your email"
                  active={
                    currentStep === 1
                  }
                  completed={
                    currentStep > 1
                  }
                />

                <div
                  className={`forgot-step-line ${
                    currentStep > 1
                      ? "active"
                      : ""
                  }`}
                />

                <ProgressStep
                  number="2"
                  label="Verify"
                  subLabel="Enter OTP code"
                  active={
                    currentStep === 2
                  }
                  completed={
                    currentStep > 2
                  }
                />

                <div
                  className={`forgot-step-line ${
                    currentStep > 2
                      ? "active"
                      : ""
                  }`}
                />

                <ProgressStep
                  number="3"
                  label="Reset"
                  subLabel="Create new password"
                  active={
                    currentStep === 3
                  }
                  completed={
                    step === "success"
                  }
                />

              </div>

              {/* Divider */}

              <div className="forgot-divider" />

              {/* =================================================
                  EMAIL
                  ================================================= */}

              {step === "email" && (
                <div className="forgot-content">

                  <div className="forgot-section-kicker">
                    <Mail size={17} />
                    <span>
                      Step 1 of 3
                    </span>
                  </div>

                  <h2>
                    Verify your email
                  </h2>

                  <p className="forgot-description">
                    Enter your registered
                    email address and
                    we'll send you a
                    verification code.
                  </p>

                  <form
                    onSubmit={
                      handleEmailSubmit
                    }
                    className="forgot-form"
                  >

                    <label>
                      Email Address
                    </label>

                    <div className="forgot-input">
                      <Mail
                        size={19}
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value
                          )
                        }
                        placeholder="Enter your registered email"
                        autoComplete="email"
                        autoFocus
                        disabled={loading}
                      />

                      <span className="forgot-input-action">
                        <ArrowRight
                          size={17}
                        />
                      </span>
                    </div>

                    {error && (
                      <ErrorMessage
                        message={error}
                      />
                    )}

                    <SecurityNote />

                    <button
                      type="submit"
                      className="forgot-primary-btn"
                      disabled={
                        loading ||
                        !email.trim()
                      }
                    >
                      {loading ? (
                        <>
                          <span className="forgot-spinner" />
                          Sending verification code...
                        </>
                      ) : (
                        <>
                          Send Verification Code
                          <ArrowRight
                            size={19}
                          />
                        </>
                      )}
                    </button>

                  </form>

                  <button
                    type="button"
                    className="forgot-login-link"
                    onClick={() =>
                      navigate("/login")
                    }
                  >
                    <ArrowLeft size={16} />
                    Back to login
                  </button>

                </div>
              )}

              {/* =================================================
                  OTP
                  ================================================= */}

              {step === "otp" && (
                <div className="forgot-content">

                  <div className="forgot-section-kicker">
                    <KeyRound size={17} />
                    <span>
                      Step 2 of 3
                    </span>
                  </div>

                  <h2>
                    Verify your identity
                  </h2>

                  <p className="forgot-description">
                    Enter the 6-digit code
                    we've sent to{" "}
                    <strong>
                      {maskedEmail ||
                        email}
                    </strong>
                    .
                  </p>

                  <form
                    onSubmit={
                      handleOtpSubmit
                    }
                    className="forgot-form"
                  >

                    <label>
                      Verification Code
                    </label>

                    <div className="forgot-otp-box">
                      <KeyRound size={18} />

                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(event) =>
                          setOtp(
                            event.target.value.replace(
                              /\D/g,
                              ""
                            )
                          )
                        }
                        placeholder="000000"
                        autoFocus
                        autoComplete="one-time-code"
                        disabled={loading}
                      />
                    </div>

                    <div className="forgot-otp-meta">

                      <span>
                        <Clock3 size={14} />

                        {expiresIn > 0
                          ? `Code expires in ${formatTime(
                              expiresIn
                            )}`
                          : "Code expired"}
                      </span>

                      <button
                        type="button"
                        onClick={
                          handleResend
                        }
                        disabled={
                          loading ||
                          resendIn > 0
                        }
                      >
                        <RefreshCw
                          size={14}
                        />

                        {resendIn > 0
                          ? `Resend in ${resendIn}s`
                          : "Resend code"}
                      </button>

                    </div>

                    {demoOtp && (
                      <div className="forgot-demo-code">
                        <Sparkles size={16} />

                        <div>
                          <small>
                            Demo verification code
                          </small>

                          <strong>
                            {demoOtp}
                          </strong>
                        </div>
                      </div>
                    )}

                    {error && (
                      <ErrorMessage
                        message={error}
                      />
                    )}

                    {success && (
                      <SuccessMessage
                        message={success}
                      />
                    )}

                    <button
                      type="submit"
                      className="forgot-primary-btn"
                      disabled={
                        loading ||
                        otp.length !== 6
                      }
                    >
                      {loading ? (
                        <>
                          <span className="forgot-spinner" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify Code
                          <ArrowRight
                            size={19}
                          />
                        </>
                      )}
                    </button>

                  </form>

                  <button
                    type="button"
                    className="forgot-login-link"
                    onClick={goBack}
                  >
                    <ArrowLeft size={16} />
                    Use a different email
                  </button>

                </div>
              )}

              {/* =================================================
                  PASSWORD
                  ================================================= */}

              {step === "password" && (
                <div className="forgot-content">

                  <div className="forgot-section-kicker">
                    <LockKeyhole size={17} />
                    <span>
                      Step 3 of 3
                    </span>
                  </div>

                  <h2>
                    Create a new password
                  </h2>

                  <p className="forgot-description">
                    Choose a strong password
                    you haven't used
                    elsewhere.
                  </p>

                  <form
                    onSubmit={
                      handlePasswordSubmit
                    }
                    className="forgot-form"
                  >

                    <label>
                      New Password
                    </label>

                    <div className="forgot-input">
                      <LockKeyhole
                        size={19}
                      />

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          newPassword
                        }
                        onChange={(event) =>
                          setNewPassword(
                            event.target.value
                          )
                        }
                        placeholder="Create a new password"
                        autoComplete="new-password"
                        autoFocus
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="forgot-eye"
                        onClick={() =>
                          setShowPassword(
                            (value) =>
                              !value
                          )
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <div className="forgot-password-rules">

                      {passwordRules.map(
                        (rule) => (
                          <div
                            key={
                              rule.key
                            }
                            className={
                              rule.valid
                                ? "valid"
                                : ""
                            }
                          >
                            <span>
                              <Check size={11} />
                            </span>

                            {rule.label}
                          </div>
                        )
                      )}

                    </div>

                    <label>
                      Confirm Password
                    </label>

                    <div className="forgot-input">
                      <LockKeyhole
                        size={19}
                      />

                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          confirmPassword
                        }
                        onChange={(event) =>
                          setConfirmPassword(
                            event.target.value
                          )
                        }
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        className="forgot-eye"
                        onClick={() =>
                          setShowConfirmPassword(
                            (value) =>
                              !value
                          )
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {confirmPassword &&
                      !passwordsMatch && (
                        <div className="forgot-match-error">
                          Passwords do not
                          match.
                        </div>
                      )}

                    {error && (
                      <ErrorMessage
                        message={error}
                      />
                    )}

                    <button
                      type="submit"
                      className="forgot-primary-btn"
                      disabled={
                        loading ||
                        !formValid
                      }
                    >
                      {loading ? (
                        <>
                          <span className="forgot-spinner" />
                          Updating password...
                        </>
                      ) : (
                        <>
                          Reset Password
                          <CheckCircle2
                            size={19}
                          />
                        </>
                      )}
                    </button>

                  </form>

                  <button
                    type="button"
                    className="forgot-login-link"
                    onClick={goBack}
                  >
                    <ArrowLeft size={16} />
                    Back to verification
                  </button>

                </div>
              )}

              {/* =================================================
                  SUCCESS
                  ================================================= */}

              {step === "success" && (
                <div className="forgot-success">

                  <div className="forgot-success-icon">
                    <CheckCircle2 size={58} />
                  </div>

                  <div className="forgot-section-kicker">
                    <ShieldCheck size={17} />
                    <span>
                      Recovery complete
                    </span>
                  </div>

                  <h2>
                    Password updated
                  </h2>

                  <p className="forgot-description">
                    Your NexusBank password
                    has been successfully
                    changed. You can now
                    sign in securely using
                    your new password.
                  </p>

                  <div className="forgot-success-card">
                    <ShieldCheck size={21} />

                    <div>
                      <strong>
                        Account secured
                      </strong>

                      <span>
                        Your password reset
                        session has been
                        completed.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="forgot-primary-btn"
                    onClick={() =>
                      navigate("/login")
                    }
                  >
                    Continue to login
                    <ArrowRight size={19} />
                  </button>

                </div>
              )}

            </div>

          </div>

          {/* =================================================
              RIGHT SECURITY PANEL
              ================================================= */}

          <aside className="forgot-right">

            <div className="forgot-security-art">

              <div className="forgot-art-ring ring-one" />
              <div className="forgot-art-ring ring-two" />
              <div className="forgot-art-ring ring-three" />

              <div className="forgot-art-particles">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>

              <div className="forgot-shield">

                <div className="forgot-shield-inner">
                  <Lock
                    size={57}
                    strokeWidth={1.8}
                  />
                </div>

              </div>

              <div className="forgot-mail-orb">
                <Mail size={34} />

                <span>
                  <Check size={14} />
                </span>
              </div>

            </div>

            <div className="forgot-security-copy">

              <div className="forgot-security-title">
                <Sparkles size={19} />

                <h3>
                  Your account is
                  <span> safe with us</span>
                </h3>
              </div>

              <p>
                We use advanced security
                measures to protect your
                account and personal data.
              </p>

            </div>

            <div className="forgot-security-list">

              <SecurityFeature
                icon={<Lock size={20} />}
                title="256-bit Encryption"
                description="Your data is encrypted and secured"
              />

              <SecurityFeature
                icon={<Smartphone size={20} />}
                title="Secure Verification"
                description="Multi-step verification for your protection"
              />

              <SecurityFeature
                icon={<ShieldCheck size={20} />}
                title="Privacy First"
                description="Your privacy is our top priority"
              />

            </div>

          </aside>

          {/* =================================================
              BOTTOM FEATURES
              ================================================= */}

          <div className="forgot-bottom-features">

            <BottomFeature
              icon={<Clock3 size={25} />}
              title="Quick Recovery"
              description="Reset in under 5 minutes"
            />

            <BottomFeature
              icon={<Shield size={25} />}
              title="100% Secure"
              description="Bank-level security"
            />

            <BottomFeature
              icon={<Headphones size={25} />}
              title="24/7 Support"
              description="We're here to help"
            />

          </div>

        </section>

        <footer className="forgot-footer">

          <div className="forgot-footer-security">
            <Lock size={15} />
            Secure Banking
          </div>

          <span>
            © {new Date().getFullYear()} NexusBank.
            All rights reserved.
          </span>

        </footer>

      </main>
    </div>
  );
}

/* =========================================================
   PROGRESS STEP
   ========================================================= */

function ProgressStep({
  number,
  label,
  subLabel,
  active,
  completed,
}) {
  return (
    <div
      className={`forgot-progress-step ${
        active ? "active" : ""
      } ${
        completed ? "completed" : ""
      }`}
    >
      <div className="forgot-step-circle">
        {completed ? (
          <Check size={17} />
        ) : (
          number
        )}
      </div>

      <strong>
        {label}
      </strong>

      <span>
        {subLabel}
      </span>
    </div>
  );
}

/* =========================================================
   SECURITY FEATURE
   ========================================================= */

function SecurityFeature({
  icon,
  title,
  description,
}) {
  return (
    <div className="forgot-security-feature">

      <div className="forgot-feature-icon">
        {icon}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

    </div>
  );
}

/* =========================================================
   BOTTOM FEATURE
   ========================================================= */

function BottomFeature({
  icon,
  title,
  description,
}) {
  return (
    <div className="forgot-bottom-feature">

      <div className="forgot-bottom-icon">
        {icon}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

    </div>
  );
}

/* =========================================================
   ERROR
   ========================================================= */

function ErrorMessage({
  message,
}) {
  return (
    <div className="forgot-message forgot-message-error">
      <span>!</span>
      {message}
    </div>
  );
}

/* =========================================================
   SUCCESS
   ========================================================= */

function SuccessMessage({
  message,
}) {
  return (
    <div className="forgot-message forgot-message-success">
      <CheckCircle2 size={15} />
      {message}
    </div>
  );
}

/* =========================================================
   SECURITY NOTE
   ========================================================= */

function SecurityNote() {
  return (
    <div className="forgot-security-note">

      <div className="forgot-security-note-icon">
        <ShieldCheck size={19} />
      </div>

      <div>
        <strong>
          Secure & Private
        </strong>

        <span>
          We never share your email
          with anyone.
        </span>
      </div>

    </div>
  );
}

export default ForgotPasswordPage;