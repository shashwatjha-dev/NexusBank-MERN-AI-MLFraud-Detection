import { formatPaise } from "../utils/money.js";

/**
 * Small, dependency-free CSV writer. Escapes commas, double-quotes, and
 * newlines per RFC 4180.
 */
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toRow(fields) {
  return fields.map(csvEscape).join(",");
}

/**
 * Streams a bank statement CSV to `res`.
 *
 * `entries` are LedgerEntry documents (Batch 2) shaped as:
 *   { createdAt, direction, entryType, amountPaise,
 *     balanceBeforePaise, balanceAfterPaise, reference, description }
 *
 * We tolerate missing fields gracefully.
 */
export function writeStatementCsv(res, { account, entries, dateRange }) {
  const filename = `statement-${account.accountNumber}-${Date.now()}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const header = [
    "NexusBank Statement",
    `Account,${account.accountNumber}`,
    `Type,${account.accountType || ""}`,
    `From,${dateRange?.from || ""}`,
    `To,${dateRange?.to || ""}`,
    `Closing Balance,${formatPaise(account.balancePaise)}`,
    "",
    toRow([
      "Date",
      "Type",
      "Direction",
      "Description",
      "Amount",
      "Balance Before",
      "Balance After",
      "Reference",
    ]),
  ].join("\r\n");

  res.write(header + "\r\n");

  for (const entry of entries) {
    const row = toRow([
      new Date(entry.createdAt || Date.now()).toISOString(),
      entry.entryType || "",
      entry.direction || "",
      entry.description || entry.reference?.kind || "",
      formatPaise(entry.amountPaise || 0),
      formatPaise(entry.balanceBeforePaise ?? 0),
      formatPaise(entry.balanceAfterPaise ?? 0),
      entry.reference ? JSON.stringify(entry.reference) : "",
    ]);
    res.write(row + "\r\n");
  }
  res.end();
}