import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, ArrowRight, Loader2 } from "lucide-react";
import "./OtpForm.css";

const LEN = 6;

export function OtpForm({
  onSubmit,
  loading,
  hint,
  expiresInSeconds,
  resendAvailableInSeconds,
  onResend,
  maskedEmail,
}) {
  const [digits, setDigits] = useState(Array(LEN).fill(""));
  const refs = useRef([]);

  const initialExpiry = useMemo(
    () =>
      expiresInSeconds
        ? Date.now() + expiresInSeconds * 1000
        : null,
    [expiresInSeconds]
  );

  const initialResend = useMemo(
    () =>
      resendAvailableInSeconds
        ? Date.now() + resendAvailableInSeconds * 1000
        : Date.now(),
    [resendAvailableInSeconds]
  );

  const [expiryAt, setExpiryAt] = useState(initialExpiry);
  const [resendAt, setResendAt] = useState(initialResend);
  const [now, setNow] = useState(Date.now());
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState(null);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!expiryAt && !resendAt) return undefined;

    const tick = () => setNow(Date.now());

    const id = window.setInterval(tick, 500);

    return () => window.clearInterval(id);
  }, [expiryAt, resendAt]);

  const expiryLeft = expiryAt
    ? Math.max(0, Math.ceil((expiryAt - now) / 1000))
    : null;

  const resendLeft = resendAt
    ? Math.max(0, Math.ceil((resendAt - now) / 1000))
    : 0;

  const canResend =
    Boolean(onResend) &&
    resendLeft === 0 &&
    !resending &&
    !loading;

  const setDigit = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];

    next[index] = value;

    setDigits(next);

    if (value && index < LEN - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index, event) => {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < LEN - 1
    ) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (event) => {
    const text = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LEN);

    if (!text) return;

    event.preventDefault();

    const next = Array(LEN).fill("");

    for (let i = 0; i < text.length; i += 1) {
      next[i] = text[i];
    }

    setDigits(next);

    refs.current[
      Math.min(text.length, LEN - 1)
    ]?.focus();
  };

  const submit = (event) => {
    event.preventDefault();

    const otp = digits.join("");

    if (otp.length === LEN) {
      onSubmit(otp);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendError(null);

    try {
      const result = await onResend();

      if (result?.expiresInSeconds) {
        setExpiryAt(
          Date.now() + result.expiresInSeconds * 1000
        );
      }

      if (result?.resendAvailableInSeconds) {
        setResendAt(
          Date.now() +
            result.resendAvailableInSeconds * 1000
        );
      } else {
        setResendAt(Date.now() + 60_000);
      }

      setDigits(Array(LEN).fill(""));

      refs.current[0]?.focus();
    } catch (error) {
      setResendError(
        error?.message || "Could not resend the code."
      );
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.every(Boolean);

  return (
    <form
      onSubmit={submit}
      className="premium-otp-form"
      data-testid="otp-form"
    >
      {maskedEmail && (
        <div className="premium-otp-meta">
          <span>Sent to</span>
          <strong>{maskedEmail}</strong>
        </div>
      )}

      {/* OTP */}
      <div
        className="premium-otp-inputs"
        onPaste={onPaste}
        aria-label="One-time password"
      >
        {digits.map((digit, index) => (
          <div
            key={index}
            className={[
              "premium-otp-cell-wrap",
              digit ? "is-filled" : "",
              isComplete ? "is-complete" : "",
            ].join(" ")}
          >
            <input
              ref={(el) => {
                refs.current[index] = el;
              }}
              className="premium-otp-cell"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) =>
                setDigit(index, e.target.value)
              }
              onKeyDown={(e) =>
                onKeyDown(index, e)
              }
              aria-label={`OTP digit ${index + 1}`}
              data-testid={`otp-digit-${index}`}
            />

            {!digit && (
              <span className="premium-otp-placeholder">
                {index + 1}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="premium-otp-status">
        <div className="premium-otp-expiry">
          <span className="status-dot" />

          {expiryLeft != null && expiryLeft > 0 ? (
            <>
              Code expires in{" "}
              <strong>
                {formatSeconds(expiryLeft)}
              </strong>
            </>
          ) : (
            <span className="otp-expired">
              Code expired — request a new one.
            </span>
          )}
        </div>

        {onResend && (
          <button
            type="button"
            className="premium-resend"
            onClick={handleResend}
            disabled={!canResend}
            data-testid="otp-resend"
          >
            <RefreshCcw size={14} />

            {resending
              ? "Sending..."
              : resendLeft > 0
                ? `Resend in ${resendLeft}s`
                : "Resend code"}
          </button>
        )}
      </div>

      {/* Hint */}
      {hint && (
        <div
          className="premium-otp-hint"
          data-testid="otp-hint"
        >
          <span>DEV</span>
          <strong>{hint}</strong>
        </div>
      )}

      {/* Error */}
      {resendError && (
        <div
          className="premium-otp-error"
          role="alert"
          data-testid="otp-resend-error"
        >
          {resendError}
        </div>
      )}

      {/* Verify button */}
      <button
        type="submit"
        className="premium-verify-button"
        disabled={
          !isComplete ||
          expiryLeft === 0 ||
          loading
        }
        data-testid="otp-submit"
      >
        <span>
          {loading ? "Verifying..." : "Verify & continue"}
        </span>

        {loading ? (
          <Loader2
            size={19}
            className="otp-spinner"
          />
        ) : (
          <ArrowRight size={19} />
        )}
      </button>
    </form>
  );
}

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;

  return `${m}:${s
    .toString()
    .padStart(2, "0")}`;
}