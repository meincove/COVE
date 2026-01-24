"use client";

import CoveChatWidget from "@/components/cove-ai/CoveChatWidget";
//import CartButton from "@/components/NavbarComponents/Actions/CartButton";

export default function AgentDevPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Top dev header with real cart button */}
      <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-white/10">
        <div>
          <div className="text-sm font-semibold tracking-wide">
            FULL · COVE
          </div>
          <div className="text-[11px] text-white/50">
            Agent dev playground (local)
          </div>
        </div>

        {/* 👇 replace TEST CART with this */}
        {/* <CartButton /> */}
      </div>

      <div className="p-6 text-sm text-white/60 max-w-xl">
        <p>This is the internal playground for Cove AI. Try things like:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>“Show me some black hoodies in size M”</li>
          <li>“What sizes are available for the black hoodie?”</li>
          <li>“Add a black hoodie in size M to my cart”</li>
        </ul>
      </div>

      <div className="px-6 pb-8">
        <CoveChatWidget />
      </div>
    </main>
  );
}
