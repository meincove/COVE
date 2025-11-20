"use client";

import { useState, useEffect, FormEvent } from "react";
import { useCartSessionStore } from "@/src/store/cartSessionStore";
import { useCartStore } from "@/src/store/cartStore";

type AgentItem = {
  title: string;
  url: string;
  slug: string;
  score: number;
  reason?: string;
  type: string;
  tier: string;
  color?: string;
  size?: string;
  variantId: string;
};

type AgentCartPayload = {
  variantId: string;
  size: string;
  quantity: number;
  cartId: string | null;
  clerkUserId: string | null;
  guestSessionId: string | null;
  email: string | null;
};

type AgentResponse = {
  kind: "answer" | "recommendations" | "cart_proposal";
  answer: string;
  citations?: any[];
  items?: AgentItem[];
  cart_payload?: AgentCartPayload;
  debug_plan?: any;
};

type BaseMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CartProposalMeta = {
  kind: "cart_proposal";
  agentResponse: AgentResponse;
  confirmed?: boolean;
  cancelled?: boolean;
};

type ChatMessage =
  | (BaseMessage & { meta?: undefined })
  | (BaseMessage & { meta: CartProposalMeta });

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CoveChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Session (guest) state
  const { guestSessionId, ensureGuestSessionId } = useCartSessionStore();

  // Cart state shared with Navbar CartButton
  const { cartId, setCartId } = useCartStore();

  // Ensure we always have a guestSessionId
  useEffect(() => {
    ensureGuestSessionId();
  }, [ensureGuestSessionId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const sessionId = guestSessionId ?? ensureGuestSessionId();

      const res = await fetch("/api/agent-dev/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          top_k: 4,
          guestSessionId: sessionId,
          cartId: cartId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Query failed: ${res.status}`);
      }

      const data: AgentResponse = await res.json();
      handleAgentResponse(data);
    } catch (err) {
      console.error("Error talking to agent:", err);
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content:
          "Sorry, something went wrong talking to Cove AI. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleAgentResponse(data: AgentResponse) {
    if (data.kind === "answer") {
      const msg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer,
      };
      setMessages((prev) => [...prev, msg]);
      return;
    }

    if (data.kind === "cart_proposal") {
      const firstItem = data.items?.[0];
      const cp = data.cart_payload;

      const summary =
        firstItem && cp
          ? `I found ${firstItem.title} in size ${cp.size}. Add this to your cart?`
          : data.answer || "I found an item I can add to your cart. Proceed?";

      const msg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: summary,
        meta: {
          kind: "cart_proposal",
          agentResponse: data,
        },
      };

      setMessages((prev) => [...prev, msg]);
      return;
    }

    if (data.kind === "recommendations") {
      const msg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer || "Here are some recommendations.",
      };
      setMessages((prev) => [...prev, msg]);
      return;
    }
  }

  async function handleConfirmCartProposal(messageId: string) {
    const target = messages.find(
      (m) => m.id === messageId && m.meta?.kind === "cart_proposal"
    );
    if (!target || !target.meta) return;

    const { agentResponse } = target.meta;
    const cp = agentResponse.cart_payload;
    if (!cp) return;

    const sessionId = guestSessionId ?? ensureGuestSessionId();

    const payload: AgentCartPayload = {
      ...cp,
      guestSessionId: sessionId,
      cartId: cartId ?? cp.cartId ?? null,
    };

    try {
      // Show "adding..." in that bubble
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: m.content + " (adding...)" }
            : m
        )
      );

      const res = await fetch("/api/agent-dev/cart-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`cart-add failed: ${res.status}`);
      }

      const data = await res.json();
      console.log("cart-add response from agent-dev:", data);

      // Try several possible shapes from backend
      const newCartId: string | null =
        data?.cartId ??
        data?.cart_id ??
        data?.id ??
        data?.cart?.id ??
        null;

      if (newCartId) {
        setCartId(newCartId);
      } else {
        console.warn("No cartId found in cart-add response payload");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.meta?.kind === "cart_proposal"
            ? {
                ...m,
                content: newCartId
                  ? `Added to your cart (cartId: ${newCartId}). You can open it from the navbar.`
                  : "Added to your cart. You can open it from the navbar.",
                meta: {
                  ...m.meta,
                  confirmed: true,
                },
              }
            : m
        )
      );
    } catch (err) {
      console.error("Error in cart-add:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.meta?.kind === "cart_proposal"
            ? {
                ...m,
                content:
                  "I tried to add this to your cart, but something went wrong. Please try again.",
                meta: {
                  ...m.meta,
                  confirmed: false,
                },
              }
            : m
        )
      );
    }
  }

  function handleCancelCartProposal(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.meta?.kind === "cart_proposal"
          ? {
              ...m,
              content: "Okay, I won’t add that item to your cart.",
              meta: {
                ...m.meta,
                cancelled: true,
              },
            }
          : m
      )
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] rounded-2xl border border-neutral-800 bg-neutral-950/80">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const isCartProposal = m.meta?.kind === "cart_proposal";

          return (
            <div
              key={m.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isUser
                    ? "bg-neutral-100 text-black"
                    : "bg-neutral-800 text-neutral-50"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {isCartProposal && !m.meta?.confirmed && !m.meta?.cancelled && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="px-3 py-1 text-xs rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transition"
                      onClick={() => handleConfirmCartProposal(m.id)}
                    >
                      Add to cart
                    </button>
                    <button
                      className="px-3 py-1 text-xs rounded-full bg-neutral-700 text-neutral-100 hover:bg-neutral-600 transition"
                      onClick={() => handleCancelCartProposal(m.id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="text-xs text-neutral-400 mt-2">
            Cove AI is thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-neutral-800 px-3 py-2 flex gap-2"
      >
        <input
          className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none"
          placeholder="Ask Cove AI anything about products, sizes, fits…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-1 text-sm rounded-full bg-neutral-100 text-black disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
