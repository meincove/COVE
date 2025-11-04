"use client";

import { useNavbarTheme } from "../ThemeScope";

export default function ThemeSwitch() {
  const { theme, toggle } = useNavbarTheme();
  return (
    <button
      aria-label="Theme"
      onClick={toggle}
      className="rounded-lg px-2 py-1 text-xs hover:bg-white/5 transition"
      title={theme === "dark" ? "Dark" : "Light"}
      style={{ color: "inherit" }}  // inherits from shell palette
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
