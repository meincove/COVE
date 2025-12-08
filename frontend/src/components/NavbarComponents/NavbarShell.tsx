// "use client";

// import React, { useCallback, useEffect } from "react";
// import { motion } from "framer-motion";
// import { LAYOUT_SPRING } from "./constants";
// import { useNavbarTheme } from "./ThemeScope";

// import { useIslandMenu } from "@/src/components/NavbarComponents/islandMenuStore";

// type Props = React.PropsWithChildren<{ isIsland: boolean }>;

// /** Debug perimeter sizes (your “extended island” frame) */
// const INSET = { top: 60, right: 30, bottom: 30, left: 30 };
// const PANEL_BG = "rgb(10,38,71)"; // deep blue perimeter

// function getFrameRoot(): HTMLElement | null {
//   return (
//     document.getElementById("cove-frame-root") ||
//     document.getElementById("__next") ||
//     (document.body.firstElementChild as HTMLElement | null) ||
//     null
//   );
// }

// export default function NavbarShell({ isIsland, children }: Props) {
//   const { theme } = useNavbarTheme();
//   const { isOpen, close } = useIslandMenu();

//   const palette =
//     theme === "dark"
//       ? {
//           bg: "rgba(10,38,71,0.92)", // island debug color
//           fg: "#fff",
//           border: "rgba(255,255,255,0.10)",
//           shadow: "0 18px 40px rgba(0,0,0,0.45)",
//         }
//       : {
//           bg: "rgba(255,255,255,0.92)",
//           fg: "#0b0b0b",
//           border: "rgba(0,0,0,0.10)",
//           shadow: "0 16px 30px rgba(0,0,0,0.18)",
//         };

//   /** Scale the content frame and manage stacking so the underlay never covers it */
//   const applyFrameStyles = useCallback((on: boolean) => {
//     const root = getFrameRoot();
//     if (!root) return;

//     if (!on) {
//       root.style.transform = "";
//       root.style.transformOrigin = "";
//       root.style.borderRadius = "";
//       root.style.boxShadow = "";
//       root.style.overflow = "";
//       return;
//     }

//     const vw = window.innerWidth;
//     const vh = window.innerHeight;
//     const scaleX = (vw - INSET.left - INSET.right) / vw;
//     const scaleY = (vh - INSET.top - INSET.bottom) / vh;

//     root.style.transformOrigin = "center center";
//     root.style.transform = `scale(${scaleX}, ${scaleY})`;
//     root.style.borderRadius = "24px";
//     root.style.boxShadow =
//       "0 40px 120px -24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.10)";
//     root.style.overflow = "hidden";

//   }, []);

//   useEffect(() => {
//     applyFrameStyles(isOpen);

//     const onResize = () => applyFrameStyles(isOpen);
//     window.addEventListener("resize", onResize);

//     const prevOverflow = document.body.style.overflow;
//     if (isOpen) document.body.style.overflow = "hidden";

//     return () => {
//       window.removeEventListener("resize", onResize);
//       document.body.style.overflow = prevOverflow;
//       applyFrameStyles(false);
//     };
//   }, [isOpen, applyFrameStyles]);

//   // ESC closes menu
//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [close]);

//   return (
//     <>
//       {/* UNDERLAY — sits behind the scaled frame (no more full-screen takeover) */}
//       {isOpen && (
//         <div
//           aria-hidden
//           className="fixed inset-0"
//           style={{
//             background: PANEL_BG,
//             zIndex: 0,               
//             pointerEvents: "none",
//           }}
//         />
//       )}

//       {/* NAVBAR — when open, align with the top internal gap */}
//       <motion.div
//         id="cove-navbar-shell"
//         layout
//         transition={LAYOUT_SPRING}
//         className={[
//           "backdrop-blur-xl border overflow-hidden",
//           "h-14 md:h-16",
//           isIsland
//             ? "rounded-t-none rounded-b-2xl md:rounded-b-[28px] mx-auto"
//             : "w-full max-w-none rounded-none mx-0",
//         ].join(" ")}
//         style={{
//           position: "fixed",
//           top: isOpen ? INSET.top : 0, // navbar “inside” the frame gap
//           left: 0,
//           right: 0,
//           margin: "0 auto",
//           paddingTop: "max(env(safe-area-inset-top), 0px)",
//           background: palette.bg,
//           color: palette.fg,
//           borderColor: palette.border,
//           boxShadow: palette.shadow,
//           width: isIsland ? "clamp(280px, 30vw, 560px)" : undefined,
//           pointerEvents: "auto",
//           zIndex: 100, // above bands & underlay
//         }}
//       >
//         {children}
//       </motion.div>

//       {/* PERIMETER BANDS — visible only in the gaps around the scaled frame */}
//       {isOpen && (
//         <>
//           {/* TOP band */}
//           <div
//             aria-hidden
//             className="fixed left-0 right-0"
//             style={{
//               top: 0,
//               height: INSET.top,
//               background: PANEL_BG,
//               zIndex: 5,
//             }}
//           />

//           {/* LEFT / RIGHT */}
//           <div
//             aria-hidden
//             className="fixed"
//             style={{
//               top: INSET.top,
//               bottom: INSET.bottom,
//               left: 0,
//               width: INSET.left,
//               background: PANEL_BG,
//               zIndex: 5,
//             }}
//             onClick={close}
//           />
//           <div
//             aria-hidden
//             className="fixed"
//             style={{
//               top: INSET.top,
//               bottom: INSET.bottom,
//               right: 0,
//               width: INSET.right,
//               background: PANEL_BG,
//               zIndex: 5,
//             }}
//             onClick={close}
//           />

//           {/* BOTTOM */}
//           <div
//             aria-hidden
//             className="fixed left-0 right-0"
//             style={{
//               bottom: 0,
//               height: INSET.bottom,
//               background: PANEL_BG,
//               zIndex: 5,
//             }}
//             onClick={close}
//           />
//         </>
//       )}
//     </>
//   );
// }




// "use client";

// import React, { useCallback, useEffect } from "react";
// import { motion } from "framer-motion";
// import { LAYOUT_SPRING } from "./constants";
// import { useNavbarTheme } from "./ThemeScope";
// import { useIslandMenu } from "./useIslandTrigger";

// type Props = React.PropsWithChildren<{ isIsland: boolean }>;

// /** Perimeter sizes when the extended (menu open) state is active */
// const INSET = { top: 60, right: 30, bottom: 30, left: 30 };
// const FRAME_BG = "rgb(10,38,71)"; // deep blue perimeter

// function getFrameRoot(): HTMLElement | null {
//   return (
//     document.getElementById("cove-frame-root") ||
//     document.getElementById("__next") ||
//     (document.body.firstElementChild as HTMLElement | null) ||
//     null
//   );
// }

// export default function NavbarShell({ isIsland, children }: Props) {
//   const { theme } = useNavbarTheme();
//   const { isOpen, close } = useIslandMenu();

//   const palette =
//     theme === "dark"
//       ? {
//           bg: "rgba(10,38,71,0.92)", // deep blue for island debug
//           fg: "#fff",
//           border: "rgba(255,255,255,0.10)",
//           shadow: "0 18px 40px rgba(0,0,0,0.45)",
//         }
//       : {
//           bg: "rgba(255,255,255,0.92)",
//           fg: "#0b0b0b",
//           border: "rgba(0,0,0,0.10)",
//           shadow: "0 16px 30px rgba(0,0,0,0.18)",
//         };

//   /** Scale the content root to reveal the perimeter when open */
//   const applyFrameStyles = useCallback((on: boolean) => {
//     const root = getFrameRoot();
//     if (!root) return;

//     if (!on) {
//       root.style.transform = "";
//       root.style.transformOrigin = "";
//       root.style.borderRadius = "";
//       root.style.boxShadow = "";
//       root.style.overflow = "";
//       return;
//     }

//     const vw = window.innerWidth;
//     const vh = window.innerHeight;
//     const scaleX = (vw - INSET.left - INSET.right) / vw;
//     const scaleY = (vh - INSET.top - INSET.bottom) / vh;

//     root.style.transformOrigin = "center center";
//     root.style.transform = `scale(${scaleX}, ${scaleY})`;
//     root.style.borderRadius = "24px";
//     root.style.boxShadow =
//       "0 40px 120px -24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.10)";
//     root.style.overflow = "hidden";
//   }, []);

//   useEffect(() => {
//     applyFrameStyles(isOpen);
//     const onResize = () => applyFrameStyles(isOpen);
//     window.addEventListener("resize", onResize);
//     const prev = document.body.style.overflow;
//     if (isOpen) document.body.style.overflow = "hidden";
//     return () => {
//       window.removeEventListener("resize", onResize);
//       document.body.style.overflow = prev;
//       applyFrameStyles(false);
//     };
//   }, [isOpen, applyFrameStyles]);

//   // ESC to close
//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [close]);

//   return (
//     <>
//       {/* Navbar – when open, sit *inside* the top blue band */}
//       <motion.div
//         id="cove-navbar-shell"
//         layout
//         transition={LAYOUT_SPRING}
//         className={[
//           "backdrop-blur-xl border overflow-hidden",
//           "h-14 md:h-16",
//           isIsland
//             ? "rounded-t-none rounded-b-2xl md:rounded-b-[28px] mx-auto"
//             : "w-full max-w-none rounded-none mx-0",
//         ].join(" ")}
//         style={{
//           position: "fixed",
//           top: isOpen ? INSET.top : 0, // drop into the blue header when open
//           left: 0,
//           right: 0,
//           margin: "0 auto",
//           paddingTop: "max(env(safe-area-inset-top), 0px)",
//           background: palette.bg,
//           color: palette.fg,
//           borderColor: palette.border,
//           boxShadow: palette.shadow,
//           width: isIsland ? "clamp(280px, 30vw, 560px)" : undefined,
//           pointerEvents: "auto",
//           zIndex: 82, // above the perimeter strips
//         }}
//       >
//         {children}
//       </motion.div>

//       {/* Perimeter strips only (no full-screen underlay) */}
//       {isOpen && (
//         <>
//           {/* TOP band (future place for links/actions) */}
//           <div
//             className="fixed z-[81] border-b border-white/10"
//             style={{
//               top: 0,
//               left: 0,
//               right: 0,
//               height: INSET.top,
//               background: FRAME_BG,
//             }}
//           />

//           {/* LEFT / RIGHT vertical strips */}
//           <div
//             className="fixed z-[81] border-r border-white/10"
//             style={{
//               top: INSET.top,
//               bottom: INSET.bottom,
//               left: 0,
//               width: INSET.left,
//               background: FRAME_BG,
//             }}
//             onClick={close}
//           />
//           <div
//             className="fixed z-[81] border-l border-white/10"
//             style={{
//               top: INSET.top,
//               bottom: INSET.bottom,
//               right: 0,
//               width: INSET.right,
//               background: FRAME_BG,
//             }}
//             onClick={close}
//           />

//           {/* BOTTOM strip */}
//           <div
//             className="fixed z-[81] border-t border-white/10"
//             style={{
//               left: 0,
//               right: 0,
//               bottom: 0,
//               height: INSET.bottom,
//               background: FRAME_BG,
//             }}
//             onClick={close}
//           />
//         </>
//       )}
//     </>
//   );
// }




// src/components/NavbarComponents/NavbarShell.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { LAYOUT_SPRING } from "./constants";
import { useNavbarTheme } from "./ThemeScope";
import { useIslandMenu } from "@/src/components/NavbarComponents/islandMenuStore";

type Props = React.PropsWithChildren<{ isIsland: boolean }>;

export default function NavbarShell({ isIsland, children }: Props) {
  const { theme } = useNavbarTheme();
  const { isOpen } = useIslandMenu(); // you can still read, just don’t mutate html here

  const palette =
    theme === "dark"
      ? {
          bg: "rgba(156,163,175,0.92)",   // gray-400 @ ~92% opacity
  fg: "#111827",                  // gray-900 for contrast
          border: "rgba(255,255,255,0.10)",
          shadow: "0 18px 40px rgba(0,0,0,0.45)",
        }
      : {
          bg: "rgba(156,163,175,0.92)",   // gray-400 @ ~92% opacity
  fg: "#111827",                  // gray-900 for contrast
          border: "rgba(0,0,0,0.10)",
          shadow: "0 16px 30px rgba(0,0,0,0.18)",
        };

  return (
    <motion.div
      id="cove-navbar-shell"
      layout
      transition={LAYOUT_SPRING}
      className={[
        "backdrop-blur-xl border overflow-hidden",
        "h-14 md:h-16",
        isIsland
          ? "rounded-t-none rounded-b-2xl md:rounded-b-[28px] mx-auto"
          : "w-full max-w-none rounded-none mx-0",
      ].join(" ")}
      style={{
        zIndex: 2,
        background: palette.bg,
        color: palette.fg,
        borderColor: palette.border,
        boxShadow: palette.shadow,
        width: isIsland ? "clamp(280px, 30vw, 560px)" : "100%",
        margin: isIsland ? "0 auto" : "0",
      }}
    >
      {children}
    </motion.div>
  );
}

