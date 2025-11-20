// frontend/src/app/agent-dev/page.tsx
"use client";

import CoveChatWidget from "@/components/cove-ai/CoveChatWidget";

export default function AgentDevPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide">FULL · COVE</div>
        <div className="text-[11px] text-white/50">
          Agent dev playground (local)
        </div>
      </div>

      <div className="h-[1px] bg-white/10" />

      <div className="p-6 text-sm text-white/60 max-w-xl">
        <p>This is the internal playground for Cove AI. Try things like:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>“Show me some black hoodies in size M”</li>
          <li>“What sizes are available for the black hoodie?”</li>
          <li>“Add a black hoodie in size M to my cart”</li>
        </ul>
      </div>

      {/* Floating chat widget */}
      <CoveChatWidget />
    </main>
  );
}
