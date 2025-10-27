"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { createCheckoutSession } from "@/src/lib/api/payments";
import { useCartStore } from "@/src/store/cartStore";
import { getOrCreateGuestId } from "@/utils/guest";
import { RegionCountryPicker, RegionCountryValue } from "@/src/components/checkout/RegionCountryPicker";

export function CheckoutButton({ className }: { className?: string }) {
  const items = useCartStore((s) => s.items);
  const { isSignedIn, user } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Region + country combined state (default EU + Germany)
  const [dest, setDest] = React.useState<RegionCountryValue>({ region: "EU", country: "DE" });

  // TODO: replace with real sum if you track per-item weights
  const totalWeightGrams = 0;

  async function onClick() {
    setErr(null);
    if (!items?.length) {
      setErr("Your cart is empty.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: items.map((it) => ({
          variantId: String(it.variantId),
          size: it.size as "S" | "M" | "L" | "XL",
          quantity: Number(it.quantity),
        })),
        country: dest.country,          // ✅ from picker
        totalWeightGrams,               // ✅ optional (0 for now)
        clerkUserId: isSignedIn ? user?.id ?? null : null,
        guestSessionId: isSignedIn ? null : getOrCreateGuestId(),
        customer_email: isSignedIn ? user?.primaryEmailAddress?.emailAddress ?? null : null,
        first_name: isSignedIn ? user?.firstName ?? null : null,
        last_name: isSignedIn ? user?.lastName ?? null : null,
      } as const;

      console.log("Sending checkout payload:", payload);
      const { url } = await createCheckoutSession(payload);
      window.location.assign(url);
    } catch (e: any) {
      setErr(e?.message ?? "Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <RegionCountryPicker
        value={dest}
        onChange={setDest}
        disabled={loading}
        className="mb-3"
      />

      <button
        onClick={onClick}
        disabled={loading}
        className="w-full mt-1 py-4 bg-black text-white font-bold rounded-full disabled:opacity-60"
      >
        {loading ? "Redirecting to Stripe…" : "Checkout"}
      </button>

      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
