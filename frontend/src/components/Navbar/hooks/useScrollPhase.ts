"use client";
import { useEffect, useRef, useState } from "react";

/** Returns 'top' (full) or 'scrolled' (island) + current scrollTop.
 * Uses hysteresis: go down at 80px, come back at 24px.
 */
export function useScrollPhase(containerSelector = ".tester-frame") {
  const [phase, setPhase] = useState<"top" | "scrolled">("top");
  const [y, setY] = useState(0);
  const goingDownAt = 80; // switch to island when >= 80
  const goingUpAt = 24;   // switch back to full when <= 24
  const raf = useRef(0);

  useEffect(() => {
    const el = document.querySelector(containerSelector) as HTMLElement | null;
    if (!el) return;

    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const cur = el.scrollTop;
        setY(cur);

        setPhase(prev =>
          prev === "top"
            ? (cur >= goingDownAt ? "scrolled" : "top")
            : (cur <= goingUpAt ? "top" : "scrolled")
        );
      });
    };

    onScroll(); // initialize
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener("scroll", onScroll);
    };
  }, [containerSelector]);

  return { phase, y };
}
