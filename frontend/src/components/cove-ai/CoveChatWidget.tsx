"use client";

import { useState, useRef, useEffect } from "react";

type AgentKind = "answer" | "recommendations" | "cart_proposal";

type AgentItem = {
  title: string;
  url: string;
  slug: string;
  score?: number;
  reason?: string;
  type?: string | null;
  tier?: string | null;
  color?: string | null;
  size?: string | null;
  variantId?: string | null;
};

type CartPayload = {
  variantId: string;
  size: string;
  quantity: number;
  cartId?: string | null;
  clerkUserId?: string | null;
  guestSessionId?: string | null;
  email?: string | null;
};

type AgentTurnResponse = {
  kind: AgentKind;
  answer: string;
  citations: any[];
  items: AgentItem[];
  cart_payload?: CartPayload | null;
  debug_plan?: Record<string, any> | null;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: AgentKind;
  items?: AgentItem[];
  cartPayload?: CartPayload | null;
};

const genId = () => Math.random().toString(36).slice(2);

export default function CoveChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [pendingCart, setPendingCart] = useState<CartPayload | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMsg: Message = {
      id: genId(),
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/cove-ai/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          top_k: 6,
          cartId,
          // later: clerkUserId, guestSessionId, email
        }),
      });

      const data: AgentTurnResponse = await res.json();

      const assistantMsg: Message = {
        id: genId(),
        role: "assistant",
        text: data.answer,
        kind: data.kind,
        items: data.items,
        cartPayload: data.cart_payload ?? null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.kind === "cart_proposal" && data.cart_payload) {
        setPendingCart(data.cart_payload);
      } else {
        setPendingCart(null);
      }
    } catch (err) {
      console.error("Chat send error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant",
          text: "Sorry—something went wrong talking to Cove AI.",
        },
      ]);
      setPendingCart(null);
    } finally {
      setIsSending(false);
    }
  }

  async function confirmCartAdd() {
    if (!pendingCart) return;

    try {
      const res = await fetch("/api/agent-dev/cart-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingCart),
      });

      const data = await res.json();

      if (data.ok && data.cart?.id) {
        const newCartId: string = data.cart.id;
        setCartId(newCartId);

        const summary = `Done — I added it to your cart (cartId: ${newCartId}).`;
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            text: summary,
          },
        ]);
      } else {
        const msg =
          data.message ||
          data.error ||
          "Failed to add item to cart. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            text: msg,
          },
        ]);
      }
    } catch (err) {
      console.error("Cart add error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant",
          text:
            "Something went wrong while updating your cart. Please try again.",
        },
      ]);
    } finally {
      setPendingCart(null);
    }
  }

  function cancelCartAdd() {
    setPendingCart(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <>
      {/* Floating launcher button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg shadow-black/40 border border-white/40 backdrop-blur-md hover:scale-105 transition-transform"
      >
        🧠
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[320px] sm:w-[380px] max-h-[70vh] rounded-2xl border border-white/10 bg-black/90 text-white shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">
                Cove AI
              </span>
              <span className="text-[11px] text-white/50">
                Ask about products, sizes & fit.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-white/60 hover:text-white/90"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[75%] rounded-2xl bg-white text-black px-3 py-2 text-xs sm:text-sm"
                      : "max-w-[80%] rounded-2xl bg-white/5 px-3 py-2 text-xs sm:text-sm border border-white/10"
                  }
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {/* Inline cards for recommendations */}
                  {m.role === "assistant" &&
                    m.kind === "recommendations" &&
                    m.items &&
                    m.items.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {m.items.slice(0, 3).map((item) => (
                          <a
                            key={item.slug}
                            href={item.url}
                            className="block rounded-xl border border-white/10 bg-black/40 px-3 py-2 hover:border-white/40 transition-colors"
                          >
                            <div className="text-xs font-semibold">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-white/60">
                              {item.type && <span>{item.type}</span>}
                              {item.color && (
                                <span> · {item.color.toLowerCase()}</span>
                              )}
                              {item.size && <span> · size {item.size}</span>}
                            </div>
                            {item.reason && (
                              <div className="mt-1 text-[11px] text-white/50">
                                {item.reason}
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Cart confirmation bar */}
          {pendingCart && lastAssistant?.kind === "cart_proposal" && (
            <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-[11px] sm:text-xs flex items-center justify-between gap-2">
              <span className="text-white/80">
                Confirm: add {pendingCart.variantId} (size{" "}
                {pendingCart.size.toUpperCase()}) to your cart?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={confirmCartAdd}
                  className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400"
                >
                  Yes, add
                </button>
                <button
                  onClick={cancelCartAdd}
                  className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Cove AI about products, sizes…"
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isSending || !input.trim()}
              className="rounded-md bg-white text-black text-xs sm:text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
