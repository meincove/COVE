// src/hooks/useFrameScrollProgress.ts
"use client";

import { useEffect, useState } from "react";
import { useScrollContainer } from "./useScrollContainer";

/**
 * Global scroll progress for the .tester-frame container.
 * Returns 0 at very top, 1 at very bottom.
 */
export function useFrameScrollProgress(selector = ".tester-frame"): number {
  const container = useScrollContainer(selector);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!container) return;

    const handle = () => {
      const max = container.scrollHeight - container.clientHeight;
      const v = max > 0 ? container.scrollTop / max : 0;
      setValue(v);
    };

    // initial value
    handle();

    container.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);

    return () => {
      container.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [container]);

  return value;
}
