
// "use client";

// import { useNavbarMode } from "../../NavbarController";
// // ⬇️ adjust this import to your real search bar path
// import SearchBar from "@/src/components/Navbar/NavbarComponents/NavbarParts/SearchBar";

// type Props = { isMenu?: boolean };

// export default function IslandNavbar({ isMenu = false }: Props) {
//   const { setMode } = useNavbarMode();

//   return (
//     <div className="island-anchor">
//       <div
//         className={[
//           "island-pill nav-shell rounded-2xl shadow grid items-center gap-2",
//           isMenu ? "grid-cols-[auto_auto]" : "grid-cols-[auto_1fr_auto] withSearch",
//           "px-3 py-2"
//         ].join(" ")}
//       >
//         {/* LEFT: label */}
//         <span className="opacity-70 tracking-wide text-sm">
//           {isMenu ? "MENU" : "ISLAND"}
//         </span>

//         {/* CENTER: Search only in island mode */}
//         {!isMenu && (
//           <div className="min-w-[220px] w-full">
//             <SearchBar />
//           </div>
//         )}

//         {/* RIGHT: Toggle button */}
//         {isMenu ? (
//           <button
//             aria-label="Close menu"
//             className="px-3 py-1.5 rounded-md bg-red-600 text-white font-medium"
//             onClick={() => setMode("island")}
//           >
//             Close
//           </button>
//         ) : (
//           <button
//             aria-label="Open menu"
//             className="px-2 py-1 rounded-md bg-black/5"
//             onClick={() => setMode("menu")}
//           >
//             ☰
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }


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
      <div className="w-full h-16 flex items-center justify-center">
        {/* the actual pill; restore interactivity */}
        <div
          id="cove-navbar-shell"
          className="nav-shell pointer-events-auto px-3 py-2 rounded-2xl shadow flex items-center gap-3"
        >
          <span className="text-sm font-medium tracking-wide">
            {isMenu ? "MENU" : "ISLAND"}
          </span>

          {/* Center: search only in island (not in menu) */}
          {!isMenu && (
            <div className="min-w-0 flex-1">
              <SearchBar />
            </div>
          )}

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
