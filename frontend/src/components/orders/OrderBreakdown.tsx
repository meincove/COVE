"use client";

function formatEUR(n: number | string | null | undefined) {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(v);
}

export type OrderMoneyish = {
  total_price: number | string;   // Decimal from API (e.g. "28.99")
  shipping_cost: number | string; // "9.00"
  tax_amount: number | string;    // "4.40"
};

export function OrderBreakdown({ order }: { order: OrderMoneyish }) {
  const total = Number(order.total_price ?? 0);
  const shipping = Number(order.shipping_cost ?? 0);
  const tax = Number(order.tax_amount ?? 0);

  // For **inclusive** pricing, Stripe's total already includes VAT.
  // A clean, Stripe-matching display is:
  // Subtotal (display) = Total - Shipping (info only)
  const subtotalDisplay = total - shipping;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatEUR(subtotalDisplay)}</span>
      </div>

      <div className="flex justify-between">
        <span>Shipping</span>
        <span>{formatEUR(shipping)}</span>
      </div>

      <div className="flex justify-between">
        <span>VAT</span>
        <span>{formatEUR(tax)}</span>
      </div>

      <div className="h-px bg-gray-200 my-2" />

      <div className="flex justify-between font-semibold text-base">
        <span>Total</span>
        <span>{formatEUR(total)}</span>
      </div>
    </div>
  );
}
