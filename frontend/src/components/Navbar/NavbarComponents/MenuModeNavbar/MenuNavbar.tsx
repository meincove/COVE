// src/components/Navbar/NavbarComponents/MenuModeNavbar/MenuNavbar.tsx
"use client";

import { useNavbarMode } from "../../NavbarController";

export default function MenuNavbar() {
  const { setMode } = useNavbarMode();

  return (
    // Same floating rail style as Island navbar
    <div className="nav-stick w-full pointer-events-none">
      <div className="w-full h-16 flex items-center justify-center">
        <div className="nav-shell pointer-events-auto px-5 py-2 rounded-2xl shadow flex items-center gap-3">
          <span className="text-sm font-medium tracking-wide">
            MENU MODE
          </span>

          <button
            className="px-3 py-1 rounded bg-black/5 text-sm"
            onClick={() => setMode("island")}
          >
            Close Menu
          </button>
        </div>
      </div>
    </div>
  );
}
