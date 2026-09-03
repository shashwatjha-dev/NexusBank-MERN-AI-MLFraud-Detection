import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  X,
  CheckCircle2,
  ShieldCheck,
  LockKeyhole,
  Sparkles,
  ArrowRight,
  Clock3,
  Activity,
  BrainCircuit,
  Fingerprint,
  AlertTriangle,
  UserRound,
  Smartphone,
  IndianRupee,
  Zap,
  Timer,
  ShieldAlert,
} from "lucide-react";

import { transferService } from "../../services/transferService.js";
import { OtpForm } from "../../components/auth/OtpForm.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { useToast } from "../../hooks/useToast.js";
import { formatPaise } from "../../utils/money.js";

import "./TransferVerifyPage.css";


// ============================================================
// RISK HELPERS
// ============================================================

function getRiskLevel(transaction) {
  const score = Number(transaction?.finalRiskScore ?? 0);

  if (transaction?.riskLevel) {
    return String(transaction.riskLevel).toUpperCase();
  }

  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";

  return "LOW";
}


function getRiskTheme(level) {
  if (level === "HIGH") return "high";
  if (level === "MEDIUM") return "medium";

  return "low";
}


function getRiskDescription(level) {
  if (level === "HIGH") {
    return "Multiple high-risk signals were detected. This transaction requires the highest level of security review.";
  }

  if (level === "MEDIUM") {
    return "Some unusual transaction signals were detected. Additional verification is required before completion.";
  }

  return "The transaction behaviour appears normal based on the available fraud signals.";
}


// ============================================================
// OTP SECURITY THRESHOLD
// ============================================================

const OTP_THRESHOLD_PAISE = 500000;


function requiresAmountOtp(amountPaise) {
  return Number(amountPaise || 0) > OTP_THRESHOLD_PAISE;
}


// ============================================================
// MAIN PAGE
// ============================================================

export function TransferVerifyPage() {
  const { id } = useParams();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [rewardPopup, setRewardPopup] = useState(null);

  const [otpMeta, setOtpMeta] = useState({
    expiresInSeconds: 300,
    resendAvailableInSeconds: 60,
    demoOtp: null,
  });

  const toast = useToast();


  // ==========================================================
  // LOAD TRANSACTION
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadTransaction() {
      try {
        setLoading(true);
        setError(null);

        const tx = await transferService.get(id);

        if (cancelled) return;

        setTransaction(tx);

        const savedOtp = sessionStorage.getItem(
          `nexusbank.transfer.${id}.otp`
        );

        if (savedOtp) {
          setOtpMeta((prev) => ({
            ...prev,
            demoOtp: savedOtp,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransaction();

    return () => {
      cancelled = true;
    };
  }, [id]);


  // ==========================================================
  // REWARD POPUP
  // ==========================================================

  const showRewardPopup = (reward) => {
    if (!reward?.points) return;

    setRewardPopup({
      points: reward.points,
      message:
        reward.message ||
        `Congratulations! You earned ${reward.points} reward points.`,
    });

    window.setTimeout(() => {
      setRewardPopup(null);
    }, 3500);
  };


  // ==========================================================
  // VERIFY OTP
  // ==========================================================

  const submit = async (otp) => {
    setSubmitting(true);

    try {
      const { data, message } =
        await transferService.verify(id, otp);

      setTransaction(data);

      toast.success(
        message ||
          "Transfer completed after verification."
      );

      if (data?.reward && data.reward.points > 0) {
        showRewardPopup(data.reward);
      }

      sessionStorage.removeItem(
        `nexusbank.transfer.${id}.otp`
      );

      // IMPORTANT:
      // Stay on this page after successful transfer.
      // Do not navigate to Transactions automatically.
    } catch (err) {
      toast.error(
        err.message ||
          "OTP verification failed."
      );
    } finally {
      setSubmitting(false);
    }
  };


  // ==========================================================
  // RESEND OTP
  // ==========================================================

  const handleResend = async () => {
    try {
      const { data, message } =
        await transferService.resendVerifyOtp(id);

      if (data) {
        setOtpMeta({
          expiresInSeconds:
            data.expiresInSeconds || 300,

          resendAvailableInSeconds:
            data.resendAvailableInSeconds || 60,

          demoOtp:
            data.demoOtp || null,
        });

        if (data.demoOtp) {
          sessionStorage.setItem(
            `nexusbank.transfer.${id}.otp`,
            data.demoOtp
          );
        }
      }

      toast.success(
        message ||
          "A fresh verification code has been generated."
      );

      return data;
    } catch (err) {
      toast.error(
        err.message ||
          "Unable to resend verification code."
      );

      throw err;
    }
  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="transfer-verify-loading">
        <Skeleton height={420} radius={24} />
      </div>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <ErrorState
        description={error.message}
      />
    );
  }


  if (!transaction) {
    return null;
  }


  // ==========================================================
  // DATA
  // ==========================================================

  const completed =
    transaction.status === "COMPLETED";

  const riskLevel =
    getRiskLevel(transaction);

  const riskTheme =
    getRiskTheme(riskLevel);

  const amount =
    formatPaise(transaction.amountPaise);

  const beneficiaryName =
    transaction.beneficiary?.name ||
    transaction.beneficiaryName ||
    "Beneficiary";

  const riskScore =
    Number(transaction.finalRiskScore ?? 0);

  const ruleScore =
    Number(transaction.ruleScore ?? 0);

  const behaviouralScore =
    Number(transaction.behaviouralScore ?? 0);

  const mlProbability =
    transaction.mlProbability == null
      ? null
      : Math.round(
          Number(transaction.mlProbability) * 100
        );

  const amountRequiresOtp =
    requiresAmountOtp(
      transaction.amountPaise
    );

  const triggeredRules =
    Array.isArray(transaction.triggeredRules)
      ? transaction.triggeredRules
      : [];

  const behaviouralSignals =
    Array.isArray(transaction.behaviouralSignals)
      ? transaction.behaviouralSignals
      : [];


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div
      className={`transfer-verify transfer-verify--${riskTheme}`}
      data-risk={riskLevel}
    >

      {/* ======================================================
          BACKGROUND
      ======================================================= */}

      <div className="transfer-verify__grid" />

      <motion.div
        className="transfer-verify__ambient transfer-verify__ambient--one"
        animate={{
          x: [0, 25, 0],
          y: [0, -18, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="transfer-verify__ambient transfer-verify__ambient--two"
        animate={{
          x: [0, -20, 0],
          y: [0, 20, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />


      {/* ======================================================
          REWARD
      ======================================================= */}

      <AnimatePresence>
        {rewardPopup && (
          <motion.div
            className="transfer-reward"
            initial={{
              opacity: 0,
              y: -30,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -20,
              scale: 0.95,
            }}
          >
            <button
              type="button"
              className="transfer-reward__close"
              onClick={() =>
                setRewardPopup(null)
              }
            >
              <X size={17} />
            </button>

            <div className="transfer-reward__icon">
              <Gift size={25} />
            </div>

            <div>
              <span>REWARD EARNED</span>
              <strong>
                🎉 Congratulations!
              </strong>
              <p>
                You earned{" "}
                <b>
                  {rewardPopup.points} points
                </b>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ======================================================
          HEADER
      ======================================================= */}

      <motion.header
        className="transfer-verify__header"
        initial={{
          opacity: 0,
          y: -15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <div>

          <div className="transfer-verify__eyebrow">
            <ShieldCheck size={15} />
            SECURE TRANSFER VERIFICATION

            <span className="transfer-verify__live">
              <i />
              LIVE
            </span>
          </div>

          <h1>
            Verify this transfer
            <span className="transfer-verify__live-dot" />
          </h1>

          <p>
            Your transfer has been screened by the
            NexusBank fraud protection engine.
          </p>

        </div>

        <div className="transfer-verify__step">
          <span>TRANSFER</span>
          <strong>STEP 2</strong>
          <small>OF 2</small>
        </div>

      </motion.header>


      {/* ======================================================
          TRANSFER SUMMARY
      ======================================================= */}

      <motion.section
        className="transfer-summary"
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >

        <div className="transfer-summary__amount">
          <span>TRANSFER AMOUNT</span>
          <strong>{amount}</strong>
        </div>

        <div className="transfer-summary__arrow">
          <ArrowRight size={19} />
        </div>

        <div className="transfer-summary__recipient">

          <div className="transfer-summary__avatar">
            {beneficiaryName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <span>RECIPIENT</span>
            <strong>
              {beneficiaryName}
            </strong>
          </div>

        </div>

        <div className="transfer-summary__status">

          <span>FRAUD RISK</span>

          <strong
            className={`risk-text risk-text--${riskTheme}`}
          >
            <i />
            {riskLevel} RISK
          </strong>

        </div>

      </motion.section>


      {/* ======================================================
          COMPLETED
      ======================================================= */}

      <AnimatePresence mode="wait">

        {completed ? (

          <motion.section
            key="completed"
            className="transfer-success"
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
          >

            <motion.div
              className="transfer-success__icon"
              initial={{
                scale: 0,
                rotate: -25,
              }}
              animate={{
                scale: 1,
                rotate: 0,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 14,
              }}
            >
              <CheckCircle2 size={48} />
            </motion.div>

            <div>

              <span className="transfer-success__eyebrow">
                VERIFICATION COMPLETE
              </span>

              <h2>
                Transfer completed successfully
              </h2>

              <p>
                Your OTP was verified and the
                transfer has been completed.
              </p>

            </div>

            <div className="transfer-success__secure">
              <LockKeyhole size={17} />
              Transaction secured by NexusBank
              fraud engine
            </div>

          </motion.section>

        ) : (

          <motion.div
            key="verification"
            className="transfer-verify__main"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
          >

            {/* =================================================
                LEFT — OTP
            ================================================== */}

            <motion.section
              className="otp-security-card"
              initial={{
                opacity: 0,
                x: -25,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.1,
              }}
            >

              <div className="otp-security-card__glow" />

              <div className="otp-security-card__header">

                <div>

                  <div className="otp-security-card__eyebrow">
                    <LockKeyhole size={14} />
                    TRANSACTION SECURITY
                  </div>

                  <h2>
                    Confirm your transfer
                  </h2>

                  <p>
                    Enter the one-time verification
                    code to authorize this transaction.
                  </p>

                </div>

                <motion.div
                  className="otp-security-badge"
                  animate={{
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      "0 0 0 rgba(34,197,94,0)",
                      "0 0 30px rgba(34,197,94,.25)",
                      "0 0 0 rgba(34,197,94,0)",
                    ],
                  }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                  }}
                >
                  <ShieldCheck size={24} />
                </motion.div>

              </div>


              {/* =================================================
                  OTP REASON
              ================================================== */}

              <motion.div
                className="otp-required-banner"
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >

                <div className="otp-required-banner__icon">
                  <IndianRupee size={21} />
                </div>

                <div>

                  <strong>
                    OTP verification required
                  </strong>

                  <p>
                    {amountRequiresOtp
                      ? `This transfer exceeds the ₹5,000 security limit.`
                      : "Additional verification is required for this transaction."}
                  </p>

                </div>

                <div className="otp-required-banner__status">
                  <LockKeyhole size={15} />
                  SECURE
                </div>

              </motion.div>


              {/* =================================================
                  PHONE ANIMATION
              ================================================== */}

              <div className="otp-phone-scene">

                <motion.div
                  className="otp-phone-orbit otp-phone-orbit--one"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <motion.div
                  className="otp-phone-orbit otp-phone-orbit--two"
                  animate={{
                    rotate: -360,
                  }}
                  transition={{
                    duration: 17,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <span className="otp-phone-particle otp-phone-particle--one" />
                <span className="otp-phone-particle otp-phone-particle--two" />
                <span className="otp-phone-particle otp-phone-particle--three" />
                <span className="otp-phone-particle otp-phone-particle--four" />

                <motion.div
                  className="otp-phone"
                  animate={{
                    y: [0, -7, 0],
                    rotate: [-1, 1, -1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >

                  <div className="otp-phone__speaker" />

                  <div className="otp-phone__screen">

                    <div className="otp-phone__screen-top">
                      <span>NEXUSBANK</span>
                      <LockKeyhole size={11} />
                    </div>

                    <div className="otp-phone__shield">
                      <ShieldCheck size={34} />
                    </div>

                    <span className="otp-phone__screen-label">
                      VERIFICATION CODE
                    </span>

                    <strong>
                      {otpMeta.demoOtp
                        ? otpMeta.demoOtp
                            .split("")
                            .join(" ")
                        : "• • • • • •"}
                    </strong>

                    <motion.div
                      className="otp-phone__scan"
                      animate={{
                        y: [0, 80, 0],
                      }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    <small>
                      Secure one-time code
                    </small>

                  </div>

                  <div className="otp-phone__home" />

                </motion.div>


                <motion.div
                  className="otp-floating-lock"
                  animate={{
                    y: [0, -9, 0],
                    rotate: [-5, 5, -5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                >
                  <LockKeyhole size={18} />
                </motion.div>

              </div>


              {/* =================================================
                  DEMO OTP
              ================================================== */}

              {otpMeta.demoOtp && (

                <motion.div
                  className="otp-demo-code"
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                >

                  <div className="otp-demo-code__icon">
                    <Sparkles size={16} />
                  </div>

                  <div>
                    <span>
                      DEVELOPMENT MODE
                    </span>

                    <p>
                      Demo verification code
                    </p>
                  </div>

                  <strong>
                    {otpMeta.demoOtp}
                  </strong>

                </motion.div>

              )}


              {/* =================================================
                  OTP FORM
              ================================================== */}

              <div className="otp-form-shell">

                <OtpForm
                  onSubmit={submit}
                  loading={submitting}
                  expiresInSeconds={
                    otpMeta.expiresInSeconds
                  }
                  resendAvailableInSeconds={
                    otpMeta.resendAvailableInSeconds
                  }
                  onResend={handleResend}
                  hint={
                    !otpMeta.demoOtp
                      ? "Enter the 6-digit verification code sent to your registered email."
                      : null
                  }
                />

              </div>


              <div className="otp-security-footer">

                <div>
                  <Clock3 size={15} />
                  Code expires automatically
                </div>

                <div>
                  <Fingerprint size={15} />
                  One-time use only
                </div>

                <div>
                  <LockKeyhole size={15} />
                  Bank secured
                </div>

              </div>

            </motion.section>


            {/* =================================================
                RIGHT — FRAUD ENGINE
            ================================================== */}

            <motion.section
              className="fraud-engine-card"
              initial={{
                opacity: 0,
                x: 25,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.16,
              }}
            >

              {/* ENGINE HEADER */}

              <div className="fraud-engine-header">

                <div className="fraud-engine-title">

                  <motion.div
                    className="fraud-engine-icon"
                    animate={{
                      boxShadow: [
                        "0 0 0 rgba(34,197,94,0)",
                        "0 0 25px rgba(34,197,94,.25)",
                        "0 0 0 rgba(34,197,94,0)",
                      ],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                    }}
                  >
                    <BrainCircuit size={24} />
                  </motion.div>

                  <div>

                    <div className="fraud-engine-eyebrow">
                      FRAUD ENGINE
                    </div>

                    <h2>
                      AI-powered security analysis
                    </h2>

                    <p>
                      Rules, behaviour and machine
                      learning signals were evaluated.
                    </p>

                  </div>

                </div>


                <div className="fraud-live-status">
                  <i />
                  ANALYSIS COMPLETE
                </div>

              </div>


              {/* =================================================
                  RISK HERO
              ================================================== */}

              <div className="fraud-risk-hero">

                <div className="fraud-risk-hero__top">

                  <div>

                    <span className="fraud-risk-label">
                      FINAL FRAUD SCORE
                    </span>

                    <div
                      className={`fraud-score fraud-score--${riskTheme}`}
                    >
                      <strong>
                        {riskScore}
                      </strong>

                      <span>
                        /100
                      </span>
                    </div>

                    <div
                      className={`fraud-risk-pill fraud-risk-pill--${riskTheme}`}
                    >
                      <i />
                      {riskLevel} RISK
                    </div>

                  </div>


                  <div className="fraud-score-ring">

                    <motion.div
                      className="fraud-score-ring__pulse"
                      animate={{
                        scale: [1, 1.08, 1],
                        opacity: [0.35, 0, 0.35],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                      }}
                    />

                    <motion.div
                      className={`fraud-score-ring__arc fraud-score-ring__arc--${riskTheme}`}
                      initial={{
                        rotate: -130,
                      }}
                      animate={{
                        rotate:
                          -130 +
                          Math.min(
                            260,
                            riskScore * 2.6
                          ),
                      }}
                      transition={{
                        duration: 1.3,
                        ease: [
                          0.22,
                          1,
                          0.36,
                          1,
                        ],
                      }}
                    />

                    <ShieldCheck size={34} />

                  </div>

                </div>


                <div className="fraud-risk-explanation">

                  <div className="fraud-risk-explanation__icon">
                    {riskLevel === "HIGH" ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                  </div>

                  <div>

                    <strong>
                      {riskLevel === "HIGH"
                        ? "High-risk activity detected"
                        : riskLevel === "MEDIUM"
                        ? "Additional security review"
                        : "Transaction behaviour looks normal"}
                    </strong>

                    <p>
                      {getRiskDescription(
                        riskLevel
                      )}
                    </p>

                  </div>

                </div>

              </div>


              {/* =================================================
                  OTP VS FRAUD EXPLANATION
              ================================================== */}

              <motion.div
                className="fraud-otp-explanation"
                animate={{
                  borderColor: [
                    "rgba(245,158,11,.25)",
                    "rgba(245,158,11,.55)",
                    "rgba(245,158,11,.25)",
                  ],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                }}
              >

                <div className="fraud-otp-explanation__icon">
                  <ShieldAlert size={20} />
                </div>

                <div>

                  <strong>
                    Why OTP is required
                  </strong>

                  <p>
                    {amountRequiresOtp
                      ? `The transfer amount of ${amount} is above the ₹5,000 transaction security threshold.`
                      : "This transaction has been selected for additional verification."}
                  </p>

                  <small>
                    <LockKeyhole size={12} />
                    OTP security threshold is separate
                    from the fraud-risk score.
                  </small>

                </div>

              </motion.div>


              {/* =================================================
                  ENGINE SCORES
              ================================================== */}

              <div className="fraud-score-grid">

                <EngineScoreCard
                  icon={<ShieldCheck size={19} />}
                  label="RULE ENGINE"
                  value={ruleScore}
                  description={
                    ruleScore >= 60
                      ? "Elevated"
                      : ruleScore >= 30
                      ? "Moderate"
                      : "Low"
                  }
                  theme={
                    ruleScore >= 60
                      ? "high"
                      : ruleScore >= 30
                      ? "medium"
                      : "low"
                  }
                />

                <EngineScoreCard
                  icon={<Activity size={19} />}
                  label="BEHAVIOURAL"
                  value={behaviouralScore}
                  description={
                    behaviouralScore >= 60
                      ? "Unusual pattern"
                      : behaviouralScore >= 30
                      ? "Some deviation"
                      : "Normal pattern"
                  }
                  theme={
                    behaviouralScore >= 60
                      ? "high"
                      : behaviouralScore >= 30
                      ? "medium"
                      : "low"
                  }
                />

                <EngineScoreCard
                  icon={<BrainCircuit size={19} />}
                  label="ML RISK"
                  value={mlProbability}
                  description={
                    mlProbability == null
                      ? "Unavailable"
                      : mlProbability >= 60
                      ? "High probability"
                      : mlProbability >= 30
                      ? "Moderate probability"
                      : "Low probability"
                  }
                  theme={
                    mlProbability == null
                      ? "neutral"
                      : mlProbability >= 60
                      ? "high"
                      : mlProbability >= 30
                      ? "medium"
                      : "low"
                  }
                />

              </div>


              {/* =================================================
                  SIGNALS
              ================================================== */}

              <div className="fraud-signals-grid">

                <SignalSection
                  title="Triggered Rules"
                  icon={<ShieldCheck size={17} />}
                  count={triggeredRules.length}
                  rules={triggeredRules}
                  type="rules"
                />

                <SignalSection
                  title="Behavioural Signals"
                  icon={<Activity size={17} />}
                  count={behaviouralSignals.length}
                  rules={behaviouralSignals}
                  type="behaviour"
                />

              </div>

            </motion.section>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}


// ============================================================
// ENGINE SCORE CARD
// ============================================================

function EngineScoreCard({
  icon,
  label,
  value,
  description,
  theme,
}) {
  return (
    <motion.div
      className={`engine-score-card engine-score-card--${theme}`}
      whileHover={{
        y: -4,
      }}
    >

      <div className="engine-score-card__top">

        <div className="engine-score-card__icon">
          {icon}
        </div>

        <span>
          {label}
        </span>

      </div>

      <div className="engine-score-card__value">

        <strong>
          {value == null ? "—" : value}
        </strong>

        {value != null && (
          <small>/100</small>
        )}

      </div>

      <span className="engine-score-card__description">
        {description}
      </span>

    </motion.div>
  );
}


// ============================================================
// SIGNAL SECTION
// ============================================================

function SignalSection({
  title,
  icon,
  count,
  rules,
  type,
}) {
  return (
    <div className="fraud-signal-section">

      <div className="fraud-signal-section__header">

        <div className="fraud-signal-section__title">

          <div className="fraud-signal-section__icon">
            {icon}
          </div>

          <strong>
            {title}
          </strong>

          <span>
            {count}
          </span>

        </div>

        <Activity size={15} />

      </div>


      <div className="fraud-signal-section__list">

        {rules.length === 0 ? (

          <div className="fraud-empty-signal">
            <CheckCircle2 size={16} />
            No unusual signals detected.
          </div>

        ) : (

          rules.map((rule, index) => {

            const label =
              rule.label ||
              rule.code ||
              "Security signal";

            const evidence =
              rule.evidence ||
              rule.description ||
              "Signal contributed to the analysis.";

            const contribution =
              rule.contribution ??
              (rule.value != null
                ? `${rule.value}${
                    rule.unit === "percent"
                      ? "%"
                      : ""
                  }`
                : "");

            return (
              <motion.div
                className="fraud-signal-row"
                key={
                  rule.code ||
                  `${type}-${index}`
                }
                initial={{
                  opacity: 0,
                  x: -8,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: index * 0.07,
                }}
              >

                <div className="fraud-signal-row__icon">

                  {type === "behaviour" ? (
                    <Activity size={16} />
                  ) : (
                    <ShieldCheck size={16} />
                  )}

                </div>

                <div className="fraud-signal-row__body">

                  <strong>
                    {label}
                  </strong>

                  <p>
                    {evidence}
                  </p>

                </div>

                {contribution !== "" && (
                  <span className="fraud-signal-row__score">
                    +{contribution}
                  </span>
                )}

              </motion.div>
            );
          })

        )}

      </div>

    </div>
  );
}