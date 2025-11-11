
// "use client";
// import { useNavbarMode } from "../../NavbarController";

// type Props = { isMenu?: boolean };

// export default function IslandNavbar({ isMenu = false }: Props) {
//   const { setMode } = useNavbarMode();

//   return (
//     // zero-height sticky anchor that follows .tester-frame scrolling
//     <div className="island-anchor">
//       {/* the actual pill is absolutely positioned over the anchor */}
//       <div className="island-pill nav-shell px-4 py-2 rounded-2xl shadow flex items-center gap-3">
//         <span className="opacity-70 tracking-wide text-sm">ISLAND</span>

//         {/* Menu toggle only flips the middle button */}
//         {!isMenu ? (
//           <button
//             aria-label="Open menu"
//             className="px-2 py-1 rounded bg-black/5"
//             onClick={() => setMode("menu")}
//           >
//             ☰
//           </button>
//         ) : (
//           <button
//             aria-label="Close menu"
//             className="px-2 py-1 rounded bg-black text-white"
//             onClick={() => setMode("island")}
//           >
//             Close
//           </button>
//         )}

//         {!isMenu && (
//           <button
//             className="ml-1 px-3 py-1 rounded bg-black/5"
//             onClick={() => setMode("full")}
//           >
//             ← Full
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }


// src/components/Navbar/NavbarComponents/IslandModeNavbar/IslandNavbar.tsx
"use client";

import { useNavbarMode } from "../../NavbarController";
// ⬇️ adjust this import to your real search bar path
import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

type Props = { isMenu?: boolean };

export default function IslandNavbar({ isMenu = false }: Props) {
  const { setMode } = useNavbarMode();

  return (
    <div className="island-anchor">
      <div
        className={[
          "island-pill nav-shell rounded-2xl shadow grid items-center gap-2",
          isMenu ? "grid-cols-[auto_auto]" : "grid-cols-[auto_1fr_auto] withSearch",
          "px-3 py-2"
        ].join(" ")}
      >
        {/* LEFT: label */}
        <span className="opacity-70 tracking-wide text-sm">
          {isMenu ? "MENU" : "ISLAND"}
        </span>

        {/* CENTER: Search only in island mode */}
        {!isMenu && (
          <div className="min-w-[220px] w-full">
            <SearchBar />
          </div>
        )}

        {/* RIGHT: Toggle button */}
        {isMenu ? (
          <button
            aria-label="Close menu"
            className="px-3 py-1.5 rounded-md bg-red-600 text-white font-medium"
            onClick={() => setMode("island")}
          >
            Close
          </button>
        ) : (
          <button
            aria-label="Open menu"
            className="px-2 py-1 rounded-md bg-black/5"
            onClick={() => setMode("menu")}
          >
            ☰
          </button>
        )}
      </div>
    </div>
  );
}
