"use client";

import { useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useCartStore } from "@/src/store/cartStore";

export default function CartButton() {
  const { cartId } = useCartStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Icon button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center justify-center rounded-full border border-white/40 bg-black/40 px-3 py-2 text-xs text-white shadow-sm hover:bg-white/10 transition"
      >
        <ShoppingBag className="h-4 w-4" />

        {/* tiny green dot when we have a cartId */}
        {cartId && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
        )}
      </button>

      {/* Inline modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="mt-16 mr-4 w-full max-w-sm rounded-2xl bg-zinc-900 text-white shadow-2xl border border-white/10">
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-sm font-semibold">Your cart</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* body */}
            <div className="px-4 py-3 text-sm max-h-[60vh] overflow-y-auto">
              {!cartId && (
                <p className="text-xs text-white/60">
                  No active cart yet. Ask Cove AI to add something first.
                </p>
              )}

              {cartId && (
                <p className="text-xs text-white/60">
                  Cart ID: <span className="font-mono">{cartId}</span>
                  <br />
                  (Backend `/api/tools/cart?cartId=...` hook can be wired
                  next.)
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
