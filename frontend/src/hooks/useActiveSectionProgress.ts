"use client";

import { useEffect, useState } from "react";

type State = {
  index: number;    // 0-based active section index
  progress: number; // 0..1 inside that section
};

/**
 * Tracks which [data-scroll-section] is "closest" to the viewport center
 * inside the .tester-frame container, and gives you a 0..1 progress in that section.
 */
export function useActiveSectionProgress(
  selector = ".tester-frame"
): State {
  const [state, setState] = useState<State>({ index: 0, progress: 0 });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const container = document.querySelector(selector) as HTMLElement | null;
    if (!container) return;

    const sections = Array.from(
      container.querySelectorAll<HTMLElement>("[data-scroll-section]")
    );
    if (!sections.length) return;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const viewport = container.clientHeight;
      const viewportCenter = scrollTop + viewport / 2;

      // 1) pick the section whose center is closest to viewport center
      let activeIdx = 0;
      let best = Infinity;

      sections.forEach((sec, i) => {
        const center = sec.offsetTop + sec.offsetHeight / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < best) {
          best = dist;
          activeIdx = i;
        }
      });

      const sec = sections[activeIdx];
      const start = sec.offsetTop - viewport;
      const end = sec.offsetTop + sec.offsetHeight;
      const raw = (scrollTop - start) / (end - start);
      const progress = Math.max(0, Math.min(1, raw));

      setState({ index: activeIdx, progress });
    };

    onScroll(); // initial
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [selector]);

  return state;
}
