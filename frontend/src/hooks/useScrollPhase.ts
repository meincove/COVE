"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useScrollContainer } from "./useScrollContainer";

type Phase = "top" | "mid" | "bottom";

interface Options {
  selector?: string;          // scroll container selector
  topThreshold?: number;      // px from very top to keep "top" phase
  bottomThreshold?: number;   // px from very bottom to enter "bottom" phase
  hysteresis?: number;        // px deadband to avoid flicker
}

/**
 * Tracks scrollTop/max/progress + stable phase buckets (top/mid/bottom).
 * Uses container scroll (not window). Freezes while menu is open.
 */
export function useScrollPhase(opts: Options = {}) {
  const {
    selector = ".tester-frame",
    topThreshold = 100,
    bottomThreshold = 100,
    hysteresis = 40,
  } = opts;

  const container = useScrollContainer(selector);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollMax, setScrollMax] = useState(1);
  const [phase, setPhase] = useState<Phase>("top");
  const rafLock = useRef(false);

  // simple gate: if html has class 'menu-open', freeze updates
  const isMenuOpen = useMemo(
    () => document.documentElement.classList.contains("menu-open"),
    [document.documentElement.className]
  );

  useEffect(() => {
    if (!container) return;

    const compute = () => {
      const st = container.scrollTop;
      const max = Math.max(1, container.scrollHeight - container.clientHeight);
      setScrollTop(st);
      setScrollMax(max);

      // hysteresis thresholds depend on current phase
      const topEnter  = topThreshold;
      const topLeave  = topThreshold + hysteresis;

      const bottomEnter = max - bottomThreshold;
      const bottomLeave = max - bottomThreshold - hysteresis;

      let next: Phase = phase;

      if (st <= (phase === "top" ? topEnter : topLeave)) {
        next = "top";
      } else if (st >= (phase === "bottom" ? bottomLeave : bottomEnter)) {
        next = "bottom";
      } else {
        next = "mid";
      }

      if (next !== phase) setPhase(next);
    };

    const onScroll = () => {
      if (rafLock.current || isMenuOpen) return;
      rafLock.current = true;
      requestAnimationFrame(() => {
        rafLock.current = false;
        compute();
      });
    };

    // initial
    compute();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, topThreshold, bottomThreshold, hysteresis]);

  const progress = Math.min(1, Math.max(0, scrollTop / scrollMax));

  return { phase, scrollTop, scrollMax, progress };
}
