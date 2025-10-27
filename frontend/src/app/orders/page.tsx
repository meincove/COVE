// src/app/orders/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getOrCreateGuestId } from "@/utils/guest";
import { formatCurrency, parsePrice, formatOrderDate } from "@/utils/money";
import type { Order} from "@/types/orders";
import { getJson } from "@/utils/api";
import LoadingState from "@/src/components/ui/LoadingState";
import ErrorState from "@/src/components/ui/ErrorState";
import EmptyState from "@/src/components/ui/EmptyState";
import { shortenId, statusChipClasses } from "@/utils/orders";



const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// ---------- helpers ----------



function toNum(v?: number | string | null) {
  if (v == null) return 0;
  return typeof v === "string" ? parseFloat(v) : v;
}

// Stripe-derived helpers
function stripeTotal(o: Order) {
  // If your API exposes total_price (Decimal as string/number), use it first.
  const t = toNum((o as any).total_price);
  if (t > 0) return t;

  // Back-compat: if you still return total_with_shipping_and_tax, use it.
  const legacy = toNum((o as any).total_with_shipping_and_tax);
  if (legacy > 0) return legacy;

  // Last resort (should be rare)
  return toNum(o.shipping_cost) + toNum(o.tax_amount);
}

function stripeShipping(o: Order) {
  return toNum((o as any).shipping_cost);
}

function stripeTax(o: Order) {
  return toNum((o as any).tax_amount);
}

// For tax-inclusive pricing: Subtotal (display) = Total − Shipping
function stripeSubtotalDisplay(o: Order) {
  const total = stripeTotal(o);
  const shipping = stripeShipping(o);
  return Math.max(0, total - shipping);
}



// ---------- page ----------
export default function OrdersPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ type: "clerk" | "guest"; id: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Choose identifier (Clerk or guest)
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user?.id) {
      setIdentity({ type: "clerk", id: user.id });
    } else {
      const guestId = getOrCreateGuestId();
      setIdentity({ type: "guest", id: guestId });
    }
  }, [isLoaded, isSignedIn, user?.id]);

  // Fetch orders
 const fetchOrders = useCallback(
  async (signal?: AbortSignal) => {
    if (!identity) return;
    try {
      setError(null);
      setOrders(null);

      const url =
        identity.type === "clerk"
          ? `${API_BASE}/api/orders/mine/?clerkUserId=${encodeURIComponent(identity.id)}`
          : `${API_BASE}/api/orders/mine/?guestSessionId=${encodeURIComponent(identity.id)}`;

      const data = await getJson<Order[]>(url, {
        headers: { "Content-Type": "application/json" },
        signal,
      });

      setOrders(data ?? []);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to load orders");
      setOrders([]);
    }
  },
  [identity]
);


  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    fetchOrders(controller.signal);
    return () => controller.abort();
  }, [identity, refreshKey, fetchOrders]);

  const subtitle = useMemo(() => {
    if (!identity) return "";
    if (identity.type === "clerk") {
      return `Signed in as ${
        user?.primaryEmailAddress?.emailAddress || user?.username || user?.id
      }`;
    }
    return `Guest session: ${identity.id}`;
  }, [identity, user]);

  const onRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <main className="min-h-screen bg-white text-black px-6 py-10 max-w-5xl mx-auto">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => router.back()}
          >
            Back
          </button>
          <button
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* states */}
      {!identity || !isLoaded ? (
        <p className="text-gray-600">Loading…</p>
      ) : error ? (
        <ErrorState
    title="Couldn’t load your orders"
    message={error}
    onRetry={onRefresh}
  />
      ) : orders === null ? (
        <LoadingState title="Loading your orders" rows={3} />
      ) : orders.length === 0 ? (
         <EmptyState
    title="No orders found."
    message="Browse the catalog to get started."
    actionHref="/catalog"
    actionLabel="Go shopping →"
  />
      ) : (
        <div className="space-y-6">
          {orders.map((o) => {
            return (
              <div
                key={o.id}
                className="border rounded-2xl p-4 hover:border-gray-400 transition-colors"
              >
                {/* header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{shortenId(o.id)}</div>
                  <div className="text-sm text-gray-600">
                    {formatOrderDate(o.created_at)}
                  </div>
                </div>

                {/* status chips */}
                <div className="mt-1 text-sm flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border ${statusChipClasses(o.status)}`}>
                    {o.status}
                  </span>
                  {o.inventory_decremented && (
                    <span className="px-2 py-0.5 rounded-full border border-blue-400 text-blue-600">
                      Stock locked
                    </span>
                  )}
                  {o.receipt_emailed && (
                    <span className="px-2 py-0.5 rounded-full border border-purple-400 text-purple-600">
                      Receipt emailed
                    </span>
                  )}
                </div>

                {/* items */}
                <div className="mt-4 space-y-3">
                  {o.items?.length ? (
                    o.items.map((it) => {
                      const unit = parsePrice(it.price);
                      const line = unit * (it.quantity || 0);
                      return (
                        <div key={it.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{it.variant_id}</div>
                            <div className="text-gray-600">
                              Size {it.size} · {it.color || "—"} · x{it.quantity}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(line)}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(unit)} each</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-600">No items recorded.</div>
                  )}
                </div>

                {/* pricing breakdown */}
{/* pricing breakdown (Stripe as source of truth) */}
<div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
  <div className="flex items-center justify-between">
    <span className="text-gray-600">Subtotal</span>
    <span className="font-medium">{formatCurrency(stripeSubtotalDisplay(o))}</span>
  </div>
  <div className="mt-1 flex items-center justify-between">
    <span className="text-gray-600">Shipping</span>
    <span className="font-medium">{formatCurrency(stripeShipping(o))}</span>
  </div>
  <div className="mt-1 flex items-center justify-between">
    <span className="text-gray-600">VAT</span>
    <span className="font-medium">{formatCurrency(stripeTax(o))}</span>
  </div>
  <div className="mt-2 border-t pt-2 flex items-center justify-between">
    <span className="text-gray-800">Total</span>
    <span className="font-semibold">{formatCurrency(stripeTotal(o))}</span>
  </div>
</div>



{/* shipping address (optional) */}
{(o.shipping_name || o.shipping_address_line1) && (
  <div className="mt-4 rounded-xl border p-3 text-sm">
    <div className="mb-1 font-medium">Ship to</div>
    <div className="text-gray-700">
      {o.shipping_name && <div>{o.shipping_name}</div>}
      {o.shipping_address_line1 && <div>{o.shipping_address_line1}</div>}
      {o.shipping_address_line2 && <div>{o.shipping_address_line2}</div>}
      {(o.shipping_city || o.shipping_state || o.shipping_postal_code) && (
        <div>
          {[o.shipping_city, o.shipping_state, o.shipping_postal_code]
            .filter(Boolean)
            .join(" ")}
        </div>
      )}
      {o.shipping_country && <div>{o.shipping_country}</div>}
    </div>
  </div>
)}

                {/* footer row */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div className="text-xs text-gray-500">
                    {o.clerk_user_id ? "Clerk" : o.guest_session_id ? "Guest" : "Unknown"} order
                    {o.user_email ? ` • ${o.user_email}` : ""}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-500 mr-1">Total:</span>
                      <span className="font-semibold">{formatCurrency(stripeTotal(o))}</span>
                    </div>
                    <button
                      className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      disabled
                      title="Coming soon"
                    >
                      Request Refund
                    </button>
                    <Link
                      href="/catalog"
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Shop more
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}




// "use client";

// import { useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useUser } from "@clerk/nextjs";
// import { getOrCreateGuestId } from "@/utils/guest";

// type OrderItem = {
//   id: number;
//   product_id: string;
//   variant_id: string;
//   size: string;
//   color: string;
//   quantity: number;
//   price: number | string;
//   user_email?: string | null;
// };

// type Order = {
//   id: number;
//   status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
//   payment_intent_id: string;
//   created_at: string;
//   clerk_user_id?: string | null;
//   guest_session_id?: string | null;
//   user_email?: string | null;
//   inventory_decremented: boolean;
//   receipt_emailed: boolean;
//   items: OrderItem[];
// };

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// export default function OrdersPage() {
//   const { isLoaded, isSignedIn, user } = useUser();
//   const [orders, setOrders] = useState<Order[] | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [identity, setIdentity] = useState<{ type: "clerk" | "guest"; id: string } | null>(null);

//   // decide which identifier to use
//   useEffect(() => {
//     if (!isLoaded) return;
//     if (isSignedIn && user?.id) {
//       setIdentity({ type: "clerk", id: user.id });
//     } else {
//       const guestId = getOrCreateGuestId();
//       setIdentity({ type: "guest", id: guestId });
//     }
//   }, [isLoaded, isSignedIn, user?.id]);

//   // fetch orders
//   useEffect(() => {
//     if (!identity) return;
//     const controller = new AbortController();

//     const url =
//       identity.type === "clerk"
//         ? `${API_BASE}/api/orders/mine/?clerkUserId=${encodeURIComponent(identity.id)}`
//         : `${API_BASE}/api/orders/mine/?guestSessionId=${encodeURIComponent(identity.id)}`;

//     (async () => {
//       try {
//         setError(null);
//         setOrders(null);
//         const res = await fetch(url, { signal: controller.signal });
//         if (!res.ok) throw new Error(`Request failed: ${res.status}`);
//         const data = (await res.json()) as Order[];
//         setOrders(data);
//       } catch (e: any) {
//         if (e.name !== "AbortError") setError(e.message || "Failed to load orders");
//       }
//     })();

//     return () => controller.abort();
//   }, [identity]);

//   const subtitle = useMemo(() => {
//     if (!identity) return "";
//     if (identity.type === "clerk")
//       return `Signed in as ${user?.primaryEmailAddress?.emailAddress || user?.username || user?.id}`;
//     return `Guest session: ${identity.id}`;
//   }, [identity, user]);

//   return (
//     <main className="min-h-screen bg-white text-black px-6 py-10 max-w-4xl mx-auto">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold">My Orders</h1>
//         <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
//       </div>

//       {!identity || !isLoaded ? (
//         <p className="text-gray-600">Loading…</p>
//       ) : error ? (
//         <div className="text-red-600">Error: {error}</div>
//       ) : orders === null ? (
//         <p className="text-gray-600">Loading your orders…</p>
//       ) : orders.length === 0 ? (
//         <div className="text-gray-700">
//           <p>No orders found.</p>
//           <Link href="/catalog" className="underline mt-2 inline-block">
//             Go shopping →
//           </Link>
//         </div>
//       ) : (
//         <div className="space-y-6">
//           {orders.map((o) => (
//             <div key={o.id} className="border rounded-2xl p-4">
//               <div className="flex flex-wrap items-center justify-between gap-2">
//                 <div className="font-semibold">Order #{o.id}</div>
//                 <div className="text-sm text-gray-600">
//                   {new Date(o.created_at).toLocaleString()}
//                 </div>
//               </div>
//               <div className="mt-1 text-sm">
//                 <span className="px-2 py-0.5 rounded-full border">{o.status}</span>
//                 {o.inventory_decremented && (
//                   <span className="ml-2 px-2 py-0.5 rounded-full border">Stock locked</span>
//                 )}
//                 {o.receipt_emailed && (
//                   <span className="ml-2 px-2 py-0.5 rounded-full border">Receipt emailed</span>
//                 )}
//               </div>

//               {/* items */}
//               <div className="mt-4 space-y-3">
//                 {o.items?.length ? (
//                   o.items.map((it) => (
//                     <div key={it.id} className="flex items-center justify-between text-sm">
//                       <div className="truncate">
//                         <div className="font-medium">{it.variant_id}</div>
//                         <div className="text-gray-600">
//                           Size {it.size} · {it.color || "—"} · x{it.quantity}
//                         </div>
//                       </div>
//                       <div>€ {Number(it.price).toFixed(2)}</div>
//                     </div>
//                   ))
//                 ) : (
//                   <div className="text-sm text-gray-600">No items recorded.</div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </main>
//   );
// }
