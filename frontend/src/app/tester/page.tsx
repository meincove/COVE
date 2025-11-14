// src/app/tester/page.tsx
"use client";

import SectionOne from "@/src/components/tester/SectionOne";
import SectionTwo from "@/src/components/tester/SectionTwo";
import SectionThree from "@/src/components/tester/SectionThree";
import { useScrollContainer } from "@/src/hooks/useScrollContainer";
// (Optional) only if you want a global page progress later:
// import { useElementScrollProgress } from "@/hooks/useElementScrollProgress";
import { useEffect } from "react";

const FRAME_SELECTOR = ".tester-frame";

export default function TesterPage() {
  // Ensure the container exists (not strictly required, but harmless)
  const el = useScrollContainer(FRAME_SELECTOR);

  // Optional: if you want to log that container is found
  useEffect(() => {
    // console.log("tester frame:", el);
  }, [el]);

  return (
    // IMPORTANT: this element's class must match FRAME_SELECTOR
    <div className="w-full">
      <SectionOne  containerSel={FRAME_SELECTOR} />
      <SectionTwo  containerSel={FRAME_SELECTOR} />
      <SectionThree containerSel={FRAME_SELECTOR} />
    </div>
  );
}
