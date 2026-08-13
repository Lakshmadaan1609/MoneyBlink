/**
 * Money formatting for an Indian audience.
 *
 * BlinkMoney quotes everything in rupees using the Indian grouping system
 * (₹1,23,456 — not ₹123,456) and the lakh/crore scale. Getting this wrong is the
 * fastest way to make a fintech app feel foreign, so all currency rendering goes
 * through here rather than through `toLocaleString`, whose `en-IN` support is
 * unreliable across Hermes builds and Android locales.
 */

const RUPEE = '₹';

/** Guards against NaN/Infinity leaking into the UI from a division or bad restore. */
function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Groups digits the Indian way: the last three digits, then pairs.
 * 1234567 -> "12,34,567"
 */
export function groupIndian(value: number): string {
  const n = safe(value);
  const negative = n < 0;
  const digits = Math.abs(Math.round(n)).toString();

  const grouped =
    digits.length <= 3
      ? digits
      : digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + digits.slice(-3);

  return negative ? `-${grouped}` : grouped;
}

/** Full precision: ₹12,34,567 */
export function formatINR(value: number): string {
  const n = safe(value);
  return `${n < 0 ? '-' : ''}${RUPEE}${groupIndian(Math.abs(n))}`;
}

/**
 * Compact scale for hero numbers that must not wrap on a 320pt screen.
 * 4500000 -> "₹45.0 L", 21000000 -> "₹2.10 Cr"
 */
export function formatCompactINR(value: number): string {
  const n = safe(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1e7) return `${sign}${RUPEE}${trim(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}${RUPEE}${trim(abs / 1e5)} L`;
  if (abs >= 1e3) return `${sign}${RUPEE}${groupIndian(abs)}`;
  return `${sign}${RUPEE}${Math.round(abs)}`;
}

/** Two decimals, but drop a trailing ".0" so "₹45 L" beats "₹45.0 L". */
function trim(n: number): string {
  const fixed = n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2);
  return fixed.replace(/\.?0+$/, '');
}

/** "1 day" / "12 days" — used across streak copy. */
export function pluralDays(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'day' : 'days'}`;
}

/** Percentages shown to one decimal, e.g. "9.99%" stays exact, "15%" stays clean. */
export function formatPercent(value: number): string {
  const n = safe(value);
  return `${Number.isInteger(n) ? n : n.toFixed(2)}%`;
}
