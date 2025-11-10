// "use client";

// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { Menu } from "lucide-react";

// import NavbarShell from "./NavbarComponents/NavbarShell";
// import Brand from "./NavbarComponents/Brand";
// import DesktopLinks from "./NavbarComponents/DesktopLinks";
// import SearchBar from "./NavbarComponents/SearchBar";
// import ActionsCluster from "./NavbarComponents/Actions";
// import MobileMenu from "./NavbarComponents/MobileMenu";
// import { useIslandTrigger } from "./NavbarComponents/useIslandTrigger";
// import { IslandController, useIslandOverride } from "./NavbarComponents/IslandController";
// import { NavbarThemeScope } from "./NavbarComponents/ThemeScope";

// function NavbarInner() {
//   const [mobileOpen, setMobileOpen] = useState(false);

//   const { override } = useIslandOverride();
//   const autoIsland = useIslandTrigger("hero");
//   const isIsland = override ?? autoIsland;

//   return (
//     <header className="fixed top-0 left-0 z-50 w-full">
//       <NavbarShell isIsland={isIsland}>
//         <div className="px-3 sm:px-4 md:px-6 lg:px-8">
//           <div className="flex h-14 md:h-16 items-center justify-between gap-2">
//             {/* LEFT */}
//             <div className="flex items-center gap-2 md:gap-4 shrink-0">
//               <AnimatePresence initial={false} mode="sync">
//                 {!isIsland ? (
//                   <motion.div
//                     key="left-full"
//                     initial={{ opacity: 0, x: -8 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: -8 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center gap-2 md:gap-4"
//                   >
//                     <div className="md:hidden">
//                       <button
//                         aria-label="Open menu"
//                         onClick={() => setMobileOpen(true)}
//                         className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
//                       >
//                         <Menu className="h-5 w-5" />
//                       </button>
//                     </div>
//                     <Brand />
//                     <DesktopLinks />
//                   </motion.div>
//                 ) : (
//                   <motion.div
//                     key="left-island"
//                     initial={{ opacity: 0, x: -6 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: -6 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center"
//                   >
//                     <Brand />
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>

//             {/* CENTER (can shrink) */}
//             <div className="relative flex-1 flex justify-center min-w-0">
//               <SearchBar island={isIsland} />
//             </div>

//             {/* RIGHT */}
//             <div className="flex items-center shrink-0">
//               <AnimatePresence initial={false} mode="sync">
//                 {!isIsland ? (
//                   <motion.div
//                     key="right-full"
//                     initial={{ opacity: 0, x: 8 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: 8 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center gap-1.5 sm:gap-2"
//                   >
//                     <ActionsCluster />
//                   </motion.div>
//                 ) : (
//                   <motion.div
//                     key="right-island"
//                     initial={{ opacity: 0, x: 6 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: 6 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center"
//                   >
//                     <button
//                       aria-label="Open island menu"
//                       className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
//                       onClick={() => setMobileOpen(true)}
//                     >
//                       <Menu className="h-5 w-5" />
//                     </button>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>
//         </div>
//       </NavbarShell>

//       <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
//     </header>
//   );
// }

// export default function Navbar() {
//   return (
//     <IslandController>
//       <NavbarThemeScope initialTheme="dark">
//         <NavbarInner />
//       </NavbarThemeScope>
//     </IslandController>
//   );
// }


// src/components/Navbar.tsx
// "use client";

// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { Menu } from "lucide-react";

// import NavbarShell from "./NavbarComponents/NavbarShell";
// import Brand from "./NavbarComponents/Brand";
// import DesktopLinks from "./NavbarComponents/DesktopLinks";
// import SearchBar from "./NavbarComponents/SearchBar";
// import ActionsCluster from "./NavbarComponents/Actions";
// import MobileMenu from "./NavbarComponents/MobileMenu";
// import { IslandController, useIslandOverride } from "./NavbarComponents/IslandController";
// import { NavbarThemeScope } from "./NavbarComponents/ThemeScope";

// function NavbarInner() {
//   // Classic mobile drawer (used in non-island only)
//   const [mobileOpen, setMobileOpen] = useState(false);

//   const { override, isIslandAuto, menuIsOpen, menuToggle } = useIslandOverride();

//   // Keep shell in island styling while framed inset is open
//   const isIsland = (override ?? isIslandAuto) || menuIsOpen;

//   return (
//     <header className="fixed top-0 left-0 z-50 w-full">
//       <NavbarShell isIsland={isIsland}>
//         <div className="px-3 sm:px-4 md:px-6 lg:px-8">
//           <div className="flex h-14 md:h-16 items-center justify-between gap-2">
//             {/* LEFT */}
//             <div className="flex items-center gap-2 md:gap-4 shrink-0">
//               <AnimatePresence initial={false} mode="sync">
//                 {!isIsland ? (
//                   <motion.div
//                     key="left-full"
//                     initial={{ opacity: 0, x: -8 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: -8 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center gap-2 md:gap-4"
//                   >
//                     {/* Classic mobile hamburger (non-island) */}
//                     <div className="md:hidden">
//                       <button
//                         aria-label="Open menu"
//                         onClick={() => setMobileOpen(true)}
//                         className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
//                       >
//                         <Menu className="h-5 w-5" />
//                       </button>
//                     </div>
//                     <Brand />
//                     <DesktopLinks />
//                   </motion.div>
//                 ) : (
//                   <motion.div
//                     key="left-island"
//                     initial={{ opacity: 0, x: -6 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: -6 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center"
//                   >
//                     <Brand />
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>

//             {/* CENTER */}
//             <div className="relative flex-1 flex justify-center min-w-0">
//               <SearchBar island={isIsland} />
//             </div>

//             {/* RIGHT */}
//             <div className="flex items-center shrink-0">
//               <AnimatePresence initial={false} mode="sync">
//                 {!isIsland ? (
//                   <motion.div
//                     key="right-full"
//                     initial={{ opacity: 0, x: 8 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: 8 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center gap-1.5 sm:gap-2"
//                   >
//                     <ActionsCluster />
//                   </motion.div>
//                 ) : (
//                   <motion.div
//                     key="right-island"
//                     initial={{ opacity: 0, x: 6 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     exit={{ opacity: 0, x: 6 }}
//                     transition={{ duration: 0.18 }}
//                     className="flex items-center"
//                   >
//                     {/* Island button toggles framed inset */}
//                     <button
//                       aria-label={menuIsOpen ? "Close island menu" : "Open island menu"}
//                       className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
//                       onClick={menuToggle}
//                     >
//                       <Menu className="h-5 w-5" />
//                     </button>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </div>
//         </div>
//       </NavbarShell>

//       {/* White top overlay that appears ONLY when island menu is open */}
//       <AnimatePresence>
//         {menuIsOpen && (
//           <motion.div
//             key="cove-top-overlay"
//             className="fixed z-[82] left-[10px] right-[10px] top-[10px]"
//             initial={{ opacity: 0, y: -10 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -8 }}
//             transition={{ type: "spring", stiffness: 260, damping: 26 }}
//           >
//             <div className="h-12 md:h-14 rounded-2xl md:rounded-3xl bg-white text-black border border-black/10 shadow-lg flex items-center justify-between px-4 md:px-6">
//               {/* LEFT – primary link set */}
//               <div className="hidden md:flex items-center gap-6">
//                 <DesktopLinks />
//               </div>

//               {/* CENTER – optional label / island glyph */}
//               <div className="md:hidden text-sm font-medium">Menu</div>

//               {/* RIGHT – actions like Sign in / Dashboard */}
//               <div className="flex items-center gap-2 sm:gap-3">
//                 <ActionsCluster />
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Classic slide-in drawer (non-island only) */}
//       <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
//     </header>
//   );
// }

// export default function Navbar() {
//   return (
//     <IslandController>
//       <NavbarThemeScope initialTheme="dark">
//         <NavbarInner />
//       </NavbarThemeScope>
//     </IslandController>
//   );
// }



// src/components/Navbar.tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";

import NavbarShell from "@/src/components/NavbarComponents/NavbarShell";
import Brand from "@/src/components/NavbarComponents/Brand";
import DesktopLinks from "@/src/components/NavbarComponents/DesktopLinks";
import SearchBar from "@/src/components/NavbarComponents/SearchBar";
import ActionsCluster from "@/src/components/NavbarComponents/Actions";
import MobileMenu from "@/src/components/NavbarComponents/MobileMenu";

import { useIslandTrigger } from "@/src/components/NavbarComponents/useIslandTrigger";
import { IslandController, useIslandOverride } from "@/src/components/NavbarComponents/IslandController";
import { NavbarThemeScope } from "@/src/components/NavbarComponents/ThemeScope";

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
                    className="flex items-center"
                  >
                    {/* island 3-bar toggles the framed inset */}
                    <button
  aria-label={menuIsOpen ? "Close island menu" : "Open island menu"}
  className="rounded-md p-2 min-w-10 min-h-10 hover:bg-white/5"
  onClick={() => {
    menuToggle(); // your existing state
    window.dispatchEvent(new Event("cove:island:menu:toggle")); // tell the frame to open/close
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
