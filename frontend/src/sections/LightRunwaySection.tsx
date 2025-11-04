// src/sections/LightRunwaySection.tsx
"use client";
import LightRunwayScene from "@/src/components/LightRunway"; // your working scene
import { useTheme } from "next-themes";

export default function LightRunwaySection() {
  const { theme } = useTheme();
  return (
    <div className="section-wrap">
      <LightRunwayScene theme={(theme as "light" | "dark") ?? "dark"} />
      {/* Optional overlay content */}
      <div className="section-overlay">
        <h1 className="headline">COVE — Light Runway</h1>
        <p className="subcopy">Volumetric beams, soft bloom, tinted gobo.</p>
      </div>
    </div>
  );
}
