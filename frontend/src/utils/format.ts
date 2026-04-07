/**
 * Null-safe formatting utilities for propSearch
 * 
 * Use these instead of calling .toLocaleString() directly on potentially-null values.
 * Shallow/incomplete datasets can have null prices, sqft, etc.
 */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const GBPFull = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat('en-GB');

/** Format a number as GBP currency, falling back to `fallback` if null/undefined */
export const fmtPrice = (n: number | null | undefined, fallback = '—'): string => {
  if (n == null || isNaN(n)) return fallback;
  return GBP.format(n);
};

/** Format a number as GBP with pence (useful for rates/fees) */
export const fmtPriceFull = (n: number | null | undefined, fallback = '—'): string => {
  if (n == null || isNaN(n)) return fallback;
  return GBPFull.format(n);
};

/** Format a plain number with thousand separators */
export const fmtNum = (n: number | null | undefined, fallback = '—'): string => {
  if (n == null || isNaN(n)) return fallback;
  return NUMBER.format(n);
};

/** Format a price delta (always shows + or - prefix) */
export const fmtDelta = (n: number | null | undefined, fallback = '—'): string => {
  if (n == null || isNaN(n)) return fallback;
  return `${n >= 0 ? '+' : ''}${NUMBER.format(n)}`;
};

/** Format a percentage */
export const fmtPct = (n: number | null | undefined, fallback = '—', decimals = 1): string => {
  if (n == null || isNaN(n)) return fallback;
  return `${n.toFixed(decimals)}%`;
};

/** Format sqm as £/sqm */
export const fmtPricePerSqm = (n: number | null | undefined, fallback = '—'): string => {
  if (n == null || isNaN(n)) return fallback;
  return `£${NUMBER.format(Math.round(n))}/sqm`;
};
