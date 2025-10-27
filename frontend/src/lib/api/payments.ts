// cove-frontend/src/lib/api/payments.ts

export type CheckoutItem = {
  variantId: string;
  size: "S" | "M" | "L" | "XL";
  quantity: number;
};

export type CreateCheckoutSessionPayload = {
  items: CheckoutItem[];

  // NEW: shipping inputs for zone-based pricing
  country?: string; // ISO-2 ("DE", "FR", "US", "IN", ...)
  shippingSpeed?: "standard" | "express";
  totalWeightGrams?: number;

  // Existing identity/contact
  clerkUserId: string | null;
  guestSessionId: string | null;
  customer_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type CreateCheckoutSessionResponse = {
  id: string;   // Stripe Checkout Session id
  url: string;  // Stripe-hosted redirect URL
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;
if (!API_BASE) {
  // Helpful during dev if env is missing
  // eslint-disable-next-line no-console
  console.warn("NEXT_PUBLIC_API_BASE is not set");
}

export async function createCheckoutSession(
  payload: CreateCheckoutSessionPayload,
  opts?: { signal?: AbortSignal }
): Promise<CreateCheckoutSessionResponse> {
  const res = await fetch(`${API_BASE}/api/payments/create-checkout-session/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload), // ✅ forward everything (country, shippingSpeed, weight, etc.)
    signal: opts?.signal,
    credentials: "omit",
    cache: "no-store",
  });

  if (res.status === 429) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Too many checkout attempts (429). Please wait and try again. ${detail || ""}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Checkout session error (${res.status}). ${text || "Please try again."}`);
  }

  return (await res.json()) as CreateCheckoutSessionResponse;
}
