"use client";

import { create } from "zustand";

type CartState = {
  cartId: string | null;
  guestSessionId: string | null;
  setCartId: (id: string | null) => void;
  setGuestSessionId: (id: string | null) => void;
};

export const useCartStore = create<CartState>((set) => ({
  cartId: null,
  guestSessionId: null,
  setCartId: (id) => set({ cartId: id }),
  setGuestSessionId: (id) => set({ guestSessionId: id }),
}));
