"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCartStore } from "@/src/store/cartStore"; 

interface CartModalProps {
  open: boolean;
  onClose: () => void;
}

function formatPrice(value: number) {
  return `€${value.toFixed(2)}`;
}

export default function CartModal({ open, onClose }: CartModalProps) {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCartStore();

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  const handleCheckout = () => {
    onClose();
    router.push("/checkoutpage");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cart-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="
            fixed inset-0 z-[90]
            flex items-center justify-center
            bg-black/55 backdrop-blur-sm
          "
          onClick={onClose}
        >
          {/* Centered modal card */}
          <motion.div
            key="cart-modal"
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="
              relative
              w-[95vw] max-w-xl
              max-h-[80vh]
              rounded-3xl
              bg-slate-950
              text-slate-50
              border border-slate-800/70
              shadow-[0_28px_80px_rgba(0,0,0,0.75)]
              flex flex-col
              overflow-hidden
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-medium tracking-[0.18em] uppercase text-slate-300">
                <ShoppingBag className="w-4 h-4" />
                <span>Cart</span>
                <span className="text-slate-500 text-[11px]">
                  ({itemCount})
                </span>
              </div>

              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-200 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ITEMS LIST */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-sm text-slate-400">
                  <p>Your cart is empty.</p>
                  <p className="text-[11px] mt-1 text-slate-500">
                    Add items from the catalog or via Cove AI.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={`${item.variantId}-${item.size}`}
                    className="flex items-center gap-3 rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-3"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-slate-800/70 flex-shrink-0">
                      <Image
                        src={item.imageUrl || "/clothing-images/placeholder.png"}
                        alt={item.name}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.tier} · {item.type}
                          </p>
                        </div>
                        <p className="text-[13px] font-semibold">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Size <span className="font-semibold">{item.size}</span>{" "}
                          · <span>{item.colorName}</span>
                        </span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.variantId, item.size)}
                      className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-red-400 flex-shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-800/80 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-semibold">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={items.length === 0}
                  className="
                    flex-1 py-2.5 rounded-full border border-slate-700
                    text-xs font-medium text-slate-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-slate-800/80 transition
                  "
                >
                  Clear cart
                </button>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                  className="
                    flex-1 py-2.5 rounded-full
                    bg-slate-50 text-slate-950
                    text-xs font-semibold
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-white transition
                  "
                >
                  View checkout
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
