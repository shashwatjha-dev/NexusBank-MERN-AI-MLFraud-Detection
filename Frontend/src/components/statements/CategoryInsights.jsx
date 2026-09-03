import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import {
  aggregateByCategory,
  aggregateMonthlyTrend,
} from "../../services/statementsService";


/* ============================================================
   Helpers
   ============================================================ */

function formatINR(paise = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

function formatCompactINR(paise = 0) {
  const value = Math.abs(paise || 0) / 100;

  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  }

  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }

  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}k`;
  }

  return `₹${Math.round(value)}`;
}

function getCategoryIcon(category) {
  const icons = {
    Shopping: "🛍️",
    Food: "🍔",
    Bills: "🧾",
    Transfers: "↔",
    Salary: "💼",
    Rewards: "🎁",
    Investments: "📈",
    Other: "•••",
  };

  return icons[category] || "•••";
}

function getMonthCount(entries) {
  const months = new Set();

  for (const entry of entries || []) {
    if (!entry?.createdAt) continue;

    const date = new Date(entry.createdAt);

    if (Number.isNaN(date.getTime())) continue;

    months.add(
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`
    );
  }

  return Math.max(months.size, 1);
}


/* ============================================================
   Donut Tooltip
   ============================================================ */

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  if (!item) return null;

  return (
    <div className="stmt-tt">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 5,
        }}
      >
        <span
          className="stmt-tt__dot"
          style={{ background: item.color }}
        />

        <p style={{ margin: 0 }}>{item.name}</p>
      </div>

      <strong>{formatINR(item.value)}</strong>

      <span>{item.pct.toFixed(1)}% of total spending</span>
    </div>
  );
}


/* ============================================================
   Monthly Chart Tooltip
   ============================================================ */

function LineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;

  if (!row) return null;

  return (
    <div className="stmt-tt" style={{ minWidth: 175 }}>
      <p>{row.label}</p>

      <strong style={{ color: "#22D66F" }}>
        Credits&nbsp;&nbsp;{formatINR(row.credit)}
      </strong>

      <strong style={{ color: "#FF5A6E" }}>
        Debits&nbsp;&nbsp;{formatINR(row.debit)}
      </strong>

      <span
        style={{
          color:
            row.net >= 0
              ? "#22D66F"
              : "#FF5A6E",
        }}
      >
        Net&nbsp;&nbsp;{formatINR(row.net)}
      </span>
    </div>
  );
}


/* ============================================================
   Category Insights
   ============================================================ */

export default function CategoryInsights({
  entries = [],
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAllCategories, setShowAllCategories] =
    useState(false);

  /* ----------------------------------------------------------
     Aggregated data
     ---------------------------------------------------------- */

  const byCat = useMemo(
    () => aggregateByCategory(entries),
    [entries]
  );

  const monthly = useMemo(
    () => aggregateMonthlyTrend(entries),
    [entries]
  );


  /* ----------------------------------------------------------
     Financial calculations
     ---------------------------------------------------------- */

  const totalSpend = useMemo(
    () =>
      byCat.reduce(
        (sum, item) => sum + (item.value || 0),
        0
      ),
    [byCat]
  );

  const totalCredits = useMemo(
    () =>
      entries.reduce(
        (sum, entry) =>
          entry.direction === "CREDIT"
            ? sum + (entry.amountPaise || 0)
            : sum,
        0
      ),
    [entries]
  );

  const totalDebits = useMemo(
    () =>
      entries.reduce(
        (sum, entry) =>
          entry.direction === "DEBIT"
            ? sum + (entry.amountPaise || 0)
            : sum,
        0
      ),
    [entries]
  );

  const netFlow = totalCredits - totalDebits;

  const monthCount = useMemo(
    () => getMonthCount(entries),
    [entries]
  );

  const averageMonthlySpend =
    monthCount > 0
      ? Math.round(totalDebits / monthCount)
      : 0;

  const topCategory = byCat[0] || null;

  const maxCategoryValue =
    byCat.length > 0
      ? Math.max(...byCat.map((item) => item.value || 0))
      : 0;


  /* ----------------------------------------------------------
     Visible categories
     ---------------------------------------------------------- */

  const visibleCategories = showAllCategories
    ? byCat
    : byCat.slice(0, 5);

  const hasMoreCategories = byCat.length > 5;

  const empty = entries.length === 0 || byCat.length === 0;


  /* ==========================================================
     Render
     ========================================================== */

  return (
    <motion.section
      className="stmt-card stmt-insights"
      initial={{
        opacity: 0,
        y: 14,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.38,
        ease: "easeOut",
      }}
      data-testid="statement-insights"
    >

      {/* ======================================================
          HEADER
         ====================================================== */}

      <div className="stmt-insights__head">

        <div>
          <div className="stmt-section-kicker">
            <span className="stmt-live-dot" />
            Spending analytics
          </div>

          <h2 style={{ marginTop: 6 }}>
            Category insights
          </h2>

          <p>
            Understand where your money is going and
            track your cash flow over time.
          </p>
        </div>


        {!empty && (
          <motion.div
            className="stmt-insights__total"
            whileHover={{
              y: -2,
            }}
          >
            <span>Total spend</span>

            <strong>
              {formatINR(totalSpend)}
            </strong>

            <small
              style={{
                display: "block",
                marginTop: 3,
                color: "var(--nx-muted-2)",
                fontSize: 8.5,
              }}
            >
              Across {entries.length} transactions
            </small>
          </motion.div>
        )}
      </div>


      {/* ======================================================
          EMPTY STATE
         ====================================================== */}

      {empty ? (
        <div
          className="stmt-empty stmt-empty--sm"
          data-testid="stmt-insights-empty"
        >
          <div className="stmt-empty__glow" />

          <div className="stmt-empty__icon">
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M4 19V5" />
              <path d="M4 19h16" />
              <path d="M7 15l3-4 3 2 5-7" />
            </svg>
          </div>

          <h3>
            No spending insights yet
          </h3>

          <p>
            Once debit transactions appear in your
            statement, NexusBank will automatically
            generate category and monthly spending
            insights here.
          </p>
        </div>
      ) : (
        <>
          {/* ==================================================
              KPI STRIP
             ================================================== */}

          <div
            className="stmt-insights-kpis"
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: 9,
              marginBottom: 13,
            }}
          >

            {/* Top category */}

            <motion.div
              className="stmt-insights-kpi"
              whileHover={{
                y: -2,
              }}
              style={{
                padding: "11px 12px",
                border:
                  "1px solid var(--nx-border)",
                borderRadius: 13,
                background:
                  "rgba(255,255,255,.018)",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "var(--nx-muted)",
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Top category
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color:
                    topCategory?.color ||
                    "var(--nx-text)",
                  fontSize: 12,
                }}
              >
                {topCategory
                  ? `${getCategoryIcon(
                      topCategory.name
                    )} ${topCategory.name}`
                  : "—"}
              </strong>

              {topCategory && (
                <small
                  style={{
                    display: "block",
                    marginTop: 2,
                    color: "var(--nx-muted-2)",
                    fontSize: 8.5,
                  }}
                >
                  {topCategory.pct.toFixed(1)}%
                  of spending
                </small>
              )}
            </motion.div>


            {/* Average */}

            <motion.div
              className="stmt-insights-kpi"
              whileHover={{
                y: -2,
              }}
              style={{
                padding: "11px 12px",
                border:
                  "1px solid var(--nx-border)",
                borderRadius: 13,
                background:
                  "rgba(255,255,255,.018)",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "var(--nx-muted)",
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Avg / month
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color: "var(--nx-text)",
                  fontSize: 13,
                }}
              >
                {formatCompactINR(
                  averageMonthlySpend
                )}
              </strong>

              <small
                style={{
                  display: "block",
                  marginTop: 2,
                  color: "var(--nx-muted-2)",
                  fontSize: 8.5,
                }}
              >
                Based on {monthCount}{" "}
                {monthCount === 1
                  ? "month"
                  : "months"}
              </small>
            </motion.div>


            {/* Credits */}

            <motion.div
              className="stmt-insights-kpi"
              whileHover={{
                y: -2,
              }}
              style={{
                padding: "11px 12px",
                border:
                  "1px solid rgba(34,214,111,.12)",
                borderRadius: 13,
                background:
                  "rgba(34,214,111,.025)",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "var(--nx-muted)",
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Total credits
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color: "var(--nx-accent)",
                  fontSize: 13,
                }}
              >
                {formatCompactINR(
                  totalCredits
                )}
              </strong>

              <small
                style={{
                  display: "block",
                  marginTop: 2,
                  color: "var(--nx-muted-2)",
                  fontSize: 8.5,
                }}
              >
                Money received
              </small>
            </motion.div>


            {/* Net */}

            <motion.div
              className="stmt-insights-kpi"
              whileHover={{
                y: -2,
              }}
              style={{
                padding: "11px 12px",
                border:
                  "1px solid var(--nx-border)",
                borderRadius: 13,
                background:
                  "rgba(255,255,255,.018)",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "var(--nx-muted)",
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Net cash flow
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  color:
                    netFlow >= 0
                      ? "var(--nx-accent)"
                      : "var(--nx-danger)",
                  fontSize: 13,
                }}
              >
                {netFlow >= 0 ? "+" : ""}
                {formatCompactINR(netFlow)}
              </strong>

              <small
                style={{
                  display: "block",
                  marginTop: 2,
                  color: "var(--nx-muted-2)",
                  fontSize: 8.5,
                }}
              >
                Credits minus debits
              </small>
            </motion.div>
          </div>


          {/* ==================================================
              MAIN ANALYTICS GRID
             ================================================== */}

          <div className="stmt-insights__grid">

            {/* =================================================
                CATEGORY PANEL
               ================================================= */}

            <div className="stmt-insights__panel">

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                <div>
                  <h3
                    className="stmt-insights__subtitle"
                    style={{
                      marginBottom: 2,
                    }}
                  >
                    Spending breakdown
                  </h3>

                  <span
                    style={{
                      color: "var(--nx-muted-2)",
                      fontSize: 9,
                    }}
                  >
                    By category
                  </span>
                </div>

                <span
                  style={{
                    padding: "4px 7px",
                    border:
                      "1px solid var(--nx-border)",
                    borderRadius: 999,
                    color: "var(--nx-muted)",
                    fontSize: 8,
                    fontWeight: 750,
                  }}
                >
                  {byCat.length} categories
                </span>
              </div>


              {/* Donut */}

              <div
                className="stmt-insights__chart-wrap"
                style={{
                  height: 225,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>

                    <Pie
                      data={byCat}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={850}
                      onMouseEnter={(_, index) =>
                        setActiveCategory(
                          byCat[index]?.name ||
                            null
                        )
                      }
                      onMouseLeave={() =>
                        setActiveCategory(null)
                      }
                    >
                      {byCat.map((item) => (
                        <Cell
                          key={item.name}
                          fill={item.color}
                          opacity={
                            activeCategory &&
                            activeCategory !==
                              item.name
                              ? 0.28
                              : 1
                          }
                          style={{
                            cursor: "pointer",
                            transition:
                              "opacity .2s ease",
                          }}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      content={<DonutTooltip />}
                    />
                  </PieChart>
                </ResponsiveContainer>


                {/* Center text */}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,

                    display: "flex",
                    flexDirection: "column",

                    alignItems: "center",
                    justifyContent: "center",

                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      color: "var(--nx-muted)",
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: ".08em",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Total spend
                  </span>

                  <strong
                    style={{
                      marginTop: 4,
                      color: "var(--nx-text)",
                      fontSize: 16,
                      fontWeight: 850,
                      letterSpacing: "-.03em",
                    }}
                  >
                    {formatCompactINR(
                      totalSpend
                    )}
                  </strong>
                </div>
              </div>


              {/* Category rows */}

              <div
                style={{
                  display: "grid",
                  gap: 7,
                  marginTop: 3,
                }}
              >
                <AnimatePresence initial={false}>
                  {visibleCategories.map(
                    (item, index) => {
                      const highlighted =
                        activeCategory ===
                        item.name;

                      return (
                        <motion.button
                          key={item.name}
                          type="button"
                          initial={{
                            opacity: 0,
                            y: 5,
                          }}
                          animate={{
                            opacity:
                              activeCategory &&
                              !highlighted
                                ? 0.48
                                : 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: -5,
                          }}
                          transition={{
                            duration: 0.2,
                            delay:
                              index * 0.025,
                          }}
                          onMouseEnter={() =>
                            setActiveCategory(
                              item.name
                            )
                          }
                          onMouseLeave={() =>
                            setActiveCategory(null)
                          }
                          onClick={() =>
                            setActiveCategory(
                              highlighted
                                ? null
                                : item.name
                            )
                          }
                          style={{
                            width: "100%",
                            padding:
                              "8px 9px",
                            display: "block",
                            border:
                              "1px solid " +
                              (highlighted
                                ? `${item.color}55`
                                : "rgba(255,255,255,.045)"),
                            borderRadius: 10,
                            background:
                              highlighted
                                ? `${item.color}0d`
                                : "rgba(255,255,255,.012)",
                            color:
                              "var(--nx-text)",
                            textAlign: "left",
                            cursor: "pointer",
                            font: "inherit",
                            transition:
                              "background .2s ease, border-color .2s ease",
                          }}
                        >

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "20px minmax(0,1fr) auto",
                              gap: 8,
                              alignItems:
                                "center",
                            }}
                          >

                            <span
                              style={{
                                width: 20,
                                height: 20,
                                display: "grid",
                                placeItems:
                                  "center",
                                borderRadius: 6,
                                background:
                                  `${item.color}18`,
                                fontSize: 10,
                              }}
                            >
                              {getCategoryIcon(
                                item.name
                              )}
                            </span>


                            <div
                              style={{
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "space-between",
                                  gap: 7,
                                }}
                              >
                                <span
                                  style={{
                                    overflow:
                                      "hidden",
                                    textOverflow:
                                      "ellipsis",
                                    whiteSpace:
                                      "nowrap",
                                    color:
                                      "var(--nx-text)",
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {item.name}
                                </span>

                                <span
                                  style={{
                                    color:
                                      "var(--nx-muted)",
                                    fontSize: 9,
                                  }}
                                >
                                  {item.pct.toFixed(
                                    1
                                  )}
                                  %
                                </span>
                              </div>


                              {/* Progress */}

                              <div
                                style={{
                                  height: 3,
                                  marginTop: 6,
                                  borderRadius: 999,
                                  background:
                                    "rgba(255,255,255,.06)",
                                  overflow:
                                    "hidden",
                                }}
                              >
                                <motion.div
                                  initial={{
                                    width: 0,
                                  }}
                                  animate={{
                                    width: `${Math.max(
                                      item.pct,
                                      1
                                    )}%`,
                                  }}
                                  transition={{
                                    duration:
                                      0.65,
                                    delay:
                                      index *
                                      0.04,
                                    ease:
                                      "easeOut",
                                  }}
                                  style={{
                                    height: "100%",
                                    borderRadius:
                                      999,
                                    background:
                                      item.color,
                                    boxShadow:
                                      `0 0 8px ${item.color}55`,
                                  }}
                                />
                              </div>
                            </div>


                            <strong
                              style={{
                                color:
                                  item.color,
                                fontSize: 10,
                                fontWeight: 800,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatINR(
                                item.value
                              )}
                            </strong>
                          </div>
                        </motion.button>
                      );
                    }
                  )}
                </AnimatePresence>


                {/* Show more */}

                {hasMoreCategories && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAllCategories(
                        (value) => !value
                      )
                    }
                    style={{
                      marginTop: 2,
                      padding: "7px 8px",
                      border: 0,
                      borderRadius: 8,
                      color:
                        "var(--nx-muted)",
                      background:
                        "rgba(255,255,255,.025)",
                      font: "inherit",
                      fontSize: 9.5,
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    {showAllCategories
                      ? "Show less"
                      : `Show ${
                          byCat.length - 5
                        } more categories`}
                  </button>
                )}
              </div>
            </div>


            {/* =================================================
                MONTHLY TREND
               ================================================= */}

            <div className="stmt-insights__panel">

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  marginBottom: 10,
                }}
              >

                <div>
                  <h3
                    className="stmt-insights__subtitle"
                    style={{
                      marginBottom: 3,
                    }}
                  >
                    Monthly trend
                  </h3>

                  <span
                    style={{
                      color:
                        "var(--nx-muted-2)",
                      fontSize: 9,
                    }}
                  >
                    Credits vs debits
                  </span>
                </div>


                {/* Legend */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent:
                      "flex-end",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems:
                        "center",
                      gap: 5,
                      color:
                        "var(--nx-muted)",
                      fontSize: 8.5,
                    }}
                  >
                    <i
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          "#22D66F",
                      }}
                    />
                    Credits
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems:
                        "center",
                      gap: 5,
                      color:
                        "var(--nx-muted)",
                      fontSize: 8.5,
                    }}
                  >
                    <i
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          "#FF5A6E",
                      }}
                    />
                    Debits
                  </span>
                </div>
              </div>


              {/* Chart */}

              <div
                className="stmt-insights__chart-wrap"
                style={{
                  height: 255,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={monthly}
                    margin={{
                      top: 10,
                      right: 8,
                      left: -10,
                      bottom: 0,
                    }}
                  >

                    <defs>

                      <linearGradient
                        id="gCredit"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22D66F"
                          stopOpacity={0.38}
                        />

                        <stop
                          offset="100%"
                          stopColor="#22D66F"
                          stopOpacity={0}
                        />
                      </linearGradient>


                      <linearGradient
                        id="gDebit"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#FF5A6E"
                          stopOpacity={0.34}
                        />

                        <stop
                          offset="100%"
                          stopColor="#FF5A6E"
                          stopOpacity={0}
                        />
                      </linearGradient>

                    </defs>


                    <CartesianGrid
                      stroke="rgba(255,255,255,.055)"
                      vertical={false}
                    />


                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: "#8B98B0",
                        fontSize: 9,
                      }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                    />


                    <YAxis
                      tickFormatter={(value) =>
                        formatCompactINR(
                          value * 100
                        )
                      }
                      tick={{
                        fill: "#68758B",
                        fontSize: 8.5,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                    />


                    <Tooltip
                      content={<LineTooltip />}
                    />


                    <Area
                      type="monotone"
                      dataKey="creditRupees"
                      name="Credits"
                      stroke="#22D66F"
                      strokeWidth={2}
                      fill="url(#gCredit)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke:
                          "#22D66F",
                        fill: "#07101f",
                      }}
                      isAnimationActive
                      animationDuration={900}
                    />


                    <Area
                      type="monotone"
                      dataKey="debitRupees"
                      name="Debits"
                      stroke="#FF5A6E"
                      strokeWidth={2}
                      fill="url(#gDebit)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke:
                          "#FF5A6E",
                        fill: "#07101f",
                      }}
                      isAnimationActive
                      animationDuration={900}
                    />

                  </AreaChart>
                </ResponsiveContainer>
              </div>


              {/* Trend summary */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 5,
                }}
              >

                <div
                  style={{
                    padding:
                      "9px 10px",
                    border:
                      "1px solid rgba(34,214,111,.09)",
                    borderRadius: 10,
                    background:
                      "rgba(34,214,111,.025)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color:
                        "var(--nx-muted)",
                      fontSize: 8,
                    }}
                  >
                    Credits
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                      color:
                        "var(--nx-accent)",
                      fontSize: 10.5,
                    }}
                  >
                    {formatCompactINR(
                      totalCredits
                    )}
                  </strong>
                </div>


                <div
                  style={{
                    padding:
                      "9px 10px",
                    border:
                      "1px solid rgba(255,90,110,.09)",
                    borderRadius: 10,
                    background:
                      "rgba(255,90,110,.025)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color:
                        "var(--nx-muted)",
                      fontSize: 8,
                    }}
                  >
                    Debits
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                      color:
                        "var(--nx-danger)",
                      fontSize: 10.5,
                    }}
                  >
                    {formatCompactINR(
                      totalDebits
                    )}
                  </strong>
                </div>


                <div
                  style={{
                    padding:
                      "9px 10px",
                    border:
                      "1px solid var(--nx-border)",
                    borderRadius: 10,
                    background:
                      "rgba(255,255,255,.015)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color:
                        "var(--nx-muted)",
                      fontSize: 8,
                    }}
                  >
                    Net
                  </span>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                      color:
                        netFlow >= 0
                          ? "var(--nx-accent)"
                          : "var(--nx-danger)",
                      fontSize: 10.5,
                    }}
                  >
                    {netFlow >= 0
                      ? "+"
                      : ""}
                    {formatCompactINR(
                      netFlow
                    )}
                  </strong>
                </div>

              </div>

            </div>

          </div>
        </>
      )}
    </motion.section>
  );
}