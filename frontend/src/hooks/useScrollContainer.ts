"use client";

import { useEffect, useState } from "react";

/** Returns the scroll container element (default: .tester-frame). */
export function useScrollContainer(selector = ".tester-frame") {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const found = document.querySelector(selector) as HTMLElement | null;
    setEl(found ?? null);
  }, [selector]);

  return el;
}
