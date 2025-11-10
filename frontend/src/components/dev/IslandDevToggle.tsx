"use client";

import React, { useEffect, useState } from "react";

/**
 * Floating controller:
 * - Mode cycles: Full → Island → Auto
 * - “Menu” toggles the Island-Extended (3-bar) frame
 *
 * Events fired:
 *   cove:island:set (true/false), cove:island:clear
 *   cove:island:menu:toggle
 */
export default function IslandDevToggle() {
  type Mode = "full" | "island" | "auto";
  const [mode, setMode] = useState<Mode>("auto");
  const [menuOpen, setMenuOpen] = useState(false);

  // Optional: reset to “auto” after mount (safe—runs post-render)
  useEffect(() => {
    window.dispatchEvent(new Event("cove:island:clear"));
  }, []);

  const modeLabel = mode === "full" ? "Full" : mode === "island" ? "Island" : "Auto";

  const pushMode = (m: Mode) => {
    if (m === "full") {
      window.dispatchEvent(new CustomEvent<boolean>("cove:island:set", { detail: false }));
    } else if (m === "island") {
      window.dispatchEvent(new CustomEvent<boolean>("cove:island:set", { detail: true }));
    } else {
      window.dispatchEvent(new Event("cove:island:clear"));
    }
    setMode(m);
  };

  const cycleMode = () => {
    setMode(prev => {
      const next: Mode = prev === "full" ? "island" : prev === "island" ? "auto" : "full";
      pushMode(next);
      return next;
    });
  };

  const toggleMenu = () => {
    window.dispatchEvent(new Event("cove:island:menu:toggle"));
    setMenuOpen(v => !v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F8") cycleMode();
      if (e.key === "F9") toggleMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed right-4 bottom-4 z-[9999] flex items-center gap-2">
      <button
        onClick={cycleMode}
        className="rounded-full px-4 py-2 text-sm font-medium border"
        style={{
          background: "rgba(255, 107, 107, 0.14)",
          borderColor: "rgba(255, 107, 107, 0.6)",
          color: "#ff6b6b",
          boxShadow: "0 6px 16px rgba(0,0,0,.18)",
          backdropFilter: "blur(8px)",
        }}
        title="Cycle mode (Full → Island → Auto) or press F8"
      >
        Mode: {modeLabel}
      </button>

      <button
        onClick={toggleMenu}
        className="rounded-full px-3 py-2 text-sm font-medium border"
        style={{
          background: "rgba(15, 35, 80, 0.16)",
          borderColor: "rgba(15, 35, 80, 0.5)",
          color: "#0f2350",
          boxShadow: "0 6px 16px rgba(0,0,0,.18)",
          backdropFilter: "blur(8px)",
        }}
        title="Toggle Island-Extended (F9)"
      >
        {menuOpen ? "Close Menu" : "Open Menu"}
      </button>
    </div>
  );
}
