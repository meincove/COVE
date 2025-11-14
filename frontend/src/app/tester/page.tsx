// src/app/tester/page.tsx
"use client";

import SectionOne from "@/src/components/tester/SectionOne";
import SectionTwo from "@/src/components/tester/SectionTwo";
import SectionThree from "@/src/components/tester/SectionThree";
import GlobalScrollHUD from "@/src/components/dev/GlobalScrollHUD";

export default function TesterPage() {
  return (
    <div className="w-full min-h-screen bg-black">
      {/* sections own backgrounds already differ (black / cream / navy) */}
      <SectionOne />
      <SectionTwo />
      <SectionThree />

      {/* global page HUD – always visible on /tester */}
      <GlobalScrollHUD containerSel=".tester-frame" />
    </div>
  );
}
