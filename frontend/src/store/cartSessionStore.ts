"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type CartSessionState = {
  cartId: string | null;
  guestSessionId: string | null;
  setCartId: (id: string | null) => void;
  setGuestSessionId: (id: string | null) => void;
  ensureGuestSessionId: () => string;
  resetSession: () => void;
};

function makeGuestId() {
  // simple stable guest id generator
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest_${crypto.randomUUID()}`;
  }
  return `guest_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const useCartSessionStore = create<CartSessionState>()(
  persist(
    (set, get) => ({
      cartId: null,
      guestSessionId: null,

      setCartId: (id) => set({ cartId: id }),

      setGuestSessionId: (id) => set({ guestSessionId: id }),

      ensureGuestSessionId: () => {
        const existing = get().guestSessionId;
        if (existing) return existing;

        const newId = makeGuestId();
        set({ guestSessionId: newId });
        return newId;
      },

      resetSession: () => set({ cartId: null, guestSessionId: null }),
    }),
    {
      name: "cove_guest_session", // unique name
    }
  )
);
