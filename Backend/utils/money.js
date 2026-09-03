/**
 * Money helpers. All monetary values inside the backend are stored, computed,
 * and transported as *integer paise*. Floating-point rupees are never
 * introduced anywhere in the money path.
 *
 *   ₹1,234.56  ⇔  123456 paise
 */

const PAISE_PER_RUPEE = 100;

/**
 * Convert an integer paise value to a whole-number rupee value with 2-decimal
 * precision. Used only for display and analytics aggregation, never for math
 * that will feed back into the ledger.
 */
export function paiseToRupees(paise) {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / PAISE_PER_RUPEE;
}

/**
 * Convert a decimal rupee value to integer paise. Used ONLY at the seed/demo
 * layer or when accepting external legacy input — customer-facing endpoints
 * accept paise directly (validated by Joi).
 */
export function rupeesToPaise(rupees) {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/**
 * Format an integer paise value as an Indian currency string.
 *   1234567890 → "₹1,23,45,678.90"
 */
export function formatPaise(paise, { withSymbol = true, locale = "en-IN" } = {}) {
  const rupees = paiseToRupees(paise);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? formatter.format(rupees) : formatter.format(rupees).replace("₹", "").trim();
}

/**
 * Guarantees the value is a safe integer paise amount before it touches the DB.
 * Throws if the caller passes a float, negative, or non-finite value.
 */
export function assertPaise(paise, { allowZero = false } = {}) {
  if (!Number.isInteger(paise)) {
    throw new Error(`Expected integer paise, received: ${paise}`);
  }
  if (paise < 0 || (paise === 0 && !allowZero)) {
    throw new Error(`Expected positive paise, received: ${paise}`);
  }
  return paise;
}