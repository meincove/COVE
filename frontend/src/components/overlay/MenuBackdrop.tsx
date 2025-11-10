"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMenuOverlay } from "./useMenuOverlay";

export default function MenuBackdrop() {
  const { isOpen } = useMenuOverlay();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="menu-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // 🔑 Full-screen, BEHIND the frame
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0, // behind the page frame which will be zIndex:1
            background: "#111827", // slate-900 base
          }}
        >
          {/* Put your menu content here later */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              right: 24,
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              color: "white",
              fontWeight: 600,
            }}
          >
            <div>Menu (backdrop)</div>
            {/* we’ll wire actions later */}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
