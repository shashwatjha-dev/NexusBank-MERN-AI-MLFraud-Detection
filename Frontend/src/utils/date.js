export const formatDateTime = (input) => {
  if (!input) return "—";
  return new Date(input).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const formatDate = (input) => {
  if (!input) return "—";
  return new Date(input).toLocaleDateString("en-IN", { dateStyle: "medium" });
};

export const relativeFromNow = (input) => {
  if (!input) return "—";
  const diffMs = new Date(input).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const table = [
    ["year", 365 * 86_400_000],
    ["month", 30 * 86_400_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of table) {
    if (abs >= ms || unit === "minute") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, "minute");
};