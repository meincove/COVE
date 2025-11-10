
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ISLAND_THRESHOLD } from "@/src/components/NavbarComponents/constants";

/** Auto island trigger from hero/scroll */
export function useIslandTrigger(targetId = "hero", threshold = ISLAND_THRESHOLD) {
  const [isIsland, setIsIsland] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);

    if (el && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const ratio = entries[0]?.intersectionRatio ?? 0;
          setIsIsland(ratio < threshold);
        },
        { threshold: [0, threshold, 1] }
      );
      io.observe(el);
      return () => io.disconnect();
    }

    const onScroll = () => setIsIsland(window.scrollY > window.innerHeight * threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [targetId, threshold]);

  return isIsland;
}

/* ---------------------- Island Menu global store ---------------------- */

let __menuOpen = false;
const __subs = new Set<() => void>();
const notify = () => __subs.forEach((fn) => fn());
function subscribe(fn: () => void) { __subs.add(fn); return () => __subs.delete(fn); }
const getSnapshot = () => __menuOpen;

/** Global hook to control the “shrink frame” island menu. */
export function useIslandMenu() {
  // 👇 add SSR-safe getServerSnapshot
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const open = () => { if (!__menuOpen) { __menuOpen = true;  notify(); } };
  const close = () => { if (__menuOpen)  { __menuOpen = false; notify(); } };
  const toggle = () => { __menuOpen = !__menuOpen; notify(); };

  // Window event API (so any component can control the menu)
  useEffect(() => {
    const onToggle = () => toggle();
    const onOpen   = () => open();
    const onClose  = () => close();
    window.addEventListener("cove:island:menu:toggle", onToggle);
    window.addEventListener("cove:island:menu:open",   onOpen);
    window.addEventListener("cove:island:menu:close",  onClose);
    return () => {
      window.removeEventListener("cove:island:menu:toggle", onToggle);
      window.removeEventListener("cove:island:menu:open",   onOpen);
      window.removeEventListener("cove:island:menu:close",  onClose);
    };
  }, []);

  return { isOpen, open, close, toggle };
}


