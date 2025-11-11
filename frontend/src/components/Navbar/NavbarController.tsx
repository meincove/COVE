
// "use client";

// import {
//   useState,
//   useRef,
//   useEffect,
//   createContext,
//   useContext,
//   PropsWithChildren,
// } from "react";
// import FullNavbar from "./NavbarComponents/FullModeNavbar/FullNavbar";
// import IslandNavbar from "./NavbarComponents/IslandModeNavbar/IslandNavbar";
// import MenuNavbar from "./NavbarComponents/MenuModeNavbar/MenuNavbar";

// export type NavbarMode = "full" | "island" | "menu";

// /** Scroll hysteresis: go down past 600 → island; come up above 400 → full */
// const DOWN_THRESHOLD = 600;
// const UP_THRESHOLD = 400;

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
//   const [mode, setModeState] = useState<NavbarMode>("full");
//   const lastNonMenuModeRef = useRef<Exclude<NavbarMode, "menu">>("full");
//   const rafLock = useRef(false);

//   /** Read scrollTop from the single scroll container (.tester-frame) */
//   const getScrollTop = () => {
//     const frame = document.querySelector(".tester-frame") as HTMLElement | null;
//     return frame?.scrollTop ?? 0;
//   };

//   /** Decide next mode using hysteresis */
//   const computeNextMode = (current: NavbarMode): Exclude<NavbarMode, "menu"> => {
//     const y = getScrollTop();
//     if (current === "menu") {
//       // shouldn't be called while menu, but stay safe
//       return lastNonMenuModeRef.current ?? "full";
//     }
//     if (current === "full") {
//       return y > DOWN_THRESHOLD ? "island" : "full";
//     }
//     // current === "island"
//     return y < UP_THRESHOLD ? "full" : "island";
//   };

//   const setMode = (m: NavbarMode) => {
//     if (m === "menu") {
//       const currentNonMenu = mode === "menu" ? lastNonMenuModeRef.current : mode;
//       lastNonMenuModeRef.current = currentNonMenu as Exclude<NavbarMode, "menu">;
//       window.dispatchEvent(new Event("cove:menu:open"));
//       setModeState("menu");
//       return;
//     }

//     if (mode === "menu") {
//       window.dispatchEvent(new Event("cove:menu:close"));
//     }
//     setModeState(m);
//     lastNonMenuModeRef.current = m;
//   };

//   /** Auto toggle full/island off .tester-frame scroll (frozen in menu) */
//   useEffect(() => {
//     const frame = document.querySelector(".tester-frame") as HTMLElement | null;
//     if (!frame) return;

//     const onScroll = () => {
//       if (rafLock.current) return;
//       rafLock.current = true;
//       requestAnimationFrame(() => {
//         rafLock.current = false;
//         if (mode === "menu") return;               // freeze while menu open
//         const next = computeNextMode(mode);
//         if (next !== mode) {
//           setModeState(next);
//           lastNonMenuModeRef.current = next;
//         }
//       });
//     };

//     // set initial based on current scroll
//     const initial = computeNextMode("full");
//     setModeState(initial);
//     lastNonMenuModeRef.current = initial;

//     frame.addEventListener("scroll", onScroll, { passive: true });
//     return () => frame.removeEventListener("scroll", onScroll);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /** React to external menu events */
//   useEffect(() => {
//     const onOpen = () => {
//       const keep = mode === "menu" ? lastNonMenuModeRef.current : mode;
//       lastNonMenuModeRef.current = keep as Exclude<NavbarMode, "menu">;
//       setModeState("menu");
//     };
//     const onClose = () => {
//       const restore = lastNonMenuModeRef.current ?? computeNextMode("full");
//       setModeState(restore);
//     };
//     window.addEventListener("cove:menu:open", onOpen);
//     window.addEventListener("cove:menu:close", onClose);
//     return () => {
//       window.removeEventListener("cove:menu:open", onOpen);
//       window.removeEventListener("cove:menu:close", onClose);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [mode]);

//   return (
//     <NavbarModeCtx.Provider value={{ mode, setMode }}>
//       {/* IMPORTANT: do not wrap these in extra block elements that add height */}
//       {mode === "full" && <FullNavbar />}
//       {mode === "island" && <IslandNavbar />}
//       {mode === "menu" && <MenuNavbar />}
//       {children}
//     </NavbarModeCtx.Provider>
//   );
// }


"use client";

import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  PropsWithChildren,
} from "react";
import FullNavbar from "./NavbarComponents/FullModeNavbar/FullNavbar";
import IslandNavbar from "./NavbarComponents/IslandModeNavbar/IslandNavbar";
import MenuNavbar from "./NavbarComponents/MenuModeNavbar/MenuNavbar";

export type NavbarMode = "full" | "island" | "menu";

const ENTER_ISLAND = 620; // go island when scrolling down past this
const EXIT_ISLAND  = 560; // go back to full when scrolling up above this

const NavbarModeCtx = createContext<{
  mode: NavbarMode;
  setMode: (m: NavbarMode) => void;
} | null>(null);

export function useNavbarMode() {
  const ctx = useContext(NavbarModeCtx);
  if (!ctx) throw new Error("useNavbarMode must be used inside NavbarController");
  return ctx;
}

export default function NavbarController({ children }: PropsWithChildren<{}>) {
  const [mode, setModeState] = useState<NavbarMode>("full");

  // keep last non-menu mode so we can restore after closing menu
  const lastNonMenuModeRef = useRef<Exclude<NavbarMode, "menu">>("full");

  // live mode ref so scroll handler never sees stale state
  const modeRef = useRef<NavbarMode>("full");
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const setMode = (m: NavbarMode) => {
    if (m === "menu") {
      const currentNonMenu =
        modeRef.current === "menu" ? lastNonMenuModeRef.current : modeRef.current;
      lastNonMenuModeRef.current = currentNonMenu as Exclude<NavbarMode, "menu">;
      window.dispatchEvent(new Event("cove:menu:open"));
      setModeState("menu");
      modeRef.current = "menu";
      return;
    }

    if (modeRef.current === "menu") {
      window.dispatchEvent(new Event("cove:menu:close"));
    }
    setModeState(m);
    modeRef.current = m;
    lastNonMenuModeRef.current = m;
  };

  // Auto-toggle full <-> island based on .tester-frame scroll
  useEffect(() => {
    const frame = document.querySelector(".tester-frame") as HTMLElement | null;
    if (!frame) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;

        if (modeRef.current === "menu") return; // freeze while menu open

        const y = frame.scrollTop;
        let next: Exclude<NavbarMode, "menu"> = modeRef.current as Exclude<
          NavbarMode,
          "menu"
        >;

        if (next !== "island" && y > ENTER_ISLAND) next = "island";
        if (next !== "full"   && y < EXIT_ISLAND)  next = "full";

        if (next !== modeRef.current) {
          setModeState(next);
          modeRef.current = next;
          lastNonMenuModeRef.current = next;
        }
      });
    };

    // Initialize from current scroll
    const y0 = frame.scrollTop;
    const initial: Exclude<NavbarMode, "menu"> = y0 > ENTER_ISLAND ? "island" : "full";
    setModeState(initial);
    modeRef.current = initial;
    lastNonMenuModeRef.current = initial;

    frame.addEventListener("scroll", onScroll, { passive: true });
    return () => frame.removeEventListener("scroll", onScroll);
  }, []);

  // Respect external open/close menu events (overlay close on outside click)
  useEffect(() => {
    const onOpen = () => {
      const currentNonMenu =
        modeRef.current === "menu" ? lastNonMenuModeRef.current : modeRef.current;
      lastNonMenuModeRef.current = currentNonMenu as Exclude<NavbarMode, "menu">;
      setModeState("menu");
      modeRef.current = "menu";
    };
    const onClose = () => {
      const restore = lastNonMenuModeRef.current;
      setModeState(restore);
      modeRef.current = restore;
    };

    window.addEventListener("cove:menu:open", onOpen);
    window.addEventListener("cove:menu:close", onClose);
    return () => {
      window.removeEventListener("cove:menu:open", onOpen);
      window.removeEventListener("cove:menu:close", onClose);
    };
  }, []);

  return (
    // <NavbarModeCtx.Provider value={{ mode, setMode }}>
    //   {mode === "full"   && <FullNavbar />}
    //   {mode === "island" && <IslandNavbar />}

    //   {mode === "menu" && (
    //     <>
    //       {/* overlay top bar */}
    //       <MenuNavbar />
    //       {/* keep the floating island pill visible above everything */}
    //       <IslandNavbar />
    //     </>
    //   )}

    //   {children}
    // </NavbarModeCtx.Provider>


    <NavbarModeCtx.Provider value={{ mode, setMode }}>
    {mode === "full" && <FullNavbar />}
    {(mode === "island" || mode === "menu") && (
      <IslandNavbar isMenu={mode === "menu"} />
    )}
    {children}
  </NavbarModeCtx.Provider>
  );
}
