"use client";

import { useState, createContext, useContext, PropsWithChildren } from "react";
import FullNavbar from "./NavbarComponents/FullModeNavbar/FullNavbar";
import IslandNavbar from "./NavbarComponents/IslandModeNavbar/IslandNavbar";
import MenuNavbar from "./NavbarComponents/MenuModeNavbar/MenuNavbar";

export type NavbarMode = "full" | "island" | "menu";

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

  const setMode = (m: NavbarMode) => {
    setModeState(m);
    if (m === "menu") {
      window.dispatchEvent(new Event("cove:menu:open"));
    } else {
      window.dispatchEvent(new Event("cove:menu:close"));
    }
  };

  return (
    <NavbarModeCtx.Provider value={{ mode, setMode }}>
      {mode === "full" && <FullNavbar />}
      {mode === "island" && <IslandNavbar />}
      {mode === "menu" && <MenuNavbar />}
      {children}
    </NavbarModeCtx.Provider>
  );
}
