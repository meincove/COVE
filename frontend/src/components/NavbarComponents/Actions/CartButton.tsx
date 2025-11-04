// src/components/NavbarComponents/Actions/CartButton.tsx
"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function CartButton() {
  return (
    <Link
      href="/checkout"
      aria-label="Cart"
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-white/90 hover:text-white hover:bg-white/5 transition"
    >
      <ShoppingBag className="h-5 w-5" />
    </Link>
  );
}
