
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import CoveTiltButton from "../ui/Button/CoveTiltButton";
// import NavbarController from "@/src/components/Navbar/NavbarController"; // unused

export default function TesterPage() {
  const pathname = usePathname();
  const [on, setOn] = useState(false); // debug toggle for "tester"
  const [selected, setSelected] = useState<"tester" | "hello" | null>(null);

  return (
    <div className="content-surface">
      <main className="mx-auto max-w-6xl px-6 py-24 space-y-24">
        {/* Section 1 */}
        <section className="h-[90vh] p-8 demo-section flex flex-col">
          <h2 className="text-2xl font-semibold">Section 1</h2>
          <p className="mt-2 opacity-80">
            Scroll down. When menu opens, this whole frame shrinks with rounded corners.
          </p>

          {/* fills remaining space and centers the button box */}
          <div className="flex-1 grid place-items-center">
            <div
              className="
                w-full max-w-xl
                rounded-2xl
                bg-violet-50/90 dark:bg-violet-900/20
                shadow-[0_18px_30px_rgba(0,0,0,0.08)]
                ring-1 ring-violet-200/60 dark:ring-white/10
                px-6 py-5
              "
            >
              <div className="flex flex-wrap items-center justify-center gap-6">
                
<CoveTiltButton as="link" href="/" active={pathname?.startsWith("/catalog")}>
  Catalog
</CoveTiltButton>


<CoveTiltButton
  as="button"
  fluid
  active={selected === "tester"}
  onClick={() => setSelected("tester")}
>
  tester
</CoveTiltButton>

<CoveTiltButton
  as="button"
  fluid
  active={selected === "hello"}
  onClick={() => setSelected("hello")}
>
  Hello World
</CoveTiltButton>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="h-[90vh] p-8 demo-section">
          <h2 className="text-2xl font-semibold">Section 2</h2>
        </section>

        {/* Section 3 */}
        <section className="h-[90vh] p-8 demo-section">
          <h2 className="text-2xl font-semibold">Section 3</h2>
        </section>
      </main>
    </div>
  );
}
