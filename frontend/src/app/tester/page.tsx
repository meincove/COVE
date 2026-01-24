// src/app/tester/page.tsx
"use client";

import SectionOne from "@/components/tester/SectionOne";
import SectionTwo from "@/components/tester/SectionTwo";
import SectionThree from "@/components/tester/SectionThree";
import LightRunwayScene from "@/components/LightRunway";

export default function TesterPage() {
  return (
    <div className="w-full min-h-screen bg-black">
      {/* sections own backgrounds already differ (black / cream / navy) */}
      <SectionOne />

      <LightRunwayScene />

      <SectionTwo />
      <SectionThree />
    </div>
  );
}
