// src/utils/money.ts
const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "EUR";
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-DE";

/** Format a number as currency (safe fallback if Intl fails). */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currency === "EUR" ? "€" : "";
    const fixed = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    return `${symbol} ${fixed}`.trim();
  }
}

/** Safe string→number parsing for prices coming from DB/JSON. */
export function parsePrice(
  v: number | string | null | undefined,
  fallback = 0
): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Convert major units (e.g., euros) to minor units (e.g., cents). */
export const toMinorUnits = (amountMajor: number): number =>
  Math.round(amountMajor * 100);

/** Convert minor units (e.g., cents) to major units (e.g., euros). */
export const fromMinorUnits = (amountMinor: number): number =>
  amountMinor / 100;

/** Standardized order date formatting. */
export function formatOrderDate(iso: string, locale: string = "en-GB"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
