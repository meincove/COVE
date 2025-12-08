// src/components/NavbarComponents/Brand.tsx
"use client";

import Link from "next/link";

export default function Brand() {
  return (
    <Link
      href="/"
      aria-label="Cove Home"
      className="font-semibold tracking-[0.2em] text-white text-sm md:text-base"
    >
      COVE
    </Link>
  );
}
