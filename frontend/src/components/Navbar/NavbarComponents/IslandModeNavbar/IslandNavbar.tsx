"use client";
import { useNavbarMode } from "../../NavbarController";

export default function IslandNavbar() {
  const { setMode } = useNavbarMode();

  return (
    <div className="nav-stick w-full">
      {/* full-width “rail” so height matches Full and covers the top area */}
      <div className="w-full h-16 bg-[#9ca3af]/95 backdrop-blur-sm">
        {/* centered pill */}
        <div className="h-16 flex items-center justify-center">
          <div className="nav-shell px-4 py-2 rounded-2xl shadow">
            <span className="mr-3">ISLAND</span>
            <button
              className="px-3 py-1 rounded bg-black/5 mr-2"
              onClick={() => setMode("menu")}
            >
              Open Menu
            </button>
            <button
              className="px-3 py-1 rounded bg-black/5"
              onClick={() => setMode("full")}
            >
              ← Full
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
