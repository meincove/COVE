"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";

import NavbarShell from "./NavbarComponents/NavbarShell";
import Brand from "./NavbarComponents/Brand";
import DesktopLinks from "./NavbarComponents/DesktopLinks";
import SearchBar from "./NavbarComponents/SearchBar";
import ActionsCluster from "./NavbarComponents/Actions";
import MobileMenu from "./NavbarComponents/MobileMenu";
import { useIslandTrigger } from "./NavbarComponents/useIslandTrigger";
import { IslandController, useIslandOverride } from "./NavbarComponents/IslandController";
import { NavbarThemeScope } from "./NavbarComponents/ThemeScope";

function NavbarInner() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { override } = useIslandOverride();
  const autoIsland = useIslandTrigger("hero");
  const isIsland = override ?? autoIsland;

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      <NavbarShell isIsland={isIsland}>
        <div className="px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex h-14 md:h-16 items-center justify-between gap-2">
            {/* LEFT */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <AnimatePresence initial={false} mode="sync">
                {!isIsland ? (
                  <motion.div
                    key="left-full"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2 md:gap-4"
                  >
                    <div className="md:hidden">
                      <button
                        aria-label="Open menu"
                        onClick={() => setMobileOpen(true)}
                        className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
                      >
                        <Menu className="h-5 w-5" />
                      </button>
                    </div>
                    <Brand />
                    <DesktopLinks />
                  </motion.div>
                ) : (
                  <motion.div
                    key="left-island"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center"
                  >
                    <Brand />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CENTER (can shrink) */}
            <div className="relative flex-1 flex justify-center min-w-0">
              <SearchBar island={isIsland} />
            </div>

            {/* RIGHT */}
            <div className="flex items-center shrink-0">
              <AnimatePresence initial={false} mode="sync">
                {!isIsland ? (
                  <motion.div
                    key="right-full"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5 sm:gap-2"
                  >
                    <ActionsCluster />
                  </motion.div>
                ) : (
                  <motion.div
                    key="right-island"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center"
                  >
                    <button
                      aria-label="Open island menu"
                      className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
                      onClick={() => setMobileOpen(true)}
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </NavbarShell>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

export default function Navbar() {
  return (
    <IslandController>
      <NavbarThemeScope initialTheme="dark">
        <NavbarInner />
      </NavbarThemeScope>
    </IslandController>
  );
}
