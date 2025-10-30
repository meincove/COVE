"use client";
import { useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [resp, setResp] = useState<string>("Say hi 👋");

  async function send() {
    const r = await fetch("/api/cove-ai/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const j = await r.json();
    setResp(j.reply ?? JSON.stringify(j));
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button className="rounded-full px-4 py-2 border" onClick={() => setOpen(true)}>
          Ask Cove
        </button>
      ) : (
        <div className="w-[360px] max-w-[90vw] rounded-2xl border bg-black/80 backdrop-blur p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm opacity-80">Cove AI</span>
            <button className="text-xs opacity-60" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="min-h-[120px] max-h-[240px] overflow-auto text-sm border rounded-lg p-2 mb-2">
            {resp}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 rounded-lg border bg-transparent px-2 py-1 text-sm"
                   value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type a message…" />
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
