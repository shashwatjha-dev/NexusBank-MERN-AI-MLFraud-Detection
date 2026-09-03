const RUPEE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const paiseToRupees = (paise) =>
  Number.isFinite(paise) ? Math.round(paise) / 100 : 0;

export const formatPaise = (paise) => RUPEE.format(paiseToRupees(paise));

export const rupeesToPaise = (rupees) => {
  const value = Number(rupees);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
};

export const formatCompact = (paise) => {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(rupees);
};