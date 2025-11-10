"use client";
import { useIslandMenu } from "@/src/components/NavbarComponents/islandMenuStore";

export default function PerimeterBar() {
  const { isOpen } = useIslandMenu();
  if (!isOpen) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[90] flex items-center justify-between px-4"
      style={{
        top: "0",                                   // perimeter lives in the gap
        height: "var(--frame-inset-top, 60px)",     // uses the CSS var set by the store
        background: "rgb(10,38,71)",
        color: "white",
        pointerEvents: "auto",
      }}
    >
      <div className="flex items-center gap-6">
        <button className="opacity-80 hover:opacity-100">COVE</button>
      </div>
      <div className="flex items-center gap-4">
        <button className="opacity-80 hover:opacity-100">Sign in</button>
        <button className="opacity-80 hover:opacity-100">Sign out</button>
        <button className="opacity-80 hover:opacity-100">Dashboard</button>
      </div>
    </div>
  );
}
