// src/components/NavbarComponents/useIslandTrigger.ts
"use client";

import { useEffect, useState } from "react";
import { ISLAND_THRESHOLD } from "./constants";

// Observes #hero if present; else uses window scroll threshold.
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
