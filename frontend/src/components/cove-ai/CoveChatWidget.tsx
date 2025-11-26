"use client";

import { useState, useEffect, FormEvent } from "react";
import { useUser } from "@clerk/nextjs";

import { useCartSessionStore } from "@/src/store/cartSessionStore";
import { useCartStore } from "@/src/store/cartStore";
import type { CartItem } from "@/types/cart";
import type {
  AgentItem,
  AgentCartPayload,
  AgentResponse,
} from "@/types/agent";
import ChatProductCard from "@/src/components/cove-ai/ChatProductCard";

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

type RecommendationsMeta = {
  kind: "recommendations";
  items: AgentItem[];
};

type AssistantMeta = CartProposalMeta | RecommendationsMeta;

type ChatMessage =
  | (BaseMessage & { meta?: undefined })
  | (BaseMessage & { meta: AssistantMeta });

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------- TYPE GUARDS ----------

function isCartProposalMeta(
  meta: AssistantMeta | undefined,
): meta is CartProposalMeta {
  return meta?.kind === "cart_proposal";
}

function isRecommendationsMeta(
  meta: AssistantMeta | undefined,
): meta is RecommendationsMeta {
  return meta?.kind === "recommendations";
}

export default function CoveChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, isSignedIn } = useUser();

  const { guestSessionId, ensureGuestSessionId } = useCartSessionStore();
  const addItem = useCartStore((s) => s.addItem);

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

      const payload: any = {
        message: userMsg.content,
        top_k: 4,
        guestSessionId: sessionId,
      };

      if (isSignedIn && user) {
        payload.clerkUserId = user.id;
        const emailObj = user.primaryEmailAddress;
        payload.email = emailObj ? emailObj.emailAddress : null;
      }

      const res = await fetch("/api/agent-dev/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      const items = data.items ?? [];

      const msg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer || "Here are some options that match what you asked for.",
        meta: items.length
          ? ({
              kind: "recommendations",
              items,
            } as RecommendationsMeta)
          : undefined,
      };

      setMessages((prev) => [...prev, msg]);
      return;
    }

    const msg: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: data.answer,
    };
    setMessages((prev) => [...prev, msg]);
  }

  async function handleConfirmCartProposal(messageId: string) {
    const target = messages.find(
      (m) => m.id === messageId && isCartProposalMeta(m.meta),
    );
    if (!target || !target.meta) return;

    const meta = target.meta as CartProposalMeta;
    const { agentResponse } = meta;
    const cp = agentResponse.cart_payload;
    const firstItem = agentResponse.items?.[0];

    if (!cp || !firstItem) {
      console.warn("Cart proposal missing cart_payload or items");
      return;
    }

    const sessionId = guestSessionId ?? ensureGuestSessionId();

    const payload: AgentCartPayload = {
      ...cp,
      guestSessionId: sessionId,
      cartId: cp.cartId ?? null,
    };

    try {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: m.content + " (adding...)" }
            : m,
        ),
      );

      fetch("/api/agent-dev/cart-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn("Background cart-add call failed:", err);
      });

      const cartItem: CartItem = {
        productId: firstItem.slug ?? cp.variantId,
        variantId: cp.variantId,
        name: firstItem.title,
        type: firstItem.type ?? "",
        tier: firstItem.tier ?? "",
        size: cp.size,
        color: firstItem.color ?? "",
        colorName: firstItem.color ?? "",
        quantity: cp.quantity,
        price: 0, // TODO: wire real prices
        imageUrl: "/clothing-images/placeholder.png",
        material: "",
      };

      await addItem(cartItem);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && isCartProposalMeta(m.meta)
            ? {
                ...m,
                content: "Added to your cart. You can open it from the navbar.",
                meta: {
                  ...m.meta,
                  confirmed: true,
                } as CartProposalMeta,
              }
            : m,
        ),
      );
    } catch (err) {
      console.error("Error in cart-add flow:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && isCartProposalMeta(m.meta)
            ? {
                ...m,
                content:
                  "I tried to add this to your cart, but something went wrong. Please try again.",
                meta: {
                  ...m.meta,
                  confirmed: false,
                } as CartProposalMeta,
              }
            : m,
        ),
      );
    }
  }

  function handleCancelCartProposal(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && isCartProposalMeta(m.meta)
          ? {
              ...m,
              content: "Okay, I won’t add that item to your cart.",
              meta: {
                ...m.meta,
                cancelled: true,
              } as CartProposalMeta,
            }
          : m,
      ),
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] rounded-2xl border border-neutral-800 bg-neutral-950/80">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => {
          const isUser = m.role === "user";

          const cartMeta = isCartProposalMeta(m.meta)
            ? (m.meta as CartProposalMeta)
            : undefined;
          const recMeta = isRecommendationsMeta(m.meta)
            ? (m.meta as RecommendationsMeta)
            : undefined;

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

                {/* vertical list of product cards */}
                {!isUser &&
                  recMeta &&
                  recMeta.items &&
                  recMeta.items.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {recMeta.items.map((item, idx) => (
                        <ChatProductCard
                          key={`${item.variantId ?? item.slug ?? item.url}-${idx}`}
                          item={item}
                        />
                      ))}
                    </div>
                  )}

                {/* cart proposal confirm / cancel */}
                {cartMeta && !cartMeta.confirmed && !cartMeta.cancelled && (
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
