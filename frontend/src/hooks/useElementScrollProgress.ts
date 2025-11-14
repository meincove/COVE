// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useScrollContainer } from "./useScrollContainer";

// /**
//  * 0..1 progress for an element inside the scroll container:
//  *  - 0 when the element's top aligns with the container's top (entering),
//  *  - 1 when the element's bottom aligns with the container's bottom (leaving).
//  * Good for parallax/section fades.
//  */
// export function useElementScrollProgress(
//   targetRef: React.RefObject<HTMLElement>,
//   selector = ".tester-frame"
// ) {
//   const container = useScrollContainer(selector);
//   const [progress, setProgress] = useState(0);
//   const raf = useRef(0);

//   useEffect(() => {
//     if (!container || !targetRef.current) return;
//     const el = targetRef.current;

//     const update = () => {
//       cancelAnimationFrame(raf.current);
//       raf.current = requestAnimationFrame(() => {
//         // Compute positions relative to container scroll offsets—
//         // robust to transforms and avoids window metrics.
//         const containerTop = container.scrollTop;
//         const containerHeight = container.clientHeight;

//         // Absolute distance from container's content start:
//         const elTop = el.offsetTop;
//         const elHeight = el.offsetHeight;

//         // when elTop == containerTop + containerHeight  -> just fully below
//         // Map so that progress 0 when top meets top, 1 when bottom meets bottom:
//         const start = elTop - containerTop;                 // px from container top to element top (visible top)
//         const end   = elTop + elHeight - (containerTop + containerHeight); // px beyond bottom

//         // Normalize:
//         const total = (elHeight + containerHeight);
//         const raw = 1 - (start / total); // a smooth 0..1-ish sweep
//         const clamped = Math.max(0, Math.min(1, raw));
//         setProgress(clamped);
//       });
//     };

//     update();
//     const onScroll = () => update();
//     container.addEventListener("scroll", onScroll, { passive: true });
//     window.addEventListener("resize", update);
//     return () => {
//       cancelAnimationFrame(raf.current);
//       container.removeEventListener("scroll", onScroll);
//       window.removeEventListener("resize", update);
//     };
//   }, [container, targetRef]);

//   return progress;
// }


"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollContainer } from "./useScrollContainer";

/**
 * 0..1 progress of target inside scroll *container* (default ".tester-frame")
 * - 0 when element top aligns with container top
 * - 1 when element bottom aligns with container bottom
 */
export function useElementScrollProgress(
  targetRef: React.RefObject<HTMLElement | null>,
  selector = ".tester-frame"
) {
  const container = useScrollContainer(selector);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!container || !targetRef.current) return;
    const el = targetRef.current;

    const compute = () => {
      if (!container || !el) return;

      const c = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();

      // Distance “scrolled through” the section in the container’s viewport
      // Map: top meet top -> 0 ; bottom meet bottom -> 1
      const total = c.height + r.height;
      const start = c.bottom - r.top; // increases as you scroll down
      const raw = start / total;
      const clamped = Math.max(0, Math.min(1, raw));
      setProgress(clamped);
    };

    const onScroll = () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(compute);
    };

    compute();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);

    // Keep in sync with layout changes
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    ro.observe(el);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      ro.disconnect();
    };
  }, [container, targetRef]);

  return progress;
}
