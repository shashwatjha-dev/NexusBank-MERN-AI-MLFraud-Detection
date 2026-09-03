import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coins,
  Landmark,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { apiClient } from "../../services/apiClient.js";
import "./FixedDepositsPage.css";

function formatINR(paise) {
  if (typeof paise !== "number") return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

function toPaise(rupees) {
  const n = Number(rupees);

  if (!Number.isFinite(n) || n <= 0) return 0;

  return Math.round(n * 100);
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDaysLeft(date) {
  if (!date) return 0;

  const target = new Date(date).getTime();
  const now = Date.now();

  return Math.max(
    0,
    Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  );
}

function getProgress(deposit) {
  if (!deposit?.createdAt || !deposit?.maturityDate) {
    return 0;
  }

  const start = new Date(deposit.createdAt).getTime();
  const end = new Date(deposit.maturityDate).getTime();
  const now = Date.now();

  if (end <= start) return 100;

  const progress = ((now - start) / (end - start)) * 100;

  return Math.min(100, Math.max(0, progress));
}

export default function FixedDepositsPage() {
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sourceAccountId, setSourceAccountId] = useState("");
  const [principalRupees, setPrincipalRupees] = useState("");
  const [interestRate, setInterestRate] = useState("7.1");
  const [durationMonths, setDurationMonths] = useState("12");

  const [calculatorAmount, setCalculatorAmount] = useState("100000");
  const [calculatorMonths, setCalculatorMonths] = useState("12");
  const [calculatorRate, setCalculatorRate] = useState("7.1");

  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [{ data: accData }, { data: fdData }] =
        await Promise.all([
          apiClient.get("/accounts"),
          apiClient.get("/fd"),
        ]);

      const accList = Array.isArray(accData?.data)
        ? accData.data
        : accData?.data?.items || [];

      const fdList = Array.isArray(fdData?.data)
        ? fdData.data
        : fdData?.data?.items || [];

      setAccounts(accList);
      setDeposits(fdList);

      if (!sourceAccountId && accList.length > 0) {
        const primary =
          accList.find((account) => account.isPrimary) ||
          accList[0];

        setSourceAccountId(primary._id);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load fixed deposit information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAccount = useMemo(
    () =>
      accounts.find(
        (account) => account._id === sourceAccountId
      ),
    [accounts, sourceAccountId]
  );

  const previewMaturity = useMemo(() => {
    const principal = toPaise(principalRupees);
    const rate = Number(interestRate);
    const months = Number(durationMonths);

    if (!principal || !rate || !months) return 0;

    return Math.round(
      principal * (1 + (rate / 100) * (months / 12))
    );
  }, [principalRupees, interestRate, durationMonths]);

  const calculatorMaturity = useMemo(() => {
    const amount = toPaise(calculatorAmount);
    const rate = Number(calculatorRate);
    const months = Number(calculatorMonths);

    if (!amount || !rate || !months) return 0;

    return Math.round(
      amount * (1 + (rate / 100) * (months / 12))
    );
  }, [
    calculatorAmount,
    calculatorRate,
    calculatorMonths,
  ]);

  const totalPrincipal = deposits.reduce(
    (sum, deposit) =>
      sum + (deposit.principalPaise || 0),
    0
  );

  const totalMaturity = deposits.reduce(
    (sum, deposit) =>
      sum + (deposit.maturityAmountPaise || 0),
    0
  );

  const totalInterest = Math.max(
    0,
    totalMaturity - totalPrincipal
  );

  const activeDeposits = deposits.filter(
    (deposit) => deposit.status === "ACTIVE"
  );

  const averageRate =
    deposits.length > 0
      ? deposits.reduce(
          (sum, deposit) =>
            sum + Number(deposit.interestRate || 0),
          0
        ) / deposits.length
      : 0;

  const upcomingMaturity = [...activeDeposits]
    .sort(
      (a, b) =>
        new Date(a.maturityDate) -
        new Date(b.maturityDate)
    )[0];

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const principalPaise = toPaise(principalRupees);

    if (!sourceAccountId) {
      setError("Please select a source account.");
      return;
    }

    if (!principalPaise) {
      setError("Enter a valid principal amount.");
      return;
    }

    if (!Number(interestRate)) {
      setError("Enter a valid interest rate.");
      return;
    }

    if (!Number(durationMonths)) {
      setError("Enter a valid duration.");
      return;
    }

    const availableBalance =
      selectedAccount?.availableBalancePaise ??
      selectedAccount?.balancePaise ??
      0;

    if (availableBalance < principalPaise) {
      setError(
        "Insufficient balance in the selected account."
      );
      return;
    }

    try {
      setSubmitting(true);

      await apiClient.post("/fd", {
        sourceAccountId,
        principalPaise,
        interestRate: Number(interestRate),
        durationMonths: Number(durationMonths),
      });

      setSuccess(
        "Fixed deposit booked successfully."
      );

      setPrincipalRupees("");

      await loadAll();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          "Could not book the fixed deposit."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fd-page"
      data-testid="fd-page"
    >
      {/* =====================================
          HERO
      ====================================== */}

      <header className="fd-hero">
        <div className="fd-hero__content">
          <div className="fd-kicker">
            <span className="fd-kicker__dot" />
            WEALTH MANAGEMENT
          </div>

          <h1>
            Fixed Deposits
            <span className="fd-title-shine">.</span>
          </h1>

          <p>
            Grow your money with predictable returns,
            secure tenures and smarter savings.
          </p>

          <div className="fd-hero__chips">
            <span>
              <ShieldCheck size={13} />
              Bank-grade security
            </span>

            <span>
              <TrendingUp size={13} />
              Predictable returns
            </span>

            <span>
              <LockKeyhole size={13} />
              Secure investment
            </span>
          </div>
        </div>

        <div className="fd-hero__visual">
          <div className="fd-orbit fd-orbit--one" />
          <div className="fd-orbit fd-orbit--two" />

          <div className="fd-bank-orb">
            <Landmark size={48} />
          </div>

          <div className="fd-floating-coin fd-floating-coin--one">
            ₹
          </div>

          <div className="fd-floating-coin fd-floating-coin--two">
            <TrendingUp size={15} />
          </div>
        </div>

        <button
          type="button"
          className="fd-create-button"
          onClick={() =>
            document
              .getElementById("fd-book-section")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          <Plus size={18} />
          Create Fixed Deposit
        </button>
      </header>

      {/* =====================================
          PORTFOLIO SUMMARY
      ====================================== */}

      <section className="fd-portfolio">
        <div className="fd-portfolio__main">
          <div className="fd-portfolio__icon">
            <WalletCards size={25} />
          </div>

          <div>
            <span className="fd-label">
              TOTAL PORTFOLIO VALUE
            </span>

            <strong className="fd-portfolio__amount">
              {formatINR(totalMaturity)}
            </strong>

            <p>
              Maturity value of all active deposits
            </p>
          </div>
        </div>

        <div className="fd-portfolio__metrics">
          <div>
            <span>TOTAL INVESTED</span>
            <strong>
              {formatINR(totalPrincipal)}
            </strong>
            <small>
              Across {activeDeposits.length} deposits
            </small>
          </div>

          <div>
            <span>INTEREST EARNED</span>
            <strong className="purple">
              {formatINR(totalInterest)}
            </strong>
            <small>Expected returns</small>
          </div>

          <div>
            <span>AVG. INTEREST RATE</span>
            <strong className="blue">
              {averageRate.toFixed(2)}%
            </strong>
            <small>Weighted portfolio rate</small>
          </div>
        </div>
      </section>

      {/* =====================================
          MAIN GRID
      ====================================== */}

      <div className="fd-layout">
        <main>
          {/* ACTIVE DEPOSITS */}

          <section className="fd-active-section">
            <div className="fd-section-head">
              <div>
                <span className="fd-label">
                  YOUR INVESTMENTS
                </span>

                <h2>
                  Active Fixed Deposits
                  <span className="fd-count">
                    {activeDeposits.length}
                  </span>
                </h2>
              </div>

              <div className="fd-sort">
                <span>Sort by</span>
                <select defaultValue="earliest">
                  <option value="earliest">
                    Maturity: Earliest
                  </option>
                  <option value="latest">
                    Maturity: Latest
                  </option>
                  <option value="amount">
                    Amount: Highest
                  </option>
                </select>
                <ChevronDown size={14} />
              </div>
            </div>

            {loading ? (
              <div className="fd-loading">
                <span className="fd-spinner fd-spinner--large" />
                Loading your deposits...
              </div>
            ) : activeDeposits.length === 0 ? (
              <div className="fd-empty">
                <div className="fd-empty__icon">
                  <Coins size={28} />
                </div>

                <h3>No active fixed deposits</h3>

                <p>
                  Start your first investment to grow
                  your savings.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(
                        "fd-book-section"
                      )
                      ?.scrollIntoView({
                        behavior: "smooth",
                      })
                  }
                >
                  Create your first FD
                </button>
              </div>
            ) : (
              <div className="fd-deposit-list">
                {activeDeposits.map(
                  (deposit, index) => {
                    const progress =
                      getProgress(deposit);

                    const daysLeft =
                      getDaysLeft(
                        deposit.maturityDate
                      );

                    const colors = [
                      "green",
                      "purple",
                      "blue",
                    ];

                    const tone =
                      colors[index % colors.length];

                    return (
                      <article
                        key={deposit._id}
                        className={`fd-deposit-card fd-deposit-card--${tone}`}
                        data-testid={`fd-row-${deposit._id}`}
                      >
                        <div className="fd-deposit-card__top">
                          <div className="fd-deposit-card__identity">
                            <div className="fd-deposit-icon">
                              <LockKeyhole size={20} />
                            </div>

                            <div>
                              <div className="fd-active-badge">
                                <span />
                                ACTIVE
                              </div>

                              <strong>
                                {formatINR(
                                  deposit.principalPaise
                                )}
                              </strong>

                              <small>
                                Principal amount
                              </small>
                            </div>
                          </div>

                          <span className="fd-id">
                            FD #
                            {String(
                              deposit._id
                            ).slice(-6).toUpperCase()}
                          </span>
                        </div>

                        <div className="fd-deposit-details">
                          <div>
                            <span>Interest rate</span>
                            <strong>
                              {deposit.interestRate}%
                              <small> p.a.</small>
                            </strong>
                          </div>

                          <div>
                            <span>Tenure</span>
                            <strong>
                              {
                                deposit.durationMonths
                              }{" "}
                              <small>Months</small>
                            </strong>
                          </div>

                          <div>
                            <span>Maturity value</span>
                            <strong className="fd-green-text">
                              {formatINR(
                                deposit.maturityAmountPaise
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Matures on</span>
                            <strong>
                              {formatDate(
                                deposit.maturityDate
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="fd-progress-row">
                          <div className="fd-progress">
                            <span
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                          <strong>
                            {Math.round(progress)}%
                          </strong>
                        </div>

                        <div className="fd-deposit-footer">
                          <span>
                            <Clock3 size={13} />
                            {daysLeft > 0
                              ? `${daysLeft} days remaining`
                              : "Maturity due"}
                          </span>

                          <span>
                            Booked{" "}
                            {formatDate(
                              deposit.createdAt
                            )}
                          </span>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* BOOK FD */}

          <section
            id="fd-book-section"
            className="fd-book-card"
          >
            <div className="fd-section-head fd-book-head">
              <div>
                <span className="fd-label">
                  NEW INVESTMENT
                </span>

                <h2>
                  <Sparkles size={20} />
                  Book a new Fixed Deposit
                </h2>

                <p>
                  Lock in your savings and earn
                  predictable returns.
                </p>
              </div>

              <div className="fd-rate-highlight">
                <span>Available rate</span>
                <strong>7.10%</strong>
                <small>p.a.</small>
              </div>
            </div>

            <form
              onSubmit={submit}
              className="fd-form"
              data-testid="fd-form"
            >
              <div className="fd-field fd-field--wide">
                <label htmlFor="fd-source-account">
                  Source account
                </label>

                <div className="fd-input-box">
                  <WalletCards size={16} />

                  <select
                    id="fd-source-account"
                    value={sourceAccountId}
                    onChange={(event) =>
                      setSourceAccountId(
                        event.target.value
                      )
                    }
                    required
                    data-testid="fd-source-account-select"
                  >
                    <option value="">
                      Select an account
                    </option>

                    {accounts.map((account) => (
                      <option
                        key={account._id}
                        value={account._id}
                      >
                        {account.accountType} · ••••
                        {account.accountNumber?.slice(
                          -4
                        )}{" "}
                        ·{" "}
                        {formatINR(
                          account.availableBalancePaise ??
                            account.balancePaise
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAccount && (
                  <small className="fd-helper">
                    Available balance:{" "}
                    <strong>
                      {formatINR(
                        selectedAccount.availableBalancePaise ??
                          selectedAccount.balancePaise
                      )}
                    </strong>
                  </small>
                )}
              </div>

              <div className="fd-field">
                <label htmlFor="fd-principal">
                  Investment amount
                </label>

                <div className="fd-input-box">
                  <span className="fd-input-prefix">
                    ₹
                  </span>

                  <input
                    id="fd-principal"
                    type="number"
                    step="0.01"
                    min="1"
                    value={principalRupees}
                    onChange={(event) =>
                      setPrincipalRupees(
                        event.target.value
                      )
                    }
                    placeholder="50,000"
                    required
                    data-testid="fd-principal-input"
                  />
                </div>
              </div>

              <div className="fd-field">
                <label htmlFor="fd-rate">
                  Interest rate
                </label>

                <div className="fd-input-box">
                  <input
                    id="fd-rate"
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="25"
                    value={interestRate}
                    onChange={(event) =>
                      setInterestRate(
                        event.target.value
                      )
                    }
                    required
                    data-testid="fd-rate-input"
                  />

                  <span>% p.a.</span>
                </div>
              </div>

              <div className="fd-field">
                <label htmlFor="fd-duration">
                  Duration
                </label>

                <div className="fd-input-box">
                  <input
                    id="fd-duration"
                    type="number"
                    min="1"
                    max="120"
                    value={durationMonths}
                    onChange={(event) =>
                      setDurationMonths(
                        event.target.value
                      )
                    }
                    required
                    data-testid="fd-duration-input"
                  />

                  <span>months</span>
                </div>
              </div>

              <div
                className="fd-preview"
                data-testid="fd-maturity-preview"
              >
                <div>
                  <span>
                    Estimated maturity value
                  </span>

                  <strong>
                    {formatINR(
                      previewMaturity
                    )}
                  </strong>

                  {principalRupees &&
                    previewMaturity > 0 && (
                      <small>
                        Estimated interest{" "}
                        <b>
                          {formatINR(
                            Math.max(
                              0,
                              previewMaturity -
                                toPaise(
                                  principalRupees
                                )
                            )
                          )}
                        </b>
                      </small>
                    )}
                </div>

                <div className="fd-preview-icon">
                  <TrendingUp size={22} />
                </div>
              </div>

              {error && (
                <div
                  className="fd-message fd-message--error"
                  data-testid="fd-error"
                >
                  <span>!</span>
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="fd-message fd-message--success"
                  data-testid="fd-success"
                >
                  <CheckCircle2 size={17} />
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="fd-submit"
                disabled={submitting}
                data-testid="fd-submit"
              >
                {submitting ? (
                  <>
                    <span className="fd-spinner" />
                    Booking...
                  </>
                ) : (
                  <>
                    Book Fixed Deposit
                    <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </form>
          </section>
        </main>

        {/* =====================================
            RIGHT SIDEBAR
        ====================================== */}

        <aside className="fd-sidebar">
          {/* UPCOMING MATURITY */}

          <section className="fd-side-card fd-maturity-card">
            <div className="fd-side-card__head">
              <div>
                <span className="fd-label">
                  UPCOMING MATURITY
                </span>

                <h3>
                  <CalendarDays size={18} />
                  Next maturity
                </h3>
              </div>

              <div className="fd-calendar-icon">
                <CalendarDays size={22} />
              </div>
            </div>

            {upcomingMaturity ? (
              <>
                <div className="fd-next-days">
                  <strong>
                    {getDaysLeft(
                      upcomingMaturity.maturityDate
                    )}
                  </strong>

                  <span>days left</span>
                </div>

                <div className="fd-maturity-info">
                  <div>
                    <span>Maturity date</span>
                    <strong>
                      {formatDate(
                        upcomingMaturity.maturityDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Maturity amount</span>
                    <strong>
                      {formatINR(
                        upcomingMaturity.maturityAmountPaise
                      )}
                    </strong>
                  </div>
                </div>

                <div className="fd-side-progress">
                  <span
                    style={{
                      width: `${getProgress(
                        upcomingMaturity
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="fd-side-empty">
                No upcoming maturities.
              </div>
            )}
          </section>

          {/* CALCULATOR */}

          <section className="fd-side-card fd-calculator">
            <div className="fd-side-card__head">
              <div>
                <span className="fd-label">
                  FD CALCULATOR
                </span>

                <h3>
                  <Coins size={18} />
                  Estimate returns
                </h3>
              </div>
            </div>

            <div className="fd-calc-field">
              <label>Amount</label>

              <div>
                <span>₹</span>

                <input
                  type="number"
                  value={calculatorAmount}
                  onChange={(e) =>
                    setCalculatorAmount(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="fd-calc-field">
              <label>Tenure</label>

              <select
                value={calculatorMonths}
                onChange={(e) =>
                  setCalculatorMonths(
                    e.target.value
                  )
                }
              >
                <option value="6">6 Months</option>
                <option value="12">1 Year</option>
                <option value="18">18 Months</option>
                <option value="24">2 Years</option>
                <option value="36">3 Years</option>
                <option value="60">5 Years</option>
              </select>
            </div>

            <div className="fd-calc-field">
              <label>Interest rate</label>

              <select
                value={calculatorRate}
                onChange={(e) =>
                  setCalculatorRate(
                    e.target.value
                  )
                }
              >
                <option value="6.5">
                  6.50% p.a.
                </option>

                <option value="7.1">
                  7.10% p.a.
                </option>

                <option value="7.25">
                  7.25% p.a.
                </option>

                <option value="7.5">
                  7.50% p.a.
                </option>
              </select>
            </div>

            <div className="fd-calculator-result">
              <span>Maturity amount</span>

              <strong>
                {formatINR(
                  calculatorMaturity
                )}
              </strong>

              <small>
                Interest earned{" "}
                {formatINR(
                  Math.max(
                    0,
                    calculatorMaturity -
                      toPaise(
                        calculatorAmount
                      )
                  )
                )}
              </small>
            </div>
          </section>

          {/* SECURITY CARD */}

          <section className="fd-security-card">
            <div className="fd-security-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <strong>Your money stays protected</strong>

              <p>
                NexusBank keeps your investment
                protected with secure banking
                controls.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}