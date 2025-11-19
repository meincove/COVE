
"use client";

import { useNavbarMode } from "../../NavbarController";
// adjust the path to your SearchBar location if different:
import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

export type IslandNavbarProps = {
  /** When true, show the “Menu” variant (no search, red close). */
  isMenu?: boolean;
};

export default function IslandNavbar({ isMenu = false }: IslandNavbarProps) {
  const { setMode } = useNavbarMode();

  return (
    // rail that keeps the pill floating; doesn’t block page clicks
    <div className="nav-stick w-full pointer-events-none">
      <div className="w-full h-11 flex items-center justify-center">
        {/* the actual pill; restore interactivity */}
        <div
          id="cove-navbar-shell"
          className="nav-shell pointer-events-auto px-3 py-2  shadow flex items-center gap-3"
        >
          <span className="text-sm font-medium tracking-wide">
            {isMenu ? "MENU" : "ISLAND"}
          </span>

          {/* Center: search only in island (not in menu) */}
          {/* {!isMenu && (
            <div className="min-w-0 flex-1">
              <SearchBar />
            </div>
          )} */}

          {/* Right-side controls */}
          <div className="ml-auto flex items-center gap-2">
            {isMenu ? (
              <button
                onClick={() => setMode("full")}
                className="px-3 py-1 rounded-md bg-red-600 text-white"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMode("menu")}
                  className="px-3 py-1 rounded bg-black/5"
                >
                  Menu
                </button>
                <button
                  onClick={() => setMode("full")}
                  className="px-3 py-1 rounded bg-black/5"
                >
                  Full
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
