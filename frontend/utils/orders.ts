// src/utils/orders.ts

/**
 * Shortens numeric or string IDs to a readable form (e.g., "#123456").
 */
export function shortenId(id: number | string, prefix = "#"): string {
  const s = String(id);
  return `${prefix}${s.length > 6 ? s.slice(-6) : s}`;
}

/**
 * Returns Tailwind classes for a status chip depending on order status.
 */
export function statusChipClasses(status: string): string {
  const s = status.toUpperCase();
  if (s === "PAID") return "border-green-500 text-green-600";
  if (s === "PENDING") return "border-amber-500 text-amber-600";
  if (s === "FAILED" || s === "REFUNDED") return "border-red-500 text-red-600";
  return "border-gray-500 text-gray-600";
}
