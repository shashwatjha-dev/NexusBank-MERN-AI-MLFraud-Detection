import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { statementsApi } from "../../services/statementsService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareStatementModal({
  open,
  onClose,
  accountId,
  accountLabel,
  dateRange,
}) {
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStep("form");
      setEmail("");
      setSubject("");
      setMessage("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && step !== "sending") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [open, onClose, step]);

  if (!open) return null;

  const emailValid = EMAIL_RE.test(email.trim());

  const handleClose = () => {
    if (step === "sending") return;
    onClose();
  };

  const handleContinue = (event) => {
    event.preventDefault();

    if (!emailValid) return;

    setError("");
    setStep("confirm");
  };

  const doSend = async () => {
    if (!accountId || !emailValid) return;

    setStep("sending");
    setError("");

    try {
      await statementsApi.share(accountId, {
        recipientEmail: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
        from: dateRange?.from || undefined,
        to: dateRange?.to || undefined,
      });

      setStep("success");
    } catch (err) {
      const apiError =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message;

      setError(
        apiError ||
          "We couldn't email the statement. Please try again."
      );

      setStep("error");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="stmt-share-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onMouseDown={handleClose}
        data-testid="stmt-share-modal-backdrop"
      >
        <motion.div
          className="stmt-share-modal"
          initial={{
            opacity: 0,
            scale: 0.94,
            y: 18,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: 12,
          }}
          transition={{
            duration: 0.25,
            ease: [0.22, 1, 0.36, 1],
          }}
          onMouseDown={(event) =>
            event.stopPropagation()
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="stmt-share-title"
          data-testid="stmt-share-modal"
        >
          {/* ==================================================
              DECORATIVE GLOW
             ================================================== */}

          <div className="stmt-share-modal__glow stmt-share-modal__glow--one" />
          <div className="stmt-share-modal__glow stmt-share-modal__glow--two" />

          {/* ==================================================
              HEADER
             ================================================== */}

          <header className="stmt-share-modal__head">
            <div className="stmt-share-modal__heading">
              <div className="stmt-share-modal__icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h11a2 2 0 0 1 2 2v5" />
                  <path d="M4 20h11a2 2 0 0 0 2-2v-5" />
                  <path d="M4 4v16" />
                  <path d="M17 12h4" />
                  <path d="m19 10 2 2-2 2" />
                </svg>
              </div>

              <div>
                <p className="stmt-share-modal__eyebrow">
                  Secure sharing
                </p>

                <h3 id="stmt-share-title">
                  Share statement
                </h3>

                <p className="stmt-share-modal__meta">
                  {accountLabel || "Bank statement"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="stmt-share-modal__close"
              onClick={handleClose}
              disabled={step === "sending"}
              aria-label="Close share statement"
              data-testid="stmt-share-close"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="m6 6 12 12" />
                <path d="m18 6-12 12" />
              </svg>
            </button>
          </header>

          {/* ==================================================
              STEP INDICATOR
             ================================================== */}

          {(step === "form" ||
            step === "confirm" ||
            step === "sending") && (
            <div className="stmt-share-steps">
              <div
                className={
                  "stmt-share-step" +
                  (step === "form"
                    ? " stmt-share-step--active"
                    : " stmt-share-step--done")
                }
              >
                <span>1</span>
                <small>Details</small>
              </div>

              <div className="stmt-share-step-line">
                <motion.i
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      step === "confirm" ||
                      step === "sending"
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>

              <div
                className={
                  "stmt-share-step" +
                  (step === "confirm" ||
                  step === "sending"
                    ? " stmt-share-step--active"
                    : "")
                }
              >
                <span>2</span>
                <small>Confirm</small>
              </div>

              <div className="stmt-share-step-line">
                <motion.i
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      step === "sending"
                        ? "100%"
                        : "0%",
                  }}
                />
              </div>

              <div
                className={
                  "stmt-share-step" +
                  (step === "sending"
                    ? " stmt-share-step--active"
                    : "")
                }
              >
                <span>3</span>
                <small>Send</small>
              </div>
            </div>
          )}

          {/* ==================================================
              FORM
             ================================================== */}

          {step === "form" && (
            <form
              className="stmt-share-modal__body"
              onSubmit={handleContinue}
            >
              <div className="stmt-share-period">
                <div className="stmt-share-period__icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="17"
                      rx="2"
                    />
                    <path d="M16 2v4" />
                    <path d="M8 2v4" />
                    <path d="M3 10h18" />
                  </svg>
                </div>

                <div>
                  <span>Statement period</span>
                  <strong>
                    {dateRange?.from || "—"}{" "}
                    <i>→</i>{" "}
                    {dateRange?.to || "—"}
                  </strong>
                </div>
              </div>

              {/* Email */}

              <label className="stmt-share-field">
                <span className="stmt-share-field__label">
                  Recipient email
                  <em>*</em>
                </span>

                <div
                  className={
                    "stmt-share-input-wrap" +
                    (email && !emailValid
                      ? " stmt-share-input-wrap--error"
                      : "") +
                    (email && emailValid
                      ? " stmt-share-input-wrap--valid"
                      : "")
                  }
                >
                  <svg
                    className="stmt-share-input-icon"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                    />
                    <path d="m3 7 9 6 9-6" />
                  </svg>

                  <input
                    type="email"
                    autoFocus
                    required
                    autoComplete="email"
                    placeholder="recipient@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    data-testid="stmt-share-email"
                  />

                  {email && emailValid && (
                    <span className="stmt-share-input-status stmt-share-input-status--valid">
                      ✓
                    </span>
                  )}
                </div>

                {email && !emailValid && (
                  <span className="stmt-share-field__error">
                    Please enter a valid email address.
                  </span>
                )}
              </label>

              {/* Subject */}

              <label className="stmt-share-field">
                <span className="stmt-share-field__label">
                  Subject
                  <small>Optional</small>
                </span>

                <input
                  type="text"
                  maxLength={200}
                  placeholder="NexusBank Statement"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  data-testid="stmt-share-subject"
                />

                <div className="stmt-share-field__counter">
                  {subject.length}/200
                </div>
              </label>

              {/* Message */}

              <label className="stmt-share-field">
                <span className="stmt-share-field__label">
                  Message
                  <small>Optional</small>
                </span>

                <textarea
                  rows={4}
                  maxLength={2000}
                  placeholder="Hi, please find my statement attached."
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  data-testid="stmt-share-message"
                />

                <div className="stmt-share-field__counter">
                  {message.length}/2000
                </div>
              </label>

              {/* Security note */}

              <div className="stmt-share-security">
                <div className="stmt-share-security__icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2"
                    />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </div>

                <div>
                  <strong>
                    Secure document sharing
                  </strong>

                  <p>
                    A secure audit record of this
                    share is stored in your account.
                  </p>
                </div>
              </div>

              {/* Actions */}

              <div className="stmt-share-modal__actions">
                <button
                  type="button"
                  className="stmt-share-btn stmt-share-btn--ghost"
                  onClick={handleClose}
                  data-testid="stmt-share-cancel"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stmt-share-btn stmt-share-btn--primary"
                  disabled={!emailValid}
                  data-testid="stmt-share-continue"
                >
                  Continue

                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {/* ==================================================
              CONFIRM
             ================================================== */}

          {step === "confirm" && (
            <motion.div
              className="stmt-share-modal__body"
              initial={{
                opacity: 0,
                x: 8,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
            >
              <div className="stmt-share-confirm">
                <div className="stmt-share-confirm__icon">
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <path d="M4 5h16" />
                    <path d="M4 19h16" />
                    <path d="M7 5v14" />
                    <path d="M17 5v14" />
                    <path d="M9 9h6" />
                    <path d="M9 13h6" />
                  </svg>
                </div>

                <h4>
                  Ready to send?
                </h4>

                <p>
                  Your statement will be securely
                  generated and emailed to:
                </p>

                <div className="stmt-share-confirm__email">
                  <span>✉</span>
                  <strong>
                    {email.trim()}
                  </strong>
                </div>
              </div>

              <div className="stmt-share-preview">
                <div>
                  <span>Account</span>
                  <strong>
                    {accountLabel || "Statement"}
                  </strong>
                </div>

                <div>
                  <span>Period</span>
                  <strong>
                    {dateRange?.from || "—"}{" "}
                    →{" "}
                    {dateRange?.to || "—"}
                  </strong>
                </div>

                {subject.trim() && (
                  <div>
                    <span>Subject</span>
                    <strong>
                      {subject.trim()}
                    </strong>
                  </div>
                )}

                {message.trim() && (
                  <div>
                    <span>Message</span>
                    <strong>
                      {message
                        .trim()
                        .slice(0, 150)}
                      {message.trim().length >
                      150
                        ? "…"
                        : ""}
                    </strong>
                  </div>
                )}
              </div>

              <div className="stmt-share-security">
                <div className="stmt-share-security__icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M12 3 5 6v5c0 4.5 2.8 8.3 7 10 4.2-1.7 7-5.5 7-10V6l-7-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>

                <div>
                  <strong>
                    Your data stays protected
                  </strong>

                  <p>
                    NexusBank will generate a fresh
                    PDF for this request.
                  </p>
                </div>
              </div>

              <div className="stmt-share-modal__actions">
                <button
                  type="button"
                  className="stmt-share-btn stmt-share-btn--ghost"
                  onClick={() => setStep("form")}
                  data-testid="stmt-share-back"
                >
                  Back
                </button>

                <button
                  type="button"
                  className="stmt-share-btn stmt-share-btn--primary"
                  onClick={doSend}
                  data-testid="stmt-share-send"
                >
                  Send statement

                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              SENDING
             ================================================== */}

          {step === "sending" && (
            <motion.div
              className="stmt-share-state"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              data-testid="stmt-share-sending"
            >
              <div className="stmt-share-loader">
                <div className="stmt-share-loader__ring" />

                <div className="stmt-share-loader__icon">
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </div>
              </div>

              <h4>
                Sending securely
              </h4>

              <p>
                Generating your statement PDF and
                delivering it to:
              </p>

              <strong className="stmt-share-state__email">
                {email.trim()}
              </strong>

              <div className="stmt-share-progress">
                <motion.i
                  initial={{
                    width: "0%",
                  }}
                  animate={{
                    width: "92%",
                  }}
                  transition={{
                    duration: 2.3,
                    ease: "easeInOut",
                  }}
                />
              </div>

              <span className="stmt-share-state__hint">
                Please keep this window open…
              </span>
            </motion.div>
          )}

          {/* ==================================================
              SUCCESS
             ================================================== */}

          {step === "success" && (
            <motion.div
              className="stmt-share-state"
              initial={{
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              data-testid="stmt-share-success"
            >
              <motion.div
                className="stmt-share-success-icon"
                initial={{
                  scale: 0,
                  rotate: -20,
                }}
                animate={{
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 15,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </motion.div>

              <h4>
                Statement sent
              </h4>

              <p>
                Your statement has been emailed
                successfully to:
              </p>

              <strong className="stmt-share-state__email">
                {email.trim()}
              </strong>

              <div className="stmt-share-success-badge">
                <span>✓</span>
                Secure delivery completed
              </div>

              <div className="stmt-share-modal__actions">
                <button
                  type="button"
                  className="stmt-share-btn stmt-share-btn--primary stmt-share-btn--full"
                  onClick={onClose}
                  data-testid="stmt-share-done"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================================================
              ERROR
             ================================================== */}

          {step === "error" && (
            <motion.div
              className="stmt-share-state"
              initial={{
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              data-testid="stmt-share-error"
            >
              <motion.div
                className="stmt-share-error-icon"
                initial={{
                  scale: 0,
                }}
                animate={{
                  scale: 1,
                }}
              >
                !
              </motion.div>

              <h4>
                Couldn’t send statement
              </h4>

              <p>
                {error ||
                  "An unexpected error occurred while sending the statement."}
              </p>

              <div className="stmt-share-error-note">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>

                Your statement has not been shared.
              </div>

              <div className="stmt-share-modal__actions">
                <button
                  type="button"
                  className="stmt-share-btn stmt-share-btn--ghost"
                  onClick={onClose}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="stmt-share-btn stmt-share-btn--primary"
                  onClick={() => setStep("form")}
                >
                  Try again

                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M20 11a8 8 0 1 0 2 5" />
                    <path d="M20 4v7h-7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}