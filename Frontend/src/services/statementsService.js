
import { apiClient } from "./apiClient";

/* ─────────── Categories ─────────── */

export const CATEGORY_META = {
  Shopping:    { color: "#F59E0B", key: "Shopping" },
  Food:        { color: "#EF4444", key: "Food" },
  Bills:       { color: "#8B5CF6", key: "Bills" },
  Transfers:   { color: "#4FA6FF", key: "Transfers" },
  Salary:      { color: "#22D66F", key: "Salary" },
  Rewards:     { color: "#EC4899", key: "Rewards" },
  Investments: { color: "#14B8A6", key: "Investments" },
  Other:       { color: "#6B7280", key: "Other" },
};

const KEYWORDS = [
  ["Salary",      ["salary","payroll","wage","stipend","income received"]],
  ["Rewards",     ["reward","cashback","refund","bonus","gift","incentive","promo"]],
  ["Investments", ["fd_placement","fd","fixed deposit","ppf","mutual","sip","invest","maturity","dividend"]],
  ["Food",        ["swiggy","zomato","restaurant","cafe","dining","grocery","bigbasket","blinkit","food"]],
  ["Bills",       ["bill","electricity","water","gas","internet","recharge","dth","utility","insurance","phone","broadband","postpaid","prepaid"]],
  ["Shopping",    ["amazon","flipkart","myntra","ajio","meesho","shop","purchase","order","mall","retail","store"]],
  ["Transfers",   ["transfer","upi","imps","neft","rtgs","send","p2p","paid to"]],
];

/**
 * Predefined categories: Shopping · Food · Bills · Transfers · Salary ·
 * Rewards · Investments · Other. Primary source is the transaction's own
 * `category` field. Falls back to keyword classification and finally to
 * `entryType`-based defaults so every row lands in a known bucket.
 */
export function classifyEntry(entry) {
  const rawTxCat = entry?.transaction?.category;
  if (rawTxCat && CATEGORY_META[rawTxCat]) return rawTxCat;

  const haystack = [
    entry?.description,
    entry?.transaction?.description,
    entry?.entryType,
    entry?.reference?.kind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [cat, kws] of KEYWORDS) {
    if (kws.some((k) => haystack.includes(k))) return cat;
  }

  if (entry?.entryType === "FD_PLACEMENT" || entry?.entryType === "PPF_CONTRIBUTION") return "Investments";
  if (entry?.entryType === "TRANSFER" || entry?.entryType === "TRANSFER_OUT" || entry?.entryType === "TRANSFER_IN") return "Transfers";

  return "Other";
}

/* ─────────── Smart-filter chip definitions ─────────── */

export const FILTER_CHIPS = [
  // Time
  { id: "today",           label: "Today",           group: "time" },
  { id: "this_week",       label: "This Week",       group: "time" },
  { id: "last_7",          label: "Last 7 Days",     group: "time" },
  { id: "last_30",         label: "Last 30 Days",    group: "time" },
  { id: "this_month",      label: "This Month",      group: "time" },
  { id: "last_month",      label: "Last Month",      group: "time" },
  { id: "last_90",         label: "Last 90 Days",    group: "time" },
  { id: "this_calendar",   label: "This Calendar Year", group: "time" },
  { id: "this_fy",         label: "This FY",         group: "time" },

  // Direction / status
  { id: "credits",         label: "Credits",         group: "direction" },
  { id: "debits",          label: "Debits",          group: "direction" },
  { id: "refunds",         label: "Refunds / Credits", group: "direction" },
  { id: "completed",       label: "Completed",       group: "status" },
  { id: "pending",         label: "Pending",         group: "status" },
  { id: "failed_blocked",  label: "Failed / Blocked", group: "status" },

  // Amount
  { id: "amount_10k",      label: "₹10k+",           group: "amount" },
  { id: "amount_50k",      label: "Large Transactions ₹50k+", group: "amount" },

  // Risk
  { id: "risk_high",       label: "High Risk",       group: "risk" },
  { id: "risk_low",        label: "Low Risk",        group: "risk" },
];

/* ─────────── Time-window helpers ─────────── */

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // Monday
  x.setDate(x.getDate() + diff);
  return x;
}

function windowForChip(id, now = new Date()) {
  const s = new Date(now);
  switch (id) {
    case "today":         return [startOfDay(s), endOfDay(s)];
    case "this_week":     return [startOfWeek(s), endOfDay(s)];
    case "last_7":        return [startOfDay(new Date(s.getTime() - 6 * 86400000)), endOfDay(s)];
    case "last_30":       return [startOfDay(new Date(s.getTime() - 29 * 86400000)), endOfDay(s)];
    case "last_90":       return [startOfDay(new Date(s.getTime() - 89 * 86400000)), endOfDay(s)];
    case "this_month":    return [new Date(s.getFullYear(), s.getMonth(), 1), endOfDay(s)];
    case "last_month": {
      const start = new Date(s.getFullYear(), s.getMonth() - 1, 1);
      const end = new Date(s.getFullYear(), s.getMonth(), 0, 23, 59, 59, 999);
      return [start, end];
    }
    case "this_calendar": return [new Date(s.getFullYear(), 0, 1), endOfDay(s)];
    case "this_fy": {
      const y = s.getFullYear();
      const fyStartYear = s.getMonth() >= 3 ? y : y - 1; // April = month 3
      return [new Date(fyStartYear, 3, 1), endOfDay(s)];
    }
    default: return null;
  }
}

/* ─────────── Client-side filter + search ─────────── */

export function applyFiltersAndSearch(entries, { chips = [], search = "" }) {
  const active = new Set(chips);
  const q = String(search || "").trim().toLowerCase();

  // Time window: pick the first active time chip.
  const timeChip = FILTER_CHIPS.find((c) => c.group === "time" && active.has(c.id));
  const window = timeChip ? windowForChip(timeChip.id) : null;

  return entries.filter((e) => {
    // Time
    if (window) {
      const t = new Date(e.createdAt).getTime();
      if (t < window[0].getTime() || t > window[1].getTime()) return false;
    }
    // Direction
    if (active.has("credits") && e.direction !== "CREDIT") return false;
    if (active.has("debits")  && e.direction !== "DEBIT")  return false;
    if (active.has("refunds") && e.direction !== "CREDIT") return false;
    // Status
    const status = e?.transaction?.status;
    if (active.has("completed")      && status && status !== "COMPLETED") return false;
    if (active.has("pending")        && status && status !== "PENDING")   return false;
    if (active.has("failed_blocked") && status && !["FAILED","BLOCKED"].includes(status)) return false;
    // Amount
    if (active.has("amount_10k") && (e.amountPaise || 0) < 10_000_00) return false;
    if (active.has("amount_50k") && (e.amountPaise || 0) < 50_000_00) return false;
    // Risk
    const risk = e?.transaction?.riskLevel;
    if (active.has("risk_high") && risk !== "HIGH") return false;
    if (active.has("risk_low")  && risk !== "LOW")  return false;

    // Search across many fields including masked account
    if (q) {
      const tx = e.transaction || {};
      const ben = tx.beneficiary || {};
      const cat = classifyEntry(e);
      const acctSuffix = (ben.accountNumber || "").slice(-4);
      const amountStr = String((e.amountPaise || 0) / 100);
      const bag = [
        e.description, e.entryType, e.reference?.kind,
        tx.description, tx.status, tx.riskLevel, tx.idempotencyKey, String(tx._id || ""),
        ben.name, ben.bankName, ben.accountNumber, acctSuffix,
        `•••• ${acctSuffix}`, cat, amountStr,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!bag.includes(q)) return false;
    }
    return true;
  });
}

/* ─────────── Aggregations for Category Insights ─────────── */

export function aggregateByCategory(entries) {
  const map = new Map();
  for (const e of entries) {
    if (e.direction !== "DEBIT") continue; // insights show spending
    const cat = classifyEntry(e);
    map.set(cat, (map.get(cat) || 0) + (e.amountPaise || 0));
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_META[name]?.color || "#6B7280",
      pct: total ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateMonthlyTrend(entries) {
  const bucket = new Map();
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = bucket.get(key) || { key, credit: 0, debit: 0, net: 0 };
    if (e.direction === "CREDIT") row.credit += e.amountPaise || 0;
    else row.debit += e.amountPaise || 0;
    row.net = row.credit - row.debit;
    bucket.set(key, row);
  }
  return Array.from(bucket.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => ({
      ...r,
      label: new Date(r.key + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      creditRupees: r.credit / 100,
      debitRupees:  r.debit  / 100,
      netRupees:    r.net    / 100,
    }));
}

/* ─────────── Share API ─────────── */

export const statementsApi = {
  share: (accountId, payload) =>
    apiClient.post(`/statements/${accountId}/share`, payload).then((r) => r.data),
  listRecentShares: (limit = 10) =>
    apiClient.get("/statements/shares/recent", { params: { limit } }).then((r) => r.data),
};