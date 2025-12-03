"use client";

import { AnimatePresence, motion } from "framer-motion";

type ScrollLockNotificationProps = {
  /** Show / hide the notification */
  visible: boolean;
};

export default function ScrollLockNotification({
  visible,
}: ScrollLockNotificationProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // Full-screen layer that does NOT block clicks (pointer-events-none)
          className="pointer-events-none fixed inset-0 z-[230] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            // The card itself – still pointer-events-none so navbar remains fully clickable
            className="pointer-events-none rounded-2xl bg-white/90 backdrop-blur-xl px-6 py-4 shadow-2xl border border-black/5"
            initial={{ y: 18, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, scale: 0.96, opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 0.84, 0.44, 1],
            }}
          >
            <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-800 uppercase text-center mb-1">
              Scroll Locked
            </p>
            <p className="text-sm text-neutral-600 text-center">
              Menu mode is active. Close the menu to scroll the page.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
