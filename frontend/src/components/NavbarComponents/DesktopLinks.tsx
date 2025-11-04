// src/components/NavbarComponents/DesktopLinks.tsx
"use client";

import Link from "next/link";
import { NAV_LINKS } from "./constants";

export default function DesktopLinks() {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-2xl px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/5 transition"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
