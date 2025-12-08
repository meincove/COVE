// "use client";

// import { useEffect, useState } from "react";
// import { X } from "lucide-react";
// import { useCartStore } from "@/src/store/cartStore";

// type Props = {
//   open: boolean;
//   onClose: () => void;
// };

// type CartItem = {
//   id: string;
//   name: string;
//   variantId: string;
//   size: string;
//   colorName?: string;
//   quantity: number;
//   price: number;
//   imageUrl?: string;
// };

// type CartResponse = {
//   cartId: string;
//   items: CartItem[];
//   totals?: {
//     subtotal: number;
//     currency?: string;
//   };
// };

// export default function NavbarCartModal({ open, onClose }: Props) {
//   const { cartId } = useCartStore();
//   const [loading, setLoading] = useState(false);
//   const [data, setData] = useState<CartResponse | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!open || !cartId) return;

//     const controller = new AbortController();

//     async function load() {
//       setLoading(true);
//       setError(null);
//       try {
//         // hits your Next proxy /api/tools/cart which calls Django /tools/cart
//         const res = await fetch(
//           `/api/tools/cart?cartId=${encodeURIComponent(cartId)}`,
//           { signal: controller.signal }
//         );

//         if (!res.ok) {
//           throw new Error(`Cart fetch failed: ${res.status}`);
//         }

//         const json = (await res.json()) as CartResponse;
//         setData(json);
//       } catch (e: any) {
//         if (e.name !== "AbortError") {
//           setError(e.message ?? "Failed to load cart");
//         }
//       } finally {
//         setLoading(false);
//       }
//     }

//     load();
//     return () => controller.abort();
//   }, [open, cartId]);

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-[100] flex items-start justify-end bg-black/40 backdrop-blur-sm">
//       <div className="mt-16 mr-4 w-full max-w-sm rounded-2xl bg-zinc-900 text-white shadow-2xl border border-white/10">
//         <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
//           <div className="text-sm font-semibold">Your cart</div>
//           <button
//             onClick={onClose}
//             className="rounded-full p-1 hover:bg-white/10"
//           >
//             <X className="h-4 w-4" />
//           </button>
//         </div>

//         <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm">
//           {!cartId && (
//             <p className="text-xs text-white/60">
//               No active cart yet. Ask Cove AI to add something first.
//             </p>
//           )}

//           {cartId && loading && (
//             <p className="text-xs text-white/60">Loading cart…</p>
//           )}

//           {cartId && error && (
//             <p className="text-xs text-red-400">Error: {error}</p>
//           )}

//           {cartId && !loading && !error && data && data.items.length === 0 && (
//             <p className="text-xs text-white/60">Your cart is empty.</p>
//           )}

//           {cartId && !loading && !error && data && data.items.length > 0 && (
//             <ul className="space-y-3">
//               {data.items.map((item) => (
//                 <li
//                   key={item.id}
//                   className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
//                 >
//                   <div className="h-10 w-10 rounded-lg bg-white/10 overflow-hidden" />
//                   <div className="flex-1">
//                     <div className="text-xs font-medium">{item.name}</div>
//                     <div className="text-[11px] text-white/60">
//                       {item.colorName && <span>{item.colorName} · </span>}
//                       <span>Size {item.size}</span>
//                       <span> · Qty {item.quantity}</span>
//                     </div>
//                   </div>
//                   <div className="text-xs font-semibold">
//                     €{item.price.toFixed(2)}
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>

//         {data?.totals && (
//           <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs">
//             <span className="text-white/60">Subtotal</span>
//             <span className="font-semibold">
//               €{data.totals.subtotal.toFixed(2)}
//             </span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
