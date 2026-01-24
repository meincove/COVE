// src/components/cove-ai/CoveChatLauncher.tsx
"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import CoveChatWidget from "@/components/cove-ai/CoveChatWidget";

export default function CoveChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating launcher button – bottom RIGHT */}
      <button
        type="button"
        aria-label={open ? "Close Cove AI chat" : "Open Cove AI chat"}
        onClick={() => setOpen((v) => !v)}
        className="
          fixed bottom-4 right-4 z-[200]
          flex h-12 w-12 items-center justify-center
          rounded-full border border-white/10
          bg-black/80 text-neutral-50
          shadow-lg shadow-black/40
          backdrop-blur-sm
          hover:bg-black transition
        "
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="
            fixed bottom-20 right-4 z-[200]
            w-[480px] max-w-[calc(100vw-2rem)]
            h-[480px] max-h-[calc(100vh-6rem)]
            rounded-2xl border border-neutral-800
            bg-neutral-950/90
            shadow-xl shadow-black/40 overflow-hidden
          "
        >
          <CoveChatWidget />
        </div>
      )}
    </>
  );
}
