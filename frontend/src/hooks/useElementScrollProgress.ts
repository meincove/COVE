// src/hooks/useElementScrollProgress.ts
"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useScrollContainer } from "./useScrollContainer";

/**
 * Compute the offsetTop of `el` **relative to** the scroll container,
 * even if there are other positioned ancestors in between.
 */
function getOffsetTopWithin(el: HTMLElement, container: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;

  while (node && node !== container) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  return top;
}

/**
 * Returns a 0–1 "local scroll progress" for a given element
 * inside the `.tester-frame` scroll container.
 *
 * local = 0 → viewport top is at the section's top
 * local = 1 → viewport top reached the point where the section's
 *             bottom aligns with the viewport bottom.
 *
 * This gives you a clean timeline for scrollytelling sections
 * that use a sticky stage inside.
 */
export function useElementScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  selector: string = ".tester-frame"
): number {
  const container = useScrollContainer(selector);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!container || !ref.current) return;

    const el = ref.current;

    const handle = () => {
      if (!el) return;

      const viewH = container.clientHeight;
      const scrollTop = container.scrollTop;

      // Section top measured in the scroll container's coordinate system
      const sectionTop = getOffsetTopWithin(el, container);
      const sectionHeight = el.offsetHeight;

      // When the viewport top is at the section's top
      const start = sectionTop;

      // When the viewport top has advanced so that the section's
      // bottom is aligned with the viewport bottom
      const end = sectionTop + sectionHeight - viewH;

      // Degenerate case (very small sections)
      if (end <= start) {
        setValue(scrollTop >= start ? 1 : 0);
        return;
      }

      if (scrollTop <= start) {
        setValue(0);
        return;
      }

      if (scrollTop >= end) {
        setValue(1);
        return;
      }

      const t = (scrollTop - start) / (end - start);
      const clamped = Math.max(0, Math.min(1, t));
      setValue(clamped);
    };

    // Initial
    handle();

    container.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);

    return () => {
      container.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [container, ref]);

  return value;
}




// // src/hooks/useElementScrollProgress.ts
// "use client";

// import { useEffect, useState } from "react";
// import type React from "react";
// import { useScrollContainer } from "./useScrollContainer";

// /**
//  * Returns a 0–1 "local scroll progress" for a given element
//  * inside the `.tester-frame` scroll container.
//  *
//  * 0 => viewport top just reaches section top
//  * 1 => viewport top has reached the point where section bottom
//  *      aligns with viewport bottom
//  */
// export function useElementScrollProgress(
//   ref: React.RefObject<HTMLElement | null>,
//   selector: string = ".tester-frame"
// ): number {
//   const container = useScrollContainer(selector);
//   const [value, setValue] = useState(0);

//   useEffect(() => {
//     if (!container || !ref.current) return;
//     const el = ref.current;

//     const handle = () => {
//       if (!el) return;

//       const scrollTop = container.scrollTop;
//       const viewH = container.clientHeight;

//       const sectionTop = el.offsetTop;          // relative to container
//       const sectionHeight = el.offsetHeight;

//       // When viewport top is before section top → 0
//       if (scrollTop <= sectionTop) {
//         setValue(0);
//         return;
//       }

//       // When viewport top has gone far enough that
//       // the bottom of the section is at the bottom of the viewport
//       const endScroll = sectionTop + sectionHeight - viewH;
//       if (scrollTop >= endScroll) {
//         setValue(1);
//         return;
//       }

//       // Linear interpolation between these two points
//       const t = (scrollTop - sectionTop) / (endScroll - sectionTop);
//       const clamped = Math.max(0, Math.min(1, t));
//       setValue(clamped);
//     };

//     handle(); // initial
//     container.addEventListener("scroll", handle);
//     window.addEventListener("resize", handle);

//     return () => {
//       container.removeEventListener("scroll", handle);
//       window.removeEventListener("resize", handle);
//     };
//   }, [container, ref]);

//   return value;
// }
