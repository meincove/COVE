// src/components/NavbarComponents/MobileMenu.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import { NAV_LINKS } from "./constants";

export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 top-0 z-[61] h-full w-[84%] max-w-sm bg-black text-white p-4 shadow-2xl border-r border-white/10"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg tracking-wide">COVE</div>
              <button aria-label="Close menu" onClick={onClose} className="rounded-md p-1 hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 grid gap-2">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={onClose} className="rounded-xl px-3 py-2 hover:bg-white/5">
                  {l.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
