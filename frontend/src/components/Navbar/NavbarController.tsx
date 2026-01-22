

// "use client";

// import {
//   useState,
//   useRef,
//   useEffect,
//   createContext,
//   useContext,
//   PropsWithChildren,
// } from "react";
// import { usePathname } from "next/navigation";
// import { AnimatePresence } from "framer-motion";
// import FullNavbar from "./NavbarComponents/FullModeNavbar/FullNavbar";
// import IslandNavbar from "./NavbarComponents/IslandModeNavbar/IslandNavbar";

// export type NavbarMode = "full" | "island" | "menu";

// const ENTER_ISLAND = 620;
// const EXIT_ISLAND = 560;

// const NavbarModeCtx = createContext<{
//   mode: NavbarMode;
//   setMode: (m: NavbarMode) => void;
// } | null>(null);

// export function useNavbarMode() {
//   const ctx = useContext(NavbarModeCtx);
//   if (!ctx) throw new Error("useNavbarMode must be used inside NavbarController");
//   return ctx;
// }

// export default function NavbarController({ children }: PropsWithChildren<{}>) {
//   const pathname = usePathname();
//   const [mode, setModeState] = useState<NavbarMode>("full");

//   // ✅ Hide old navbar ONLY on "/" and "/shopping" (test route)
//   const shouldHideNavbar = pathname === "/" || pathname?.startsWith("/shopping");

//   const lastNonMenuModeRef = useRef<Exclude<NavbarMode, "menu">>("full");
//   const modeRef = useRef<NavbarMode>("full");
//   useEffect(() => {
//     modeRef.current = mode;
//   }, [mode]);

//   const transitionLockRef = useRef(false);
//   const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const setMode = (m: NavbarMode) => {
//     if (m === "menu") {
//       const currentNonMenu =
//         modeRef.current === "menu" ? lastNonMenuModeRef.current : modeRef.current;
//       lastNonMenuModeRef.current =
//         currentNonMenu as Exclude<NavbarMode, "menu">;
//       window.dispatchEvent(new Event("cove:menu:open"));
//       setModeState("menu");
//       modeRef.current = "menu";
//       return;
//     }

//     if (modeRef.current === "menu") {
//       window.dispatchEvent(new Event("cove:menu:close"));
//     }
//     setModeState(m);
//     modeRef.current = m;
//     lastNonMenuModeRef.current = m;
//   };

//   // Auto-toggle full <-> island based on .tester-frame scroll
//   useEffect(() => {
//     const frame = document.querySelector(".tester-frame") as HTMLElement | null;
//     if (!frame) return;

//     let ticking = false;

//     const onScroll = () => {
//       if (ticking || transitionLockRef.current) return;
//       ticking = true;
//       requestAnimationFrame(() => {
//         ticking = false;

//         if (modeRef.current === "menu") return;

//         const y = frame.scrollTop;
//         let next: Exclude<NavbarMode, "menu"> =
//           modeRef.current as Exclude<NavbarMode, "menu">;

//         if (next !== "island" && y > ENTER_ISLAND) next = "island";
//         if (next !== "full" && y < EXIT_ISLAND) next = "full";

//         if (next !== modeRef.current) {
//           transitionLockRef.current = true;
//           if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
//           lockTimeoutRef.current = setTimeout(() => {
//             transitionLockRef.current = false;
//           }, 400);

//           setModeState(next);
//           modeRef.current = next;
//           lastNonMenuModeRef.current = next;
//         }
//       });
//     };

//     const y0 = frame.scrollTop;
//     const initial: Exclude<NavbarMode, "menu"> =
//       y0 > ENTER_ISLAND ? "island" : "full";
//     setModeState(initial);
//     modeRef.current = initial;
//     lastNonMenuModeRef.current = initial;

//     frame.addEventListener("scroll", onScroll, { passive: true });
//     return () => frame.removeEventListener("scroll", onScroll);
//   }, []);

//   // Respect external open/close menu events
//   useEffect(() => {
//     const onOpen = () => {
//       const currentNonMenu =
//         modeRef.current === "menu" ? lastNonMenuModeRef.current : modeRef.current;
//       lastNonMenuModeRef.current =
//         currentNonMenu as Exclude<NavbarMode, "menu">;
//       setModeState("menu");
//       modeRef.current = "menu";
//     };
//     const onClose = () => {
//       const restore = lastNonMenuModeRef.current;
//       setModeState(restore);
//       modeRef.current = restore;
//     };

//     window.addEventListener("cove:menu:open", onOpen);
//     window.addEventListener("cove:menu:close", onClose);
//     return () => {
//       window.removeEventListener("cove:menu:open", onOpen);
//       window.removeEventListener("cove:menu:close", onClose);
//     };
//   }, []);

//   return (
//     <NavbarModeCtx.Provider value={{ mode, setMode }}>
//       {/* ✅ Old navbar hidden on "/" + "/shopping" only */}
//       {!shouldHideNavbar && (
//         <AnimatePresence mode="wait" initial={false}>
//           {mode === "full" && <FullNavbar key="full" />}
//           {mode !== "full" && <IslandNavbar key="island" isMenu={mode === "menu"} />}
//         </AnimatePresence>
//       )}

//       {children}
//     </NavbarModeCtx.Provider>
//   );
// }


"use client"

import { PropsWithChildren } from "react"
import { usePathname } from "next/navigation"
import GlobalNavbar from "./GlobalNavbar"

export default function NavbarController({ children }: PropsWithChildren<{}>) {
  const pathname = usePathname()

  // Logic defined by user:
  // Hide GlobalNavbar on: /, /shopping/*, /brands/* (They use custom or L-shaped navbar)
  // Show GlobalNavbar on: /product/*, /checkout, /partner-onboarding, etc.

  const hideGlobalNavbar =
    pathname === "/" ||
    pathname?.startsWith("/shopping") ||
    pathname?.startsWith("/brands")

  return (
    <>
      {!hideGlobalNavbar && <GlobalNavbar />}
      {children}
    </>
  )
}
