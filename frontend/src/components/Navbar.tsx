// src/components/Navbar.tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";

import NavbarShell from "@/components/NavbarComponents/NavbarShell";
import Brand from "@/components/NavbarComponents/Brand";
import DesktopLinks from "@/components/NavbarComponents/DesktopLinks";
import SearchBar from "@/components/NavbarComponents/SearchBar";
import ActionsCluster from "@/components/NavbarComponents/Actions";
import MobileMenu from "@/components/NavbarComponents/MobileMenu";

import { useIslandTrigger } from "@/components/NavbarComponents/useIslandTrigger";
import {
  IslandController,
  useIslandOverride,
} from "@/components/NavbarComponents/IslandController";
import { NavbarThemeScope } from "@/components/NavbarComponents/ThemeScope";

// Optional hook exported from useIslandTrigger.ts to control the framed inset
import { useIslandMenu } from "./NavbarComponents/useIslandTrigger";

function NavbarInner() {
  // classic drawer for non-island mode
  const [mobileOpen, setMobileOpen] = useState(false);

  // automatic island by hero/scroll
  const autoIsland = useIslandTrigger("hero");

  // manual override context (null = automatic)
  const { override } = useIslandOverride();

  // framed inset state for island 3-bar
  const { isOpen: menuIsOpen, toggle: menuToggle } = useIslandMenu();

  // keep island styling when framed inset is open
  const isIsland = (override ?? autoIsland) || menuIsOpen;

  return (
    <header className="w-full pointer-events-none">
      <NavbarShell isIsland={isIsland}>
        {/* re-enable interaction inside the shell */}
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 pointer-events-auto">
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
                    {/* classic hamburger for full navbar on small screens */}
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

            {/* CENTER */}
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
                    className="flex items-center gap-1.5 sm:gap-2"
                  >
                    {/* show actions (Language, Theme, Auth, Cart) even in island mode */}
                    <div className="hidden sm:flex items-center gap-2 mr-2">
                      <a href="/shopping" className="text-xs font-bold uppercase tracking-wider hover:underline">Go to Shopping</a>
                      <div className="w-[1px] h-4 bg-white/20 mx-1" />
                    </div>
                    <ActionsCluster />

                    {/* island 3-bar toggles the framed inset */}
                    <button
                      aria-label={
                        menuIsOpen ? "Close island menu" : "Open island menu"
                      }
                      className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
                      onClick={() => {
                        menuToggle(); // your existing state
                        window.dispatchEvent(
                          new Event("cove:island:menu:toggle")
                        ); // tell the frame to open/close
                      }}
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

      {/* classic slide-in drawer (full navbar mode only) */}
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
