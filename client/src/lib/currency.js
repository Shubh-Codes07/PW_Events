/**
 * Formats a numeric amount using Indian digit grouping (lakhs, crores).
 * E.g., 300000 -> "₹3,00,000"
 * @param {number|string} amount
 * @param {boolean} [includeSymbol=true]
 * @returns {string}
 */
export function formatINR(amount, includeSymbol = true) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return includeSymbol ? '₹0' : '0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const rounded = Math.round(absNum);

  // Format using Indian locale
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rounded);

  const prefix = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹' : '';

  return `${prefix}${symbol}${formatted}`;
}

/**
 * Parses an INR string input into a pure numeric value.
 * Strips '₹', commas, spaces.
 * E.g., "₹3,00,000" -> 300000, " 1,50,000 " -> 150000
 * @param {string|number} value
 * @returns {number}
 */
export function parseINR(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value || typeof value !== 'string') return 0;

  const cleaned = value.replace(/[₹,\s]/g, '');
  if (!cleaned) return 0;

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
