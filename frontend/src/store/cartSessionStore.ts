// frontend/src/store/cartSessionStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartSessionState = {
  cartId: string | null;
  guestSessionId: string | null;
  setCartId: (id: string | null) => void;
  setGuestSessionId: (id: string | null) => void;
  ensureGuestSessionId: () => string;
};

function generateGuestSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export const useCartSessionStore = create<CartSessionState>()(
  persist(
    (set, get) => ({
      cartId: null,
      guestSessionId: null,
      setCartId: (id) => set({ cartId: id }),
      setGuestSessionId: (id) => set({ guestSessionId: id }),
      ensureGuestSessionId: () => {
        const current = get().guestSessionId;
        if (current) return current;
        const fresh = generateGuestSessionId();
        set({ guestSessionId: fresh });
        return fresh;
      },
    }),
    {
      name: "cove-cart-session", // key in localStorage
    }
  )
);
