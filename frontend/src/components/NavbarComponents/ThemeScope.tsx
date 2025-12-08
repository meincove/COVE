"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type NavbarTheme = "dark" | "light";

type Ctx = {
  theme: NavbarTheme;
  setTheme: (t: NavbarTheme) => void;
  toggle: () => void;
};

const NavbarThemeCtx = createContext<Ctx>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

export function NavbarThemeScope({
  initialTheme = "dark",
  children,
}: {
  initialTheme?: NavbarTheme;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<NavbarTheme>(initialTheme);
  const value = useMemo<Ctx>(() => ({ theme, setTheme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) }), [theme]);
  return <NavbarThemeCtx.Provider value={value}>{children}</NavbarThemeCtx.Provider>;
}

export function useNavbarTheme() {
  return useContext(NavbarThemeCtx);
}
