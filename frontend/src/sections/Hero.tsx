'use client';

import { useState } from 'react';

import HeroSection from '@/src/sections/HeroSection';
import CatalogSection from '@/src/sections/CatalogSection';
import AboutSection from '@/src/sections/AboutSection';
import { WardrobeSection, type WardrobeItem } from '@/src/sections/WardrobeSection';

import catalogData from '@/data/catalogData.json';
import LightRunwayScene from '@/src/components/LightRunway';
import TubelightScene from '@/src/sections/TubelightScene';

// helper: page wrapper
function Page({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-[100svh] w-screen snap-start relative">
      <div className="absolute inset-0">{children}</div>
    </section>
  );
}

export default function LandingPage() {
  const [island, setIsland] = useState(false);

  const allProducts = [
    ...(catalogData?.originals ?? []),
    ...(catalogData?.casual ?? []),
    ...(catalogData?.designer ?? []),
  ];

  const wardrobeItems: WardrobeItem[] = allProducts
    .flatMap((p: any) => {
      const color = p?.colors?.[0];
      if (!color) return [];
      const firstImg = color?.images?.[0];
      const image = firstImg ? `/clothing-images/${firstImg}` : '/clothing-images/placeholder.jpg';
      const slug = color?.slug || p?.slug || p?.id || 'product';
      return [{ slug, name: p?.name ?? 'Cove Item', image, price: p?.basePrice ?? color?.price, tier: p?.tier ?? p?.groupKey }];
    })
    .slice(0, 16);

  const toggleIsland = () => {
    const next = !island;
    setIsland(next);
    window.dispatchEvent(new CustomEvent<boolean>('cove:island:set', { detail: next }));
  };

  return (
    // NOTE: no fixed height here; let the document be taller than the viewport
    <main className="w-screen min-h-[100svh] snap-y snap-mandatory bg-black text-white overflow-x-hidden">

      <div className="fixed right-4 top-24 z-[120]">
  <button
    onClick={() => {
      const goingIsland = !island;        // compute first
      setIsland(goingIsland);              // update local UI state
      // dispatch after the state commit
      requestAnimationFrame(() => {
        if (goingIsland) {
          window.dispatchEvent(new CustomEvent<boolean>("cove:island:set", { detail: true }));
        } else {
          window.dispatchEvent(new Event("cove:island:clear"));
        }
      });
    }}
    className="rounded-full px-4 py-2 text-sm border"
    style={{
      background: "rgba(255,107,107,0.14)",
      borderColor: "rgba(255,107,107,0.6)",
      color: "#ff6b6b",
      boxShadow: "0 6px 16px rgba(0,0,0,.18)",
      backdropFilter: "blur(8px)",
    }}
  >
    Toggle Island/Auto
  </button>
</div>
      
{/* <div className="fixed right-4 top-24 z-[60]">
  <button
    onClick={() => {
      // cycle Full → Island → Auto
      setIsland((prev) => {
        // derive current mode from local boolean + a hidden auto flag
        const next = prev ? "auto" : "island"; // simple two-step; or implement a small 3-state like the dev toggle above
        if (next === "island") {
          window.dispatchEvent(new CustomEvent<boolean>("cove:island:set", { detail: true }));
        } else {
          window.dispatchEvent(new Event("cove:island:clear"));
        }
        return !prev;
      });
    }}
    className="rounded-full px-4 py-2 text-sm border"
    style={{
      background: "rgba(255, 107, 107, 0.14)",
      borderColor: "rgba(255, 107, 107, 0.6)",
      color: "#ff6b6b",
      boxShadow: "0 6px 16px rgba(0,0,0,.18)",
      backdropFilter: "blur(8px)",
    }}
  >
    Toggle Island/Auto
  </button>
</div> */}


      {/* Page 1 */}
      {/* <Page>
        <LightRunwayScene />
      </Page> */}

      {/* Page 2 */}
      <Page>
        <HeroSection />
      </Page>

      {/* Page 3 */}
      {/* <Page>
        <WardrobeSection items={wardrobeItems} title="Live Wardrobe" speed={42} minLoop={18} />
      </Page> */}

      {/* Page 4 */}
      <Page>
        <CatalogSection />
      </Page>

      {/* Page 5 */}
      <Page>
        <TubelightScene />
      </Page>

      {/* Remove About if you only want 5 pages */}
      {/* <Page><AboutSection /></Page> */}
    </main>
  );
}
