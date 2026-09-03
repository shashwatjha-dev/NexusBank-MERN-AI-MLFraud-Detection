import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  ShieldCheck,
  BrainCircuit,
  Activity,
  LockKeyhole,
  Zap,
  ArrowRight,
  WalletCards,
  AlertTriangle,
  XCircle,
  LoaderCircle,
  Sparkles,
  Gift,
  X,
  Smartphone,
  UserRound,
  IndianRupee,
  Gauge,
  MapPin,
  Eye,
  ChevronRight,
} from "lucide-react";

import { useApi } from "../../hooks/useApi.js";
import { accountService } from "../../services/accountService.js";
import { beneficiaryService } from "../../services/beneficiaryService.js";
import { transferService } from "../../services/transferService.js";

import { TransferForm } from "../../components/transfer/TransferForm.jsx";
import { Button } from "../../components/common/Button.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";

import { useToast } from "../../hooks/useToast.js";

import "./TransferPage.css";

/* ============================================================
   FRAUD SCAN ITEMS
============================================================ */

const scanItems = [
  {
    label: "Device reputation",
    icon: Smartphone,
  },
  {
    label: "Beneficiary trust",
    icon: UserRound,
  },
  {
    label: "Transaction pattern",
    icon: Activity,
  },
  {
    label: "Location match",
    icon: MapPin,
  },
  {
    label: "Amount behaviour",
    icon: IndianRupee,
  },
  {
    label: "Velocity check",
    icon: Gauge,
  },
  {
    label: "Behaviour analysis",
    icon: Activity,
  },
  {
    label: "ML risk score",
    icon: BrainCircuit,
  },
];

/* ============================================================
   TRANSFER STEPS
============================================================ */

const steps = [
  {
    number: "01",
    title: "Enter details",
    subtitle: "Recipient & amount",
  },
  {
    number: "02",
    title: "Review transfer",
    subtitle: "Check information",
  },
  {
    number: "03",
    title: "Fraud analysis",
    subtitle: "AI risk evaluation",
  },
  {
    number: "04",
    title: "Confirm transfer",
    subtitle: "Authenticate & send",
  },
];

/* ============================================================
   RISK CONFIG
============================================================ */

const riskConfig = {
  LOW: {
    label: "LOW RISK",
    shortLabel: "LOW",
    description: "This transaction is safe to proceed",
    icon: ShieldCheck,
    className: "transfer-risk--low",
  },

  MEDIUM: {
    label: "MEDIUM RISK",
    shortLabel: "MEDIUM",
    description: "Additional verification may be required",
    icon: AlertTriangle,
    className: "transfer-risk--medium",
  },

  HIGH: {
    label: "HIGH RISK",
    shortLabel: "HIGH",
    description: "Suspicious activity detected",
    icon: XCircle,
    className: "transfer-risk--high",
  },
};

/* ============================================================
   REFERENCE PREVIEW
============================================================ */

const REFERENCE_DEMO_TRANSACTION = {
  id: "reference-preview-transfer",
  _id: "reference-preview-transfer",

  riskLevel: "LOW",

  finalRiskScore: 11,
  riskScore: 11,

  ruleScore: 20,
  behaviouralScore: 5,

  mlRisk: 0,
  mlProbability: 0,

  fraudDecision: "COMPLETED",

  decisionReason:
    "Low-risk transfer. Device, beneficiary, location and transaction behaviour are consistent with the account profile.",

  amount: 2500,

  isInternal: false,

  triggeredRules: [
    {
      code: "PREVIOUS_SUSPICIOUS_ACTIVITY",
      label: "Previous suspicious activity",
      evidence: "18 previous fraud record(s) found",
      contribution: 20,
    },
  ],

  behaviouralSignals: [
    {
      code: "ELEVATED_RECENT_ACTIVITY",
      label: "Elevated recent activity",
      evidence: "1 transactions in the last five minutes",
      value: 1,
      unit: "transactions",
    },
  ],
};

/* ============================================================
   HELPERS
============================================================ */

function getRiskLevel(transaction) {
  return transaction?.riskLevel || "LOW";
}

function getScore(transaction) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number(
          transaction?.finalRiskScore ??
            transaction?.riskScore ??
            0
        )
      )
    )
  );
}

function getMlRisk(transaction) {
  if (
    transaction?.mlRisk !== undefined &&
    transaction?.mlRisk !== null &&
    Number.isFinite(Number(transaction.mlRisk))
  ) {
    return Math.round(Number(transaction.mlRisk));
  }

  if (
    transaction?.mlProbability !== undefined &&
    transaction?.mlProbability !== null &&
    Number.isFinite(Number(transaction.mlProbability))
  ) {
    return Math.round(
      Number(transaction.mlProbability) * 100
    );
  }

  return 0;
}

function getDecisionLabel(decision) {
  if (decision === "BLOCKED") {
    return "Blocked";
  }

  if (decision === "VERIFICATION_REQUIRED") {
    return "Verification Required";
  }

  if (decision === "COMPLETED") {
    return "Proceed";
  }

  return "Pending";
}

function getGaugePoint(score) {
  const safeScore = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  const angle = Math.PI - (Math.PI * safeScore) / 100;
  const radius = 128;

  return {
    x: 160 + radius * Math.cos(angle),
    y: 155 - radius * Math.sin(angle),
  };
}

/* ============================================================
   MAIN PAGE
============================================================ */

export function TransferPage() {
  const accounts = useApi(
    () => accountService.list(),
    []
  );

  const beneficiaries = useApi(
    () => beneficiaryService.list(),
    []
  );

  /*
   * IMPORTANT:
   *
   * Previously result was initialized with the reference
   * transaction. That made Fraud Analysis step 03 appear
   * active immediately when the page opened.
   *
   * Keep the reference transaction available, but do not
   * automatically put the page into the completed state.
   */
  const [result, setResult] = useState(null);

  /*
   * REAL STEPPER STATE
   *
   * 1 = Enter details
   * 2 = Review transfer
   * 3 = Fraud analysis
   * 4 = Confirm transfer
   */
  const [activeStep, setActiveStep] = useState(1);

  const [submitting, setSubmitting] = useState(false);

  const [rewardPopup, setRewardPopup] =
    useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  /* ==========================================================
     REWARD POPUP
  ========================================================== */

  const showRewardPopup = (reward) => {
    if (
      !reward?.points ||
      Number(reward.points) <= 0
    ) {
      return;
    }

    setRewardPopup({
      points: reward.points,
      message:
        reward.message ||
        `Congratulations! You earned ${reward.points} reward points.`,
    });

    window.setTimeout(() => {
      setRewardPopup(null);
    }, 5000);
  };

  /* ==========================================================
     SUBMIT TRANSFER
  ========================================================== */

  const handleSubmit = async (payload) => {
    /*
     * Step 01 -> Step 02
     *
     * User has submitted the transfer details.
     */
    setActiveStep(2);

    setSubmitting(true);
    setResult(null);
    setRewardPopup(null);

    /*
     * Give the review state a small visual moment before
     * moving into fraud analysis.
     */
    await new Promise((resolve) =>
      window.setTimeout(resolve, 180)
    );

    /*
     * Step 02 -> Step 03
     *
     * Fraud engine is now processing the transfer.
     */
    setActiveStep(3);

    try {
      const response =
        await transferService.create(payload);

      const responseData =
        response?.data || response;

      const transactionData =
        responseData?.transaction ||
        responseData;

      const message =
        response?.message ||
        responseData?.message ||
        "Transfer request processed.";

      setResult({
        transaction: transactionData,
        message,
      });

      const decision =
        transactionData?.fraudDecision;

      /* ======================================================
         BLOCKED
      ====================================================== */

      if (decision === "BLOCKED") {
        setActiveStep(3);

        toast.error(
          "This transfer was blocked by the fraud engine."
        );

        return;
      }

      /* ======================================================
         OTP REQUIRED
      ====================================================== */

      if (
        decision ===
        "VERIFICATION_REQUIRED"
      ) {
        const transactionId =
          transactionData?.id ||
          transactionData?._id;

        const demoOtp =
          transactionData?.demoOtp;

        if (
          transactionId &&
          demoOtp
        ) {
          sessionStorage.setItem(
            `nexusbank.transfer.${transactionId}.otp`,
            String(demoOtp)
          );
        }

        if (transactionId) {
          sessionStorage.setItem(
            `nexusbank.transfer.${transactionId}.otpExpires`,
            String(
              transactionData?.expiresInSeconds ||
                300
            )
          );
        }

        setActiveStep(4);

        toast.warn(
          "OTP verification required to complete this transfer."
        );

        return;
      }

      /* ======================================================
         COMPLETED
      ====================================================== */

      if (decision === "COMPLETED") {
        setActiveStep(4);

        toast.success(
          transactionData?.isInternal
            ? "Internal transfer completed."
            : "Transfer completed successfully."
        );

        if (
          transactionData?.reward &&
          Number(
            transactionData.reward.points
          ) > 0
        ) {
          showRewardPopup(
            transactionData.reward
          );
        }

        accounts.refetch();

        return;
      }

      setActiveStep(3);

      toast.success(message);
    } catch (error) {
      setActiveStep(1);

      toast.error(
        error?.message ||
          "Transfer could not be completed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================
     ERROR STATES
  ========================================================== */

  if (accounts.error) {
    return (
      <ErrorState
        description={accounts.error.message}
        onRetry={accounts.refetch}
      />
    );
  }

  if (beneficiaries.error) {
    return (
      <ErrorState
        description={
          beneficiaries.error.message
        }
        onRetry={beneficiaries.refetch}
      />
    );
  }

  /* ==========================================================
     DATA
  ========================================================== */

  const accountList =
    accounts.data || [];

  const beneficiaryList =
    beneficiaries.data || [];

  const transaction =
    result?.transaction;

  const displayTransaction =
    transaction || null;

  const isReferencePreview =
    displayTransaction?.id ===
    "reference-preview-transfer";

  const riskLevel =
    getRiskLevel(displayTransaction);

  const activeRisk =
    riskConfig[riskLevel] ||
    riskConfig.LOW;

  const riskScore =
    getScore(displayTransaction);

  const ruleScore = Math.round(
    Number(
      displayTransaction?.ruleScore ?? 0
    )
  );

  const behaviouralScore =
    Math.round(
      Number(
        displayTransaction?.behaviouralScore ??
          0
      )
    );

  const mlRisk =
    getMlRisk(displayTransaction);

  const gaugePoint =
    getGaugePoint(riskScore);

  const triggeredRules =
    displayTransaction?.triggeredRules ||
    [];

  const behaviouralSignals =
    displayTransaction?.behaviouralSignals ||
    [];

  const RiskIcon =
    activeRisk.icon;

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="transfer-page">

      {/* ======================================================
          REWARD POPUP
      ====================================================== */}

      <AnimatePresence>
        {rewardPopup && (
          <motion.div
            className="reward-popup"
            initial={{
              opacity: 0,
              y: -35,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -25,
              scale: 0.95,
            }}
            transition={{
              duration: 0.35,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setRewardPopup(null)
              }
              aria-label="Close reward notification"
              className="reward-popup__close"
            >
              <X size={18} />
            </button>

            <div className="reward-popup__content">
              <motion.div
                className="reward-popup__icon"
                initial={{
                  scale: 0.5,
                  rotate: -20,
                }}
                animate={{
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  delay: 0.15,
                  type: "spring",
                }}
              >
                <Gift size={29} />
              </motion.div>

              <div>
                <div className="reward-popup__eyebrow">
                  REWARD EARNED
                </div>

                <div className="reward-popup__title">
                  🎉 Congratulations!
                </div>

                <div className="reward-popup__text">
                  You got{" "}
                  <strong>
                    {rewardPopup.points} reward points
                  </strong>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================
          HERO
      ====================================================== */}

      <motion.header
        className="transfer-hero"
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
      >
        <div>
          <span className="transfer-eyebrow">
            <Zap size={13} />
            MOVE MONEY
          </span>

          <h1>
            Send a transfer
          </h1>

          <p>
            Every transfer passes through
            NexusBank's explainable fraud
            engine before your balance moves.
          </p>
        </div>

        <motion.div
          className="transfer-security-badge"
          whileHover={{
            y: -2,
          }}
        >
          <ShieldCheck size={18} />

          <span>
            <strong>
              Bank-grade Security
            </strong>

            <small>
              Your money is always protected
            </small>
          </span>
        </motion.div>
      </motion.header>

      {/* ======================================================
          STEPPER
      ====================================================== */}

      <motion.div
        className="transfer-stepper"
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.1,
          duration: 0.45,
        }}
      >
        {steps.map(
          (step, index) => {
            const stepNumber =
              index + 1;

            const isActive =
              activeStep === stepNumber;

            const isCompleted =
              activeStep > stepNumber;

            const stepClassName = [
              "transfer-step",
              isActive
                ? "transfer-step--active"
                : "",
              isCompleted
                ? "transfer-step--completed"
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                className={stepClassName}
                key={step.number}
              >
                <motion.div
                  className="transfer-step__number"
                  animate={
                    isActive
                      ? {
                          boxShadow: [
                            "0 0 0 rgba(33,227,195,0)",
                            "0 0 22px rgba(33,227,195,.32)",
                            "0 0 0 rgba(33,227,195,0)",
                          ],
                        }
                      : {
                          boxShadow:
                            "0 0 0 rgba(33,227,195,0)",
                        }
                  }
                  transition={{
                    duration: 2.2,
                    repeat: isActive
                      ? Infinity
                      : 0,
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2
                      size={17}
                    />
                  ) : isActive &&
                    submitting &&
                    stepNumber === 3 ? (
                    <LoaderCircle
                      className="spin"
                      size={18}
                    />
                  ) : (
                    step.number
                  )}
                </motion.div>

                <div className="transfer-step__content">
                  <strong>
                    {step.title}
                  </strong>

                  <span>
                    {step.subtitle}
                  </span>
                </div>

                {index !==
                  steps.length - 1 && (
                  <motion.div
                    className={[
                      "transfer-step__line",
                      activeStep >
                      stepNumber
                        ? "transfer-step__line--completed"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    animate={{
                      opacity:
                        activeStep >
                        stepNumber
                          ? 1
                          : isActive
                            ? [
                                0.35,
                                0.9,
                                0.35,
                              ]
                            : 0.7,
                    }}
                    transition={{
                      duration:
                        activeStep >
                        stepNumber
                          ? 0.25
                          : 2,
                      repeat:
                        isActive
                          ? Infinity
                          : 0,
                    }}
                  />
                )}
              </div>
            );
          }
        )}
      </motion.div>

      {/* ======================================================
          MAIN TWO COLUMN CONTENT
      ====================================================== */}

      <div className="transfer-layout">

        {/* ====================================================
            LEFT — TRANSFER FORM
        ==================================================== */}

        <motion.section
          className="transfer-form-card"
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: 0.15,
            duration: 0.5,
          }}
        >
          <div className="transfer-card-heading">
            <div className="transfer-card-icon transfer-card-icon--green">
              <WalletCards size={21} />
            </div>

            <div>
              <span>
                TRANSFER DETAILS
              </span>

              <h2>
                Recipient & amount
              </h2>
            </div>
          </div>

          {accounts.loading ? (
            <div className="transfer-loading">
              <LoaderCircle
                className="spin"
                size={24}
              />

              <span>
                Loading your accounts...
              </span>
            </div>
          ) : accountList.length ===
            0 ? (
            <EmptyState
              icon={UserPlus}
              title="No active accounts"
              description="Open an account before sending money."
              action={
                <Button
                  onClick={() =>
                    navigate(
                      "/app/accounts"
                    )
                  }
                >
                  Open account
                </Button>
              }
            />
          ) : beneficiaries.loading ? (
            <div className="transfer-loading">
              <LoaderCircle
                className="spin"
                size={24}
              />

              <span>
                Loading beneficiaries...
              </span>
            </div>
          ) : beneficiaryList.length ===
            0 ? (
            <EmptyState
              icon={UserPlus}
              title="Add a beneficiary first"
              description="You'll be able to send money once at least one beneficiary is on your list."
              action={
                <Button
                  onClick={() =>
                    navigate(
                      "/app/beneficiaries"
                    )
                  }
                >
                  Add beneficiary
                </Button>
              }
            />
          ) : (
            <TransferForm
              accounts={accountList}
              beneficiaries={
                beneficiaryList
              }
              onSubmit={handleSubmit}
              loading={submitting}
            />
          )}

          <div className="transfer-form-security">
            <div className="transfer-form-security__icon">
              <LockKeyhole size={16} />
            </div>

            <div>
              <strong>
                Bank-grade transfer protection
              </strong>

              <span>
                Your payment is screened
                against multiple fraud signals
                before processing.
              </span>
            </div>

            <ShieldCheck size={18} />
          </div>
        </motion.section>

        {/* ====================================================
            RIGHT — FRAUD ENGINE
        ==================================================== */}

        <motion.section
          className="transfer-analysis-column"
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: 0.2,
            duration: 0.5,
          }}
        >
          <div
            className={[
              "fraud-engine-card",
              displayTransaction
                ? activeRisk.className
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >

            {/* ==================================================
                FRAUD HEADER
            ================================================== */}

            <div className="fraud-engine-heading">
              <div className="transfer-card-icon transfer-card-icon--purple">
                <BrainCircuit size={21} />
              </div>

              <div>
                <span>
                  FRAUD ENGINE
                </span>

                <h2>
                  {submitting
                    ? "AI Fraud Analysis"
                    : displayTransaction
                      ? "AI Fraud Analysis Complete"
                      : "AI risk analysis"}
                </h2>

                <p>
                  {submitting
                    ? "Real-time analysis of your transfer and account signals."
                    : displayTransaction
                      ? "Real-time risk evaluation using advanced ML models and behavioural intelligence."
                      : "Submit a transfer to begin real-time fraud analysis."}
                </p>
              </div>

              <span className="ai-badge">
                <Sparkles size={11} />
                AI POWERED
              </span>
            </div>

            {/* ==================================================
                CONTENT STATES
            ================================================== */}

            <AnimatePresence mode="wait">

              {/* =================================================
                  SCANNING STATE
              ================================================= */}

              {submitting ? (
                <motion.div
                  key="scanning"
                  className="fraud-scanner"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <div className="scanner-visual">
                    <div className="scanner-ring scanner-ring--one" />
                    <div className="scanner-ring scanner-ring--two" />
                    <div className="scanner-ring scanner-ring--three" />

                    <motion.div
                      className="scanner-core"
                      animate={{
                        scale: [
                          1,
                          1.08,
                          1,
                        ],
                        boxShadow: [
                          "0 0 20px rgba(33,227,195,.12)",
                          "0 0 45px rgba(33,227,195,.28)",
                          "0 0 20px rgba(33,227,195,.12)",
                        ],
                      }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                      }}
                    >
                      <ShieldCheck
                        size={42}
                      />
                    </motion.div>

                    <motion.div
                      className="scanner-sweep"
                      animate={{
                        rotate: 360,
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </div>

                  <div className="scanner-status">
                    <strong>
                      Analyzing your transfer...
                    </strong>

                    <span>
                      NexusBank is checking
                      device, beneficiary,
                      behaviour and transaction
                      signals.
                    </span>
                  </div>

                  <div className="scan-grid">
                    {scanItems.map(
                      (
                        item,
                        index
                      ) => {
                        const ScanIcon =
                          item.icon;

                        return (
                          <motion.div
                            key={
                              item.label
                            }
                            className="scan-item"
                            initial={{
                              opacity: 0,
                              x: -8,
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                            }}
                            transition={{
                              delay:
                                index *
                                0.08,
                            }}
                          >
                            <motion.i
                              animate={{
                                opacity: [
                                  0.3,
                                  1,
                                  0.3,
                                ],
                              }}
                              transition={{
                                duration: 1,
                                repeat:
                                  Infinity,
                                delay:
                                  index *
                                  0.08,
                              }}
                            />

                            <ScanIcon
                              size={13}
                            />

                            <span>
                              {item.label}
                            </span>
                          </motion.div>
                        );
                      }
                    )}
                  </div>

                  <div className="analysis-progress">
                    <div className="analysis-progress__top">
                      <span>
                        Analysis progress
                      </span>

                      <strong>
                        SCANNING
                      </strong>
                    </div>

                    <div className="analysis-progress__bar">
                      <motion.div
                        animate={{
                          width: [
                            "0%",
                            "100%",
                          ],
                        }}
                        transition={{
                          duration: 2.5,
                          ease: "easeInOut",
                          repeat:
                            Infinity,
                        }}
                      />
                    </div>
                  </div>
                </motion.div>

              ) : displayTransaction ? (

                /* =================================================
                   RESULT STATE
                ================================================== */

                <motion.div
                  key="result"
                  className="fraud-result"
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.45,
                  }}
                >

                  {/* =============================================
                      TOP RESULT AREA
                  ============================================== */}

                  <div className="fraud-result-hero">

                    {/* =========================================
                        LEFT — GAUGE
                    ========================================== */}

                    <div className="fraud-score-block">
                      <span className="fraud-score-label">
                        FINAL FRAUD SCORE
                      </span>

                      <div className="fraud-gauge fraud-gauge--animated">
                        <svg
                          className="fraud-gauge__svg"
                          viewBox="0 0 320 190"
                          role="img"
                          aria-label={`Final fraud score ${riskScore} out of 100`}
                        >
                          <defs>
                            <linearGradient
                              id="fraudGaugeGradient"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="0%"
                            >
                              <stop
                                offset="0%"
                                stopColor="#21e3c3"
                              />

                              <stop
                                offset="48%"
                                stopColor="#3f9cff"
                              />

                              <stop
                                offset="100%"
                                stopColor="#a76bff"
                              />
                            </linearGradient>

                            <filter
                              id="fraudGaugeGlow"
                              x="-50%"
                              y="-60%"
                              width="200%"
                              height="220%"
                            >
                              <feGaussianBlur
                                stdDeviation="3"
                                result="blur"
                              />

                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>

                            <radialGradient
                              id="fraudGaugeCenterGlow"
                              cx="50%"
                              cy="100%"
                              r="70%"
                            >
                              <stop
                                offset="0%"
                                stopColor="#21e3c3"
                                stopOpacity="0.10"
                              />

                              <stop
                                offset="55%"
                                stopColor="#3f9cff"
                                stopOpacity="0.035"
                              />

                              <stop
                                offset="100%"
                                stopColor="#3f9cff"
                                stopOpacity="0"
                              />
                            </radialGradient>
                          </defs>

                          <path
                            d="M 52 155 A 108 108 0 0 1 268 155 Z"
                            fill="url(#fraudGaugeCenterGlow)"
                            className="fraud-gauge__background-glow"
                          />

                          <path
                            className="fraud-gauge__arc fraud-gauge__arc--track"
                            d="M 32 155 A 128 128 0 0 1 288 155"
                            pathLength="100"
                          />

                          <motion.path
                            className="fraud-gauge__arc fraud-gauge__arc--value"
                            d="M 32 155 A 128 128 0 0 1 288 155"
                            pathLength="100"
                            stroke="url(#fraudGaugeGradient)"
                            initial={{
                              strokeDasharray: "100 100",
                              strokeDashoffset: 100,
                            }}
                            animate={{
                              strokeDasharray: "100 100",
                              strokeDashoffset:
                                100 -
                                Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    riskScore
                                  )
                                ),
                            }}
                            transition={{
                              duration: 1.25,
                              ease: [
                                0.22,
                                1,
                                0.36,
                                1,
                              ],
                            }}
                            style={{
                              strokeLinecap: "round",
                              strokeDasharray:
                                "100 100",
                            }}
                            filter="url(#fraudGaugeGlow)"
                          />

                          <path
                            className="fraud-gauge__inner-arc"
                            d="M 55 155 A 105 105 0 0 1 265 155"
                          />

                          <path
                            className="fraud-gauge__ring"
                            d="M 70 155 A 90 90 0 0 1 250 155"
                          />

                          <path
                            className="fraud-gauge__ring"
                            d="M 84 155 A 76 76 0 0 1 236 155"
                          />

                          <line
                            className="fraud-gauge__tick"
                            x1="32"
                            y1="155"
                            x2="21"
                            y2="155"
                          />

                          <line
                            className="fraud-gauge__tick"
                            x1="69"
                            y1="66"
                            x2="60"
                            y2="57"
                          />

                          <line
                            className="fraud-gauge__tick fraud-gauge__tick--major"
                            x1="160"
                            y1="27"
                            x2="160"
                            y2="13"
                          />

                          <line
                            className="fraud-gauge__tick"
                            x1="251"
                            y1="66"
                            x2="260"
                            y2="57"
                          />

                          <line
                            className="fraud-gauge__tick"
                            x1="288"
                            y1="155"
                            x2="299"
                            y2="155"
                          />

                          <motion.circle
                            className="fraud-gauge__indicator-glow"
                            cx={gaugePoint.x}
                            cy={gaugePoint.y}
                            r="7"
                            initial={{
                              opacity: 0,
                            }}
                            animate={{
                              opacity: [
                                0.25,
                                0.55,
                                0.25,
                              ],
                            }}
                            transition={{
                              duration: 1.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />

                          <motion.circle
                            className="fraud-gauge__indicator"
                            cx={gaugePoint.x}
                            cy={gaugePoint.y}
                            r="3.2"
                            initial={{
                              opacity: 0,
                              scale: 0.5,
                            }}
                            animate={{
                              opacity: 1,
                              scale: [
                                1,
                                1.18,
                                1,
                              ],
                            }}
                            transition={{
                              opacity: {
                                duration: 0.3,
                                delay: 0.45,
                              },
                              scale: {
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut",
                              },
                            }}
                          />
                        </svg>

                        <span className="fraud-gauge__scale-number fraud-gauge__scale-number--zero">
                          0
                        </span>

                        <span className="fraud-gauge__scale-number fraud-gauge__scale-number--twenty-five">
                          25
                        </span>

                        <span className="fraud-gauge__scale-number fraud-gauge__scale-number--fifty">
                          50
                        </span>

                        <span className="fraud-gauge__scale-number fraud-gauge__scale-number--seventy-five">
                          75
                        </span>

                        <span className="fraud-gauge__scale-number fraud-gauge__scale-number--hundred">
                          100
                        </span>

                        <div className="fraud-gauge__inner">
                          <AnimatedNumber
                            value={riskScore}
                          />

                          <span className="fraud-gauge__score-total">
                            /100
                          </span>

                          <motion.strong
                            className="fraud-gauge__risk-label"
                            initial={{
                              opacity: 0,
                              y: 5,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay: 0.55,
                              duration: 0.35,
                            }}
                          >
                            {activeRisk.shortLabel}
                          </motion.strong>

                          <motion.small
                            className="fraud-gauge__risk-description"
                            initial={{
                              opacity: 0,
                            }}
                            animate={{
                              opacity: 1,
                            }}
                            transition={{
                              delay: 0.75,
                              duration: 0.4,
                            }}
                          >
                            {activeRisk.description}
                          </motion.small>
                        </div>

                        <div className="fraud-gauge__range-label">
                          <span>LOW</span>
                          <span>MEDIUM</span>
                          <span>HIGH</span>
                        </div>
                      </div>
                    </div>

                    {/* =========================================
                        RIGHT — DECISION
                    ========================================== */}

                    <div className="fraud-decision-block">
                      <span className="fraud-score-label">
                        FINAL DECISION
                      </span>

                      <motion.div
                        className="fraud-decision"
                        initial={{
                          opacity: 0,
                          scale: 0.94,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 0.2,
                          duration: 0.45,
                        }}
                      >
                        <div className="fraud-decision__top">
                          <span>
                            FINAL DECISION
                          </span>

                          <CheckCircle2
                            size={18}
                          />
                        </div>

                        <div className="fraud-decision__main">
                          <RiskIcon
                            size={22}
                          />

                          <strong>
                            {getDecisionLabel(
                              displayTransaction.fraudDecision
                            )}
                          </strong>
                        </div>

                        <p>
                          {displayTransaction.fraudDecision ===
                          "COMPLETED"
                            ? "Transaction is safe to continue"
                            : displayTransaction.fraudDecision ===
                                "BLOCKED"
                              ? "Transaction has been blocked for your protection"
                              : "Additional authentication is required"}
                        </p>
                      </motion.div>

                      <div className="fraud-stat-list">
                        <FraudStat
                          label="RULE SCORE"
                          value={
                            ruleScore
                          }
                          icon={
                            ShieldCheck
                          }
                          tone="green"
                          level={
                            ruleScore <=
                            30
                              ? "Low"
                              : ruleScore <=
                                  60
                                ? "Medium"
                                : "High"
                          }
                        />

                        <FraudStat
                          label="BEHAVIOUR SCORE"
                          value={
                            behaviouralScore
                          }
                          icon={
                            Activity
                          }
                          tone="purple"
                          level={
                            behaviouralScore <=
                            30
                              ? "Low"
                              : behaviouralScore <=
                                  60
                                ? "Medium"
                                : "High"
                          }
                        />

                        <FraudStat
                          label="ML RISK"
                          value={
                            mlRisk
                          }
                          icon={
                            BrainCircuit
                          }
                          tone="yellow"
                          level={
                            mlRisk <=
                            30
                              ? "Very Low"
                              : mlRisk <=
                                  60
                                ? "Medium"
                                : "High"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* =============================================
                      SIGNAL PANELS
                  ============================================== */}

                  <div className="fraud-analysis-grid">
                    <SignalPanel
                      title="Triggered Rules"
                      count={
                        triggeredRules.length
                      }
                      icon={
                        ShieldAlert
                      }
                      rules={
                        triggeredRules
                      }
                      type="rule"
                      emptyMessage="No fraud rules were triggered."
                    />

                    <SignalPanel
                      title="Behavioural Signals"
                      count={
                        behaviouralSignals.length
                      }
                      icon={
                        Activity
                      }
                      type="behaviour"
                      rules={
                        behaviouralSignals
                      }
                      emptyMessage="No behavioural deviations detected."
                    />
                  </div>

                  {/* =============================================
                      COMPLETE PROGRESS
                  ============================================== */}

                  <div className="analysis-progress analysis-progress--complete">
                    <div className="analysis-progress__top">
                      <span>
                        FRAUD ANALYSIS COMPLETE
                      </span>

                      <strong>
                        100%
                      </strong>
                    </div>

                    <div className="analysis-progress__bar">
                      <motion.div
                        initial={{
                          width: "0%",
                        }}
                        animate={{
                          width: "100%",
                        }}
                        transition={{
                          duration: 0.9,
                          ease: "easeOut",
                        }}
                      />
                    </div>

                    <div className="analysis-progress__scale">
                      <span>
                        0
                      </span>

                      <span>
                        LOW · MEDIUM · HIGH
                      </span>

                      <span>
                        100
                      </span>
                    </div>
                  </div>
                </motion.div>

              ) : (

                /* =================================================
                   EMPTY STATE
                ================================================== */

                <motion.div
                  key="empty"
                  className="fraud-empty"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                >
                  <div className="empty-radar">
                    <div />
                    <div />
                    <div />

                    <ShieldAlert
                      size={44}
                    />
                  </div>

                  <h3>
                    Fraud protection is ready
                  </h3>

                  <p>
                    Submit a transfer and
                    NexusBank will analyze
                    multiple behavioural and
                    transaction signals in real
                    time.
                  </p>

                  <div className="fraud-ready-items">
                    <span>
                      <Activity
                        size={14}
                      />
                      Behaviour analysis
                    </span>

                    <span>
                      <ShieldCheck
                        size={14}
                      />
                      Device trust
                    </span>

                    <span>
                      <BrainCircuit
                        size={14}
                      />
                      ML risk scoring
                    </span>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.section>
      </div>

      {/* ========================================================
          SUCCESS / REFERENCE RESULT BAR
      ========================================================= */}

      {isReferencePreview && (
        <motion.div
          className="transfer-reference-complete"
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.45,
            duration: 0.4,
          }}
        >
          <div className="transfer-reference-complete__icon">
            <CheckCircle2
              size={18}
            />
          </div>

          <div>
            <strong>
              Transfer completed successfully
            </strong>

            <span>
              Balance updated
            </span>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          REAL TRANSACTION ACTION
      ========================================================= */}

      {transaction &&
        !isReferencePreview && (
          <motion.div
            className={[
              "transfer-action-card",
              transaction.fraudDecision ===
              "VERIFICATION_REQUIRED"
                ? "transfer-action-card--otp"
                : transaction.fraudDecision ===
                    "BLOCKED"
                  ? "transfer-action-card--blocked"
                  : "transfer-action-card--success",
            ].join(" ")}
            initial={{
              opacity: 0,
              y: 14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.4,
              duration: 0.45,
            }}
          >
            {transaction.fraudDecision ===
              "VERIFICATION_REQUIRED" && (
              <div className="transfer-action transfer-action--otp transfer-action--otp-premium">
                <div className="transfer-action__copy">
                  <div className="otp-heading">
                    <div className="otp-heading__icon">
                      <motion.span
                        animate={{
                          scale: [
                            1,
                            1.45,
                            1,
                          ],
                          opacity: [
                            0.7,
                            0,
                            0.7,
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat:
                            Infinity,
                        }}
                      />

                      <LockKeyhole
                        size={20}
                      />
                    </div>

                    <div>
                      <span>
                        TRANSACTION SECURITY
                      </span>

                      <strong>
                        OTP Verification Required
                      </strong>
                    </div>
                  </div>

                  <p>
                    {transaction.decisionReason ||
                      "Please verify this transfer with OTP to continue."}
                  </p>

                  <div className="otp-meta">
                    <div>
                      <span>
                        TRANSFER AMOUNT
                      </span>

                      <strong>
                        ₹
                        {Number(
                          transaction.amount ||
                            0
                        ).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        OTP LIMIT
                      </span>

                      <strong>
                        ₹5,000
                      </strong>
                    </div>
                  </div>

                  <div className="otp-ready">
                    <CheckCircle2
                      size={14}
                    />
                    Secure verification
                    channel ready
                  </div>

                  <Button
                    size="lg"
                    onClick={() => {
                      const transactionId =
                        transaction.id ||
                        transaction._id;

                      navigate(
                        `/app/transfer/${transactionId}/verify`
                      );
                    }}
                    data-testid="go-verify-otp"
                  >
                    Verify with OTP
                    <ArrowRight
                      size={17}
                    />
                  </Button>
                </div>

                <div className="otp-phone-stage">
                  <motion.div
                    className="otp-orbit otp-orbit--one"
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 8,
                      repeat:
                        Infinity,
                      ease: "linear",
                    }}
                  />

                  <motion.div
                    className="otp-orbit otp-orbit--two"
                    animate={{
                      rotate: -360,
                    }}
                    transition={{
                      duration: 6,
                      repeat:
                        Infinity,
                      ease: "linear",
                    }}
                  />

                  <motion.div
                    className="otp-phone-glow"
                    animate={{
                      scale: [
                        1,
                        1.12,
                        1,
                      ],
                      opacity: [
                        0.3,
                        0.65,
                        0.3,
                      ],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat:
                        Infinity,
                    }}
                  />

                  <motion.div
                    className="otp-phone"
                    animate={{
                      y: [
                        0,
                        -6,
                        0,
                      ],
                      rotate: [
                        0,
                        1.5,
                        0,
                        -1.5,
                        0,
                      ],
                    }}
                    transition={{
                      duration: 4,
                      repeat:
                        Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="otp-phone__speaker" />

                    <div className="otp-phone__screen">
                      <div className="otp-phone__status">
                        <span>
                          9:41
                        </span>

                        <span>
                          ● ●
                        </span>
                      </div>

                      <motion.div
                        className="otp-phone__shield"
                        animate={{
                          boxShadow: [
                            "0 0 10px rgba(255,190,62,.08)",
                            "0 0 26px rgba(255,190,62,.35)",
                            "0 0 10px rgba(255,190,62,.08)",
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat:
                            Infinity,
                        }}
                      >
                        <ShieldCheck
                          size={21}
                        />
                      </motion.div>

                      <span className="otp-phone__label">
                        SECURE OTP
                      </span>

                      <div className="otp-digits">
                        {[
                          "4",
                          "7",
                          "2",
                          "9",
                        ].map(
                          (
                            digit,
                            index
                          ) => (
                            <motion.span
                              key={`${digit}-${index}`}
                              initial={{
                                opacity: 0,
                                y: 7,
                              }}
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              transition={{
                                delay:
                                  0.35 +
                                  index *
                                    0.12,
                              }}
                            >
                              {digit}
                            </motion.span>
                          )
                        )}
                      </div>

                      <div className="otp-phone__scan">
                        <motion.div
                          animate={{
                            width: [
                              "15%",
                              "88%",
                              "15%",
                            ],
                          }}
                          transition={{
                            duration: 2.4,
                            repeat:
                              Infinity,
                          }}
                        />
                      </div>

                      <span className="otp-phone__secure">
                        ● Secure verification
                      </span>
                    </div>

                    <motion.div
                      className="otp-phone__home"
                      animate={{
                        opacity: [
                          0.45,
                          1,
                          0.45,
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat:
                          Infinity,
                      }}
                    />
                  </motion.div>

                  <motion.div
                    className="otp-lock"
                    animate={{
                      y: [
                        0,
                        -5,
                        0,
                      ],
                      rotate: [
                        -4,
                        4,
                        -4,
                      ],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat:
                        Infinity,
                    }}
                  >
                    <LockKeyhole
                      size={18}
                    />
                  </motion.div>

                  <span className="otp-particle otp-particle--one" />
                  <span className="otp-particle otp-particle--two" />
                  <span className="otp-particle otp-particle--three" />
                </div>
              </div>
            )}

            {transaction.fraudDecision ===
              "COMPLETED" && (
              <div className="transfer-action transfer-action--success">
                <CheckCircle2
                  size={21}
                />

                <div>
                  <strong>
                    Transfer completed successfully
                  </strong>

                  <span>
                    Balance updated
                    {transaction.isInternal
                      ? " · internal ledger settled."
                      : "."}
                  </span>
                </div>
              </div>
            )}

            {transaction.fraudDecision ===
              "BLOCKED" && (
              <div className="transfer-action transfer-action--blocked">
                <XCircle
                  size={21}
                />

                <div>
                  <strong>
                    Transfer blocked
                  </strong>

                  <span>
                    The fraud engine detected
                    suspicious activity and
                    prevented the transaction.
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
    </div>
  );
}

/* ============================================================
   ANIMATED NUMBER
============================================================ */

function AnimatedNumber({ value }) {
  const [display, setDisplay] =
    useState(0);

  useEffect(() => {
    const target =
      Number(value) || 0;

    const duration = 900;

    const startedAt =
      performance.now();

    let frameId;

    const tick = (now) => {
      const progress =
        Math.min(
          1,
          (now - startedAt) /
            duration
        );

      const eased =
        1 -
        Math.pow(
          1 - progress,
          3
        );

      setDisplay(
        Math.round(
          target * eased
        )
      );

      if (progress < 1) {
        frameId =
          requestAnimationFrame(
            tick
          );
      }
    };

    frameId =
      requestAnimationFrame(
        tick
      );

    return () =>
      cancelAnimationFrame(
        frameId
      );
  }, [value]);

  return (
    <motion.span
      className="fraud-gauge__number"
      initial={{
        opacity: 0,
        scale: 0.75,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        delay: 0.15,
        duration: 0.35,
      }}
    >
      {display}
    </motion.span>
  );
}

/* ============================================================
   FRAUD STAT
============================================================ */

function FraudStat({
  label,
  value,
  icon: Icon,
  tone = "green",
  level = "Low",
}) {
  const percentage = Math.max(
    0,
    Math.min(
      100,
      Number(value) || 0
    )
  );

  return (
    <motion.div
      className={`fraud-stat fraud-stat--${tone}`}
      whileHover={{
        y: -2,
      }}
    >
      <div className="fraud-stat__icon">
        <Icon size={15} />
      </div>

      <div className="fraud-stat__body">
        <div className="fraud-stat__title">
          <span>
            {label}
          </span>

          <strong>
            {value}
            <em>
              /100
            </em>
          </strong>
        </div>

        <div className="fraud-stat__track">
          <motion.div
            initial={{
              width: 0,
            }}
            animate={{
              width: `${percentage}%`,
            }}
            transition={{
              duration: 0.8,
              delay: 0.25,
            }}
          />
        </div>
      </div>

      <span className="fraud-stat__level">
        {level}
      </span>
    </motion.div>
  );
}

/* ============================================================
   SIGNAL PANEL
============================================================ */

function SignalPanel({
  title,
  count,
  icon: Icon,
  rules,
  type,
  emptyMessage,
}) {
  const [showAll, setShowAll] = useState(false);

  const isBehaviour = type === "behaviour";

  const openAllSignals = () => {
    setShowAll(true);
  };

  const closeAllSignals = () => {
    setShowAll(false);
  };

  return (
    <>
      <div
        className={`signal-panel signal-panel--${type}`}
      >
        <div className="signal-panel__heading">
          <div className="signal-panel__title">
            <Icon size={17} />

            <strong>
              {title}
            </strong>

            <span>
              {count}
            </span>
          </div>
        </div>

        {!rules.length ? (
          <div className="signal-panel__empty">
            <CheckCircle2
              size={17}
            />

            <span>
              {emptyMessage}
            </span>
          </div>
        ) : (
          <div className="signal-panel__list">
            {rules.map(
              (
                rule,
                index
              ) => {
                const contribution =
                  isBehaviour
                    ? formatBehaviourContribution(
                        rule
                      )
                    : rule.contribution;

                return (
                  <motion.div
                    className="signal-row"
                    key={
                      rule.code ||
                      index
                    }
                    initial={{
                      opacity: 0,
                      x: -10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        index *
                        0.07,
                    }}
                  >
                    <div className="signal-row__icon">
                      {isBehaviour ? (
                        <Activity
                          size={15}
                        />
                      ) : (
                        <ShieldCheck
                          size={15}
                        />
                      )}
                    </div>

                    <div className="signal-row__body">
                      <strong>
                        {rule.label ||
                          rule.code ||
                          "Unnamed signal"}
                      </strong>

                      {rule.evidence && (
                        <span>
                          {rule.evidence}
                        </span>
                      )}
                    </div>

                    {contribution !==
                      undefined &&
                      contribution !==
                        "" && (
                        <b>
                          {isBehaviour
                            ? contribution
                            : `+${contribution}`}
                        </b>
                      )}
                  </motion.div>
                );
              }
            )}
          </div>
        )}

        <div
          className="signal-panel__wave"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 360 72"
            preserveAspectRatio="none"
          >
            <path
              className="signal-panel__wave-line signal-panel__wave-line--one"
              d="M0 51 C42 48 61 29 95 39 S139 64 176 43 S221 18 257 37 S303 61 360 43"
            />

            <path
              className="signal-panel__wave-line signal-panel__wave-line--two"
              d="M0 57 C45 53 69 41 104 46 S145 59 181 50 S226 32 266 46 S311 57 360 49"
            />

            <path
              className="signal-panel__wave-line signal-panel__wave-line--three"
              d="M0 64 C44 59 76 53 111 56 S154 65 192 57 S232 46 270 55 S318 65 360 56"
            />

            <circle cx="95" cy="39" r="1.8" />
            <circle cx="176" cy="43" r="1.8" />
            <circle cx="257" cy="37" r="1.8" />
            <circle cx="266" cy="46" r="1.4" />
          </svg>
        </div>

        <button
          type="button"
          className="signal-panel__footer"
          onClick={openAllSignals}
          aria-label={
            isBehaviour
              ? "View all behavioural signals"
              : "View all triggered rules"
          }
        >
          <span className="signal-panel__footer-left">
            <Eye size={15} />

            <span>
              {isBehaviour
                ? "View all behavioural signals"
                : "View all triggered rules"}
            </span>
          </span>

          <ChevronRight size={16} />
        </button>
      </div>

      <AnimatePresence>
        {showAll && (
          <motion.div
            className="signal-modal-backdrop"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={closeAllSignals}
          >
            <motion.div
              className={`signal-modal signal-modal--${type}`}
              initial={{
                opacity: 0,
                y: 18,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.98,
              }}
              transition={{
                duration: 0.22,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              <div className="signal-modal__header">
                <div className="signal-modal__title">
                  <div className="signal-modal__icon">
                    {isBehaviour ? (
                      <Activity
                        size={20}
                      />
                    ) : (
                      <ShieldAlert
                        size={20}
                      />
                    )}
                  </div>

                  <div>
                    <span>
                      FRAUD ENGINE
                    </span>

                    <h3>
                      {title}
                    </h3>

                    <p>
                      {isBehaviour
                        ? "All behavioural signals detected for this transaction."
                        : "All fraud rules triggered for this transaction."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="signal-modal__close"
                  onClick={closeAllSignals}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="signal-modal__summary">
                <span>
                  TOTAL DETECTED
                </span>

                <strong>
                  {rules.length}
                </strong>
              </div>

              <div className="signal-modal__list">
                {rules.length === 0 ? (
                  <div className="signal-modal__empty">
                    <CheckCircle2
                      size={20}
                    />

                    <span>
                      {emptyMessage}
                    </span>
                  </div>
                ) : (
                  rules.map(
                    (
                      rule,
                      index
                    ) => {
                      const contribution =
                        isBehaviour
                          ? formatBehaviourContribution(
                              rule
                            )
                          : rule.contribution;

                      return (
                        <motion.div
                          className="signal-modal__item"
                          key={
                            rule.code ||
                            `signal-${index}`
                          }
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.04,
                          }}
                        >
                          <div className="signal-modal__item-icon">
                            {isBehaviour ? (
                              <Activity
                                size={17}
                              />
                            ) : (
                              <ShieldCheck
                                size={17}
                              />
                            )}
                          </div>

                          <div className="signal-modal__item-content">
                            <strong>
                              {rule.label ||
                                rule.code ||
                                "Unnamed signal"}
                            </strong>

                            {rule.evidence && (
                              <span>
                                {rule.evidence}
                              </span>
                            )}

                            {rule.code && (
                              <small>
                                {rule.code}
                              </small>
                            )}
                          </div>

                          {contribution !==
                            undefined &&
                            contribution !==
                              "" && (
                              <b>
                                {isBehaviour
                                  ? contribution
                                  : `+${contribution}`}
                              </b>
                            )}
                        </motion.div>
                      );
                    }
                  )
                )}
              </div>

              <div className="signal-modal__footer">
                <span>
                  {rules.length === 1
                    ? "1 signal detected"
                    : `${rules.length} signals detected`}
                </span>

                <button
                  type="button"
                  onClick={closeAllSignals}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================================================
   BEHAVIOURAL CONTRIBUTION
============================================================ */

function formatBehaviourContribution(
  signal
) {
  if (
    signal?.value ==
    null
  ) {
    return "";
  }

  if (
    signal.unit ===
    "percent"
  ) {
    return `+${signal.value}%`;
  }

  if (
    signal.unit ===
    "transactions"
  ) {
    return `+${signal.value}`;
  }

  if (
    signal.unit ===
    "hour"
  ) {
    return `+${signal.value}`;
  }

  return `+${signal.value}`;
}