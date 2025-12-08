"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useIslandTrigger} from "@/src/components/NavbarComponents/useIslandTrigger";
import { useIslandMenu } from "@/src/components/NavbarComponents/islandMenuStore";

type Ctx = {
  override: boolean | null;
  setOverride: (v: boolean | null) => void;

  isIslandAuto: boolean;

  menuIsOpen: boolean;
  menuOpen: () => void;
  menuClose: () => void;
  menuToggle: () => void;
};

const IslandCtx = createContext<Ctx>({
  override: null,
  setOverride: () => {},
  isIslandAuto: false,
  menuIsOpen: false,
  menuOpen: () => {},
  menuClose: () => {},
  menuToggle: () => {},
});

export function IslandController({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<boolean | null>(null);
  const isIslandAuto = useIslandTrigger();

  const {
    isOpen: menuIsOpen,
    open: menuOpen,
    close: menuClose,
    toggle: menuToggle,
  } = useIslandMenu();

  // Keep custom-event API; ensure updates happen after the current render tick
  useEffect(() => {
    const onSet = (e: Event) => {
      const v = (e as CustomEvent<boolean>).detail;
      requestAnimationFrame(() => setOverride(v));
    };
    const onToggle = () =>
      requestAnimationFrame(() => setOverride(p => (p == null ? true : !p)));
    const onClear = () => requestAnimationFrame(() => setOverride(null));

    // 💡 FIX: listen to the correct menu events
    const onMenuToggle = () => requestAnimationFrame(() => menuToggle());
    const onMenuOpen = () => requestAnimationFrame(() => menuOpen());
    const onMenuClose = () => requestAnimationFrame(() => menuClose());

    window.addEventListener("cove:island:set", onSet as EventListener);
    window.addEventListener("cove:island:toggle", onToggle);
    window.addEventListener("cove:island:clear", onClear);

    window.addEventListener("cove:island:menu:toggle", onMenuToggle);
    window.addEventListener("cove:island:menu:open", onMenuOpen);
    window.addEventListener("cove:island:menu:close", onMenuClose);

    return () => {
      window.removeEventListener("cove:island:set", onSet as EventListener);
      window.removeEventListener("cove:island:toggle", onToggle);
      window.removeEventListener("cove:island:clear", onClear);

      window.removeEventListener("cove:island:menu:toggle", onMenuToggle);
      window.removeEventListener("cove:island:menu:open", onMenuOpen);
      window.removeEventListener("cove:island:menu:close", onMenuClose);
    };
  }, [menuToggle, menuOpen, menuClose]);

  const value = useMemo<Ctx>(
    () => ({
      override,
      setOverride,
      isIslandAuto,
      menuIsOpen,
      menuOpen,
      menuClose,
      menuToggle,
    }),
    [override, isIslandAuto, menuIsOpen, menuOpen, menuClose, menuToggle]
  );

  return <IslandCtx.Provider value={value}>{children}</IslandCtx.Provider>;
}

export const useIslandOverride = () => useContext(IslandCtx);
