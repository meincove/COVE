// src/components/NavbarComponents/IslandController.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Ctx = { override: boolean | null; setOverride: (v: boolean | null) => void };
const IslandCtx = createContext<Ctx>({ override: null, setOverride: () => {} });

export function IslandController({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    const onSet = (e: Event) => setOverride((e as CustomEvent<boolean>).detail);
    const onToggle = () => setOverride((p) => (p == null ? true : !p));
    const onClear = () => setOverride(null);

    window.addEventListener("cove:island:set", onSet as EventListener);
    window.addEventListener("cove:island:toggle", onToggle);
    window.addEventListener("cove:island:clear", onClear);
    return () => {
      window.removeEventListener("cove:island:set", onSet as EventListener);
      window.removeEventListener("cove:island:toggle", onToggle);
      window.removeEventListener("cove:island:clear", onClear);
    };
  }, []);

  return <IslandCtx.Provider value={{ override, setOverride }}>{children}</IslandCtx.Provider>;
}

export const useIslandOverride = () => useContext(IslandCtx);
