// src/components/Navbar/NavbarComponents/IslandModeNavbar/IslandNavbar.tsx
"use client";

import { motion } from "framer-motion";
import { useNavbarMode } from "../../NavbarController";
// You can re-enable this later if you want search inside island
// import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

export type IslandNavbarProps = {
  isMenu?: boolean;
};

export default function IslandNavbar({ isMenu = false }: IslandNavbarProps) {
  const { setMode } = useNavbarMode();

  return (
    // Floating rail; sticky behavior & base bg come from .nav-stick in CSS
    <div className="nav-stick w-full pointer-events-none">
      <div className="w-full h-11 flex items-center justify-center">
        <motion.div
          id="cove-navbar-shell"
          className="nav-shell pointer-events-auto px-3 py-2 shadow flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.26, ease: "easeInOut" }}
        >
          <span className="text-sm font-medium tracking-wide">
            {isMenu ? "MENU" : "ISLAND"}
          </span>

          {/* Optional: search inside island mode */}
          {/* {!isMenu && (
            <div className="min-w-0 flex-1">
              <SearchBar />
            </div>
          )} */}

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
        </motion.div>
      </div>
    </div>
  );
}
