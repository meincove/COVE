"use client";
import { useNavbarMode } from "../../NavbarController";

export default function FullNavbar() {
  const { setMode } = useNavbarMode();

  return (
    <div className="nav-stick w-full">
      <div className="nav-shell w-full">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="h-16 flex items-center justify-between">
            <div>FULL • COVE</div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded bg-black/5"
                onClick={() => setMode("island")}
              >
                → Island
              </button>
              <button
                className="px-3 py-1 rounded bg-black/5"
                onClick={() => setMode("menu")}
              >
                Open Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
