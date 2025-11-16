
// "use client";

// import { useElementScrollProgress } from "./useElementScrollProgress";

// export function useLocalScrollProgress(
//   ref: React.RefObject<HTMLDivElement | null>,
//   containerSelector: string = ".tester-frame",
//   _id?: string
// ) {
//   return useElementScrollProgress(ref, containerSelector);
// }


// src/hooks/useLocalScrollProgress.ts
"use client";

import type React from "react";
import { useElementScrollProgress } from "./useElementScrollProgress";

/**
 * Thin wrapper so sections can keep using the same API.
 *
 * We accept either <HTMLDivElement> or generic <HTMLElement> refs
 * and forward them into the main hook.
 */
export function useLocalScrollProgress(
  ref:
    | React.RefObject<HTMLElement | null>
    | React.RefObject<HTMLDivElement | null>,
  containerSelector: string = ".tester-frame",
  _id?: string
) {
  return useElementScrollProgress(
    ref as React.RefObject<HTMLElement | null>,
    containerSelector
  );
}
