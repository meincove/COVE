
// "use client";

// import { useEffect, useState } from "react";
// import type React from "react";
// import { useScrollContainer } from "./useScrollContainer";

// /**
//  * Returns a 0–1 "local scroll progress" for a given element
//  * inside the `.tester-frame` scroll container.
//  *
//  * 0  => section is just entering from the bottom
//  * 1  => section has just left at the top
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

//       const crect = container.getBoundingClientRect();
//       const rect = el.getBoundingClientRect();

//       const viewportHeight = crect.height;

//       // position of section relative to container viewport
//       const sectionTop = rect.top - crect.top;

//       // when sectionBottom == viewportBottom -> start
//       const start = viewportHeight;
//       // when sectionTop == top - sectionHeight -> end
//       const end = -rect.height;

//       const t = (sectionTop - start) / (end - start);
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




// src/hooks/useElementScrollProgress.ts
"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useScrollContainer } from "./useScrollContainer";

/**
 * Returns a 0–1 "local scroll progress" for a given element
 * inside the `.tester-frame` scroll container.
 *
 * 0 => viewport top just reaches section top
 * 1 => viewport top has reached the point where section bottom
 *      aligns with viewport bottom
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

      const scrollTop = container.scrollTop;
      const viewH = container.clientHeight;

      const sectionTop = el.offsetTop;          // relative to container
      const sectionHeight = el.offsetHeight;

      // When viewport top is before section top → 0
      if (scrollTop <= sectionTop) {
        setValue(0);
        return;
      }

      // When viewport top has gone far enough that
      // the bottom of the section is at the bottom of the viewport
      const endScroll = sectionTop + sectionHeight - viewH;
      if (scrollTop >= endScroll) {
        setValue(1);
        return;
      }

      // Linear interpolation between these two points
      const t = (scrollTop - sectionTop) / (endScroll - sectionTop);
      const clamped = Math.max(0, Math.min(1, t));
      setValue(clamped);
    };

    handle(); // initial
    container.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);

    return () => {
      container.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [container, ref]);

  return value;
}
