"use client";
import { useNavbarMode } from "../../NavbarController";

export default function MenuNavbar() {
  const { setMode } = useNavbarMode();

  return (
    <div className="nav-stick w-full">
      <div className="w-full h-16 bg-[#9ca3af]/95 backdrop-blur-sm">
        <div className="h-16 flex items-center justify-center">
          <div className="nav-shell px-5 py-2 rounded-2xl shadow">
            <span className="mr-3">MENU MODE</span>
            <button
              className="px-3 py-1 rounded bg-black/5"
              onClick={() => setMode("island")}
            >
              Close Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
