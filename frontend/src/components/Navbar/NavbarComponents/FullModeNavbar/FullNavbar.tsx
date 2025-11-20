"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useNavbarMode } from "../../NavbarController";
import { useCartStore } from "@/src/store/cartStore";
import CartModal from "@/src/components/Catalog/CartModal";

export default function FullNavbar() {
  const { setMode } = useNavbarMode();
  const [cartOpen, setCartOpen] = useState(false);

  const { items } = useCartStore();
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <>
      <div className="nav-stick w-full">
        <div className="nav-shell w-full">
          <div className="mx-auto max-w-screen-2xl px-4">
            <div className="h-16 flex items-center justify-between">
              {/* Left: brand / mode label */}
              <div className="text-sm font-semibold tracking-[0.18em] uppercase">
                Full • Cove
              </div>

              {/* Right: controls */}
              <div className="flex items-center gap-3">
                {/* Cart button */}
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="
                    relative
                    flex items-center gap-2
                    rounded-full
                    bg-black/5 hover:bg-black/10
                    px-3 py-1.5
                    text-xs font-medium
                  "
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Cart</span>
                  <span
                    className="
                      inline-flex items-center justify-center
                      min-w-[20px] h-5
                      rounded-full
                      bg-black text-white
                      text-[11px] px-1.5
                    "
                  >
                    {itemCount}
                  </span>
                </button>

                {/* Mode toggles */}
                <button
                  className="px-3 py-1 rounded-full bg-black/5 text-xs"
                  onClick={() => setMode("island")}
                >
                  → Island
                </button>
                <button
                  className="px-3 py-1 rounded-full bg-black/5 text-xs"
                  onClick={() => setMode("menu")}
                >
                  Open Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Centered cart modal */}
      <CartModal open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
