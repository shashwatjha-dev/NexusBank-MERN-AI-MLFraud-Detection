import React, { useState } from "react";

import {
  Gift,
  TrendingUp,
  Sparkles,
  Trophy,
  Zap,
  ArrowUpRight,
  WalletCards,
  CheckCircle2,
  Loader2,
  Coins,
  CircleDollarSign,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import { rewardService } from "../../services/rewardService.js";
import { useApi } from "../../hooks/useApi.js";
import { Card, CardHeader } from "../../components/common/Card.jsx";
import { Skeleton } from "../../components/common/Skeleton.jsx";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ErrorState } from "../../components/common/ErrorState.jsx";
import { formatDateTime } from "../../utils/date.js";

import "./RewardsPage.css";

const POINT_VALUE_PAISE = 100;

const getTier = (points) => {
  if (points >= 1000) {
    return {
      name: "Platinum",
      next: null,
      min: 1000,
      icon: "💎",
    };
  }

  if (points >= 500) {
    return {
      name: "Gold",
      next: 1000,
      min: 500,
      icon: "🏆",
    };
  }

  if (points >= 250) {
    return {
      name: "Silver",
      next: 500,
      min: 250,
      icon: "🥈",
    };
  }

  return {
    name: "Starter",
    next: 250,
    min: 0,
    icon: "🌱",
  };
};

const formatRupees = (paise) =>
  `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function RewardsPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useApi(
    () => rewardService.list(),
    []
  );

  const [
    redeeming,
    setRedeeming,
  ] = useState(false);

  const [
    redeemMessage,
    setRedeemMessage,
  ] = useState("");

  const [
    redeemError,
    setRedeemError,
  ] = useState("");

  if (error) {
    return (
      <ErrorState
        description={error.message}
        onRetry={refetch}
      />
    );
  }

  const balance =
    data?.balance ?? 0;

  const entries =
    data?.entries || [];

  const earned =
    entries
      .filter(
        (entry) =>
          entry.type !==
          "REDEEMED"
      )
      .reduce(
        (sum, entry) =>
          sum +
          Math.max(
            entry.points || 0,
            0
          ),
        0
      );

  const redeemed =
    entries
      .filter(
        (entry) =>
          entry.type ===
          "REDEEMED"
      )
      .reduce(
        (sum, entry) =>
          sum +
          Math.abs(
            entry.points || 0
          ),
        0
      );

  const tier =
    getTier(balance);

  const progress =
    tier.next
      ? Math.min(
          100,
          Math.max(
            0,
            ((balance -
              tier.min) /
              (tier.next -
                tier.min)) *
              100
          )
        )
      : 100;

  const remaining =
    tier.next
      ? Math.max(
          0,
          tier.next -
            balance
        )
      : 0;

  const redeemAmountPaise =
    balance *
    POINT_VALUE_PAISE;

  const handleRedeem =
    async () => {
      if (
        redeeming ||
        balance <= 0
      ) {
        return;
      }

      setRedeeming(true);
      setRedeemError("");
      setRedeemMessage("");

      try {
        const result =
          await rewardService.redeem(
            balance
          );

        setRedeemMessage(
          result?.message ||
            `Successfully redeemed ${balance} points and credited ${formatRupees(
              redeemAmountPaise
            )} to your account.`
        );

        await refetch();
      } catch (err) {
        setRedeemError(
          err?.message ||
            "Unable to redeem your points right now."
        );
      } finally {
        setRedeeming(false);
      }
    };

  return (
    <div
      className="rewards-page"
      data-testid="rewards-page"
    >
      {/* HERO */}
      <header className="rewards-hero">
        <div>
          <span className="eyebrow">
            NexusBank Loyalty
          </span>

          <h1>Rewards</h1>

          <p className="muted">
            Earn points through trusted banking
            activity and unlock better rewards.
          </p>
        </div>

        <motion.div
          className="rewards-hero-badge"
          initial={{
            opacity: 0,
            scale: 0.7,
            rotate: -8,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          transition={{
            duration: 0.6,
          }}
        >
          <Sparkles size={17} />
          <span>
            {tier.name} Member
          </span>
        </motion.div>
      </header>

      {/* MAIN REWARD CARD */}
      <motion.section
        className="rewards-main-card"
        initial={{
          opacity: 0,
          y: 24,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
        }}
      >
        <div className="rewards-card-glow" />

        <div className="rewards-main-content">
          <div className="rewards-balance-area">
            <span className="rewards-label">
              AVAILABLE REWARD POINTS
            </span>

            <div className="rewards-points">
              {loading
                ? "—"
                : balance}

              <span>
                pts
              </span>
            </div>

            <div className="rewards-tier">
              <span className="rewards-tier-icon">
                {tier.icon}
              </span>

              <div>
                <strong>
                  {tier.name} Tier
                </strong>

                <span>
                  {tier.next
                    ? `${remaining} points to ${
                        tier.name ===
                        "Starter"
                          ? "Silver"
                          : tier.name ===
                            "Silver"
                          ? "Gold"
                          : "Platinum"
                      }`
                    : "You've reached the highest tier"}
                </span>
              </div>
            </div>
          </div>

          <motion.div
            className="rewards-orb"
            animate={{
              y: [0, -8, 0],
              rotate: [
                0,
                3,
                -3,
                0,
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="rewards-orb-ring" />
            <Gift size={42} />
          </motion.div>
        </div>

        {/* TIER PROGRESS */}
        <div className="rewards-progress-section">
          <div className="rewards-progress-head">
            <span>
              Tier progress
            </span>

            <strong>
              {tier.next
                ? `${Math.round(
                    progress
                  )}%`
                : "MAX"}
            </strong>
          </div>

          <div className="rewards-progress-track">
            <motion.div
              className="rewards-progress-fill"
              initial={{
                width: 0,
              }}
              animate={{
                width: `${progress}%`,
              }}
              transition={{
                duration: 1.1,
                delay: 0.25,
                ease: "easeOut",
              }}
            />
          </div>

          <div className="rewards-progress-labels">
            <span>
              {tier.min} pts
            </span>

            <span>
              {tier.next
                ? `${tier.next} pts`
                : "Platinum"}
            </span>
          </div>
        </div>
      </motion.section>

      {/* REDEEM SECTION */}
      <motion.section
        className="rewards-redeem-card"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.1,
          duration: 0.5,
        }}
      >
        <div className="redeem-visual">
          <motion.div
            className="redeem-icon-orbit"
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
            className="redeem-icon-core"
            animate={{
              scale: [
                1,
                1.06,
                1,
              ],
              boxShadow: [
                "0 0 0 rgba(139,92,246,0)",
                "0 0 28px rgba(139,92,246,.3)",
                "0 0 0 rgba(139,92,246,0)",
              ],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
            }}
          >
            <CircleDollarSign
              size={27}
            />
          </motion.div>
        </div>

        <div className="redeem-copy">
          <span className="eyebrow">
            Redeem rewards
          </span>

          <h2>
            Turn your points into cash
          </h2>

          <p>
            Redeem your available points instantly.
            Every 1 point is worth ₹1 and the money
            is credited to your primary active account.
          </p>

          <div className="redeem-rate">
            <Coins size={14} />
            <span>
              1 point
            </span>

            <ArrowUpRight
              size={13}
            />

            <strong>
              ₹1.00
            </strong>
          </div>
        </div>

        <div className="redeem-action">
          <div className="redeem-value">
            <span>
              You'll receive
            </span>

            <strong>
              {loading
                ? "—"
                : formatRupees(
                    redeemAmountPaise
                  )}
            </strong>

            <small>
              {balance} points available
            </small>
          </div>

          <motion.button
            type="button"
            className="redeem-button"
            onClick={
              handleRedeem
            }
            disabled={
              loading ||
              redeeming ||
              balance <= 0
            }
            whileHover={
              !loading &&
              !redeeming &&
              balance > 0
                ? {
                    y: -2,
                    scale: 1.01,
                  }
                : undefined
            }
            whileTap={
              !loading &&
              !redeeming &&
              balance > 0
                ? {
                    scale: 0.98,
                  }
                : undefined
            }
          >
            {redeeming ? (
              <>
                <Loader2
                  size={15}
                  className="redeem-spinner"
                />
                Redeeming...
              </>
            ) : (
              <>
                <WalletCards
                  size={15}
                />
                Redeem{" "}
                {balance} points
              </>
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {redeemMessage ? (
            <motion.div
              className="redeem-feedback redeem-feedback--success"
              initial={{
                opacity: 0,
                height: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                y: 0,
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
            >
              <CheckCircle2
                size={16}
              />

              <span>
                {redeemMessage}
              </span>
            </motion.div>
          ) : null}

          {redeemError ? (
            <motion.div
              className="redeem-feedback redeem-feedback--error"
              initial={{
                opacity: 0,
                height: 0,
                y: -5,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                y: 0,
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
            >
              <Zap size={16} />

              <span>
                {redeemError}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>

      {/* STAT CARDS */}
      <section className="rewards-stats">
        <motion.div
          className="reward-stat-card"
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
          }}
        >
          <div className="reward-stat-icon reward-stat-icon--green">
            <TrendingUp
              size={20}
            />
          </div>

          <div>
            <span>
              Total earned
            </span>

            <strong>
              +{earned}
            </strong>

            <small>
              points earned
            </small>
          </div>
        </motion.div>

        <motion.div
          className="reward-stat-card"
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.18,
          }}
        >
          <div className="reward-stat-icon reward-stat-icon--purple">
            <Zap size={20} />
          </div>

          <div>
            <span>
              Available now
            </span>

            <strong>
              {balance}
            </strong>

            <small>
              ready to redeem
            </small>
          </div>
        </motion.div>

        <motion.div
          className="reward-stat-card"
          initial={{
            opacity: 0,
            y: 18,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.26,
          }}
        >
          <div className="reward-stat-icon reward-stat-icon--orange">
            <ArrowUpRight
              size={20}
            />
          </div>

          <div>
            <span>
              Redeemed
            </span>

            <strong>
              {redeemed}
            </strong>

            <small>
              points used
            </small>
          </div>
        </motion.div>
      </section>

      {/* CONTENT GRID */}
      <section className="rewards-content-grid">
        <Card className="rewards-activity-card">
          <CardHeader
            eyebrow="Activity"
            title="Recent points"
          />

          {loading ? (
            <div className="stack stack-3">
              {Array.from({
                length: 4,
              }).map(
                (_, i) => (
                  <Skeleton
                    key={i}
                    height={58}
                    radius={12}
                  />
                )
              )}
            </div>
          ) : entries.length ===
            0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No activity"
              description="Points appear here as you use the app."
            />
          ) : (
            <div
              className="rewards-activity-list"
              data-testid="rewards-list"
            >
              {entries.map(
                (
                  entry,
                  index
                ) => {
                  const isRedeemed =
                    entry.type ===
                    "REDEEMED";

                  return (
                    <motion.div
                      key={
                        entry._id
                      }
                      className="reward-activity-item"
                      initial={{
                        opacity: 0,
                        x: -15,
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
                      <div
                        className={`reward-activity-icon ${
                          isRedeemed
                            ? "is-redeemed"
                            : "is-earned"
                        }`}
                      >
                        {isRedeemed ? (
                          <ArrowUpRight
                            size={
                              17
                            }
                          />
                        ) : (
                          <Gift
                            size={
                              17
                            }
                          />
                        )}
                      </div>

                      <div className="reward-activity-info">
                        <strong>
                          {
                            entry.reason
                          }
                        </strong>

                        <span>
                          {
                            entry.type
                          }{" "}
                          ·{" "}
                          {formatDateTime(
                            entry.createdAt
                          )}
                        </span>
                      </div>

                      <strong
                        className={`reward-points-change ${
                          isRedeemed
                            ? "is-negative"
                            : "is-positive"
                        }`}
                      >
                        {isRedeemed
                          ? "−"
                          : "+"}

                        {Math.abs(
                          entry.points
                        )}
                      </strong>
                    </motion.div>
                  );
                }
              )}
            </div>
          )}
        </Card>

        <Card className="reward-benefits-card">
          <div className="reward-benefits-header">
            <span className="eyebrow">
              Member benefits
            </span>

            <Trophy size={20} />
          </div>

          <h3>
            Your{" "}
            {tier.name}{" "}
            rewards
          </h3>

          <p className="muted">
            Keep using NexusBank responsibly to
            unlock more benefits.
          </p>

          <div className="reward-benefit-list">
            <div>
              <span>✓</span>
              Trusted transfer points
            </div>

            <div>
              <span>✓</span>
              Monthly loyalty bonuses
            </div>

            <div>
              <span>✓</span>
              Faster reward milestones
            </div>

            <div>
              <span>✓</span>
              Exclusive banking rewards
            </div>
          </div>

          <div className="reward-next-box">
            <Sparkles size={18} />

            <div>
              <strong>
                {tier.next
                  ? `${remaining} points to go`
                  : "Maximum tier unlocked"}
              </strong>

              <span>
                {tier.next
                  ? "Keep your banking activity active."
                  : "You've unlocked the top rewards tier."}
              </span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}