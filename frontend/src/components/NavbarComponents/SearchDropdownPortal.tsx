// "use client";

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import { AnimatePresence, motion } from "framer-motion";

// export type AnchorMode = "full" | "island";

// type Props = {
//   open: boolean;
//   anchorEl: HTMLElement | null;   // search wrapper (full) or island shell
//   onClose: () => void;
//   zIndex?: number;                // default 70
//   gap?: number;                   // px below anchor; default 8
//   mode: AnchorMode;               // not used in layout now, but kept for clarity
//   children: React.ReactNode;
// };

// export default function SearchDropdownPortal({
//   open,
//   anchorEl,
//   onClose,
//   zIndex = 70,
//   gap = 8,
//   mode, // eslint-disable-line @typescript-eslint/no-unused-vars
//   children,
// }: Props) {
//   const panelRef = useRef<HTMLDivElement | null>(null);
//   const [rect, setRect] = useState<DOMRect | null>(null);

//   // Measure the anchor reliably
//   useEffect(() => {
//     if (!open || !anchorEl) {
//       setRect(null);
//       return;
//     }
//     const measure = () => setRect(anchorEl.getBoundingClientRect());
//     measure();

//     const ro = new ResizeObserver(measure);
//     ro.observe(anchorEl);

//     // Re-measure on resize/scroll
//     window.addEventListener("resize", measure);
//     window.addEventListener("scroll", measure, { passive: true });

//     return () => {
//       ro.disconnect();
//       window.removeEventListener("resize", measure);
//       window.removeEventListener("scroll", measure);
//     };
//   }, [open, anchorEl]);

//   // Style: LEFT-EDGE anchored (no centering), fixed positioning
//   const style = useMemo(() => {
//     if (!rect) return undefined;
//     return {
//       position: "fixed" as const,
//       width: rect.width,
//       left: rect.left,               // ← anchor by left edge
//       top: rect.bottom + gap,
//       zIndex,
//     };
//   }, [rect, gap, zIndex]);

//   if (!open || !anchorEl || !rect || typeof document === "undefined") return null;

//   return createPortal(
//     <AnimatePresence>
//       {/* Backdrop to catch outside clicks (closes anywhere outside the panel) */}
//       <motion.div
//         key="cove-search-backdrop"
//         className="fixed inset-0"
//         style={{ zIndex: zIndex - 1 }}
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 0 }}   // keep transparent
//         exit={{ opacity: 0 }}
//         onMouseDown={onClose}
//       />

//       {/* Panel wrapper – stop clicks from closing */}
//       <motion.div
//         key="cove-search-dropdown"
//         ref={panelRef}
//         initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
//         animate={{ opacity: 1, y: 10, scaleY: 1 }}
//         exit={{ opacity: 0, y: -6, scaleY: 0.98 }}
//         transition={{ type: "spring", stiffness: 420, damping: 34 }}
//         style={style}
//         onMouseDown={(e) => e.stopPropagation()}
//       >
//         {children}
//       </motion.div>
//     </AnimatePresence>,
//     document.body
//   );
// }




// src/components/NavbarComponents/SearchDropdownPortal.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type AnchorMode = "full" | "island";

type Props = {
  open: boolean;
  anchorEl: HTMLElement | null; // search wrapper (full) or island shell
  onClose: () => void;
  zIndex?: number; // default 70
  gap?: number; // px below anchor; default 8
  mode: AnchorMode; // kept for clarity
  children: React.ReactNode;
};

export default function SearchDropdownPortal({
  open,
  anchorEl,
  onClose,
  zIndex = 90,
  gap = 8,
  mode, // eslint-disable-line @typescript-eslint/no-unused-vars
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Measure the anchor reliably
  useEffect(() => {
    if (!open || !anchorEl) {
      setRect(null);
      return;
    }
    const measure = () => setRect(anchorEl.getBoundingClientRect());
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(anchorEl);

    // Re-measure on resize/scroll
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [open, anchorEl]);

  // Style: LEFT-EDGE anchored (no centering), fixed positioning
  const style = useMemo(() => {
    if (!rect) return undefined;
    return {
      position: "fixed" as const,
      width: rect.width,
      left: rect.left, // anchor by left edge
      top: rect.bottom + gap,
      zIndex,
    };
  }, [rect, gap, zIndex]);

  if (!open || !anchorEl || !rect || typeof document === "undefined") return null;

  // IMPORTANT: Portal into #__next (the scaled root),
  // so the dropdown stays visually inside the shrunken frame.
  // const portalRoot = document.getElementById("__next");
  const portalRoot = document.body;
  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop to catch outside clicks (transparent) */}
      <motion.div
        key="cove-search-backdrop"
        className="fixed inset-0"
        style={{ zIndex: zIndex - 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        onMouseDown={onClose}
      />

      {/* Panel wrapper – stop clicks from closing */}
      <motion.div
        key="cove-search-dropdown"
        ref={panelRef}
        initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
        animate={{ opacity: 1, y: 10, scaleY: 1 }}
        exit={{ opacity: 0, y: -6, scaleY: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </AnimatePresence>,
    portalRoot
  );
}
