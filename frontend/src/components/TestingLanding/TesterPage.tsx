"use client";

import NavbarController from "@/src/components/Navbar/NavbarController";

export default function TesterPage() {
  return (
    
      
      <div className="content-surface">
        <main className="mx-auto max-w-6xl px-6 py-24 space-y-24">
          <section className="h-[90vh] p-8 demo-section">
            <h2 className="text-2xl font-semibold">Section 1</h2>
            <p className="mt-2 opacity-80">
              Scroll down. When menu opens, this whole frame shrinks with rounded corners.
            </p>
          </section>

          <section className="h-[90vh] p-8 demo-section">
            <h2 className="text-2xl font-semibold">Section 2</h2>
          </section>

          <section className="h-[90vh] p-8 demo-section">
            <h2 className="text-2xl font-semibold">Section 3</h2>
          </section>
        </main>
      </div>
    
  );
}
