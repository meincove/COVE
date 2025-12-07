// "use client";

// import { useState, useEffect, FormEvent } from "react";
// import { useUser } from "@clerk/nextjs";

// import { useCartSessionStore } from "@/src/store/cartSessionStore";
// import { useCartStore } from "@/src/store/cartStore";
// import type { CartItem } from "@/types/cart";
// import type {
//   AgentItem,
//   AgentCartPayload,
//   AgentResponse,
// } from "@/types/agent";
// import ChatProductCard from "@/src/components/cove-ai/ChatProductCard";

// type BaseMessage = {
//   id: string;
//   role: "user" | "assistant";
//   content: string;
// };

// type CartProposalMeta = {
//   kind: "cart_proposal";
//   agentResponse: AgentResponse;
//   confirmed?: boolean;
//   cancelled?: boolean;
// };

// type RecommendationsMeta = {
//   kind: "recommendations";
//   items: AgentItem[];
// };

// type AssistantMeta = CartProposalMeta | RecommendationsMeta;

// type ChatMessage =
//   | (BaseMessage & { meta?: undefined })
//   | (BaseMessage & { meta: AssistantMeta });

// function makeId() {
//   return Math.random().toString(36).slice(2) + Date.now().toString(36);
// }

// // ---------- TYPE GUARDS ----------

// function isCartProposalMeta(
//   meta: AssistantMeta | undefined,
// ): meta is CartProposalMeta {
//   return meta?.kind === "cart_proposal";
// }

// function isRecommendationsMeta(
//   meta: AssistantMeta | undefined,
// ): meta is RecommendationsMeta {
//   return meta?.kind === "recommendations";
// }

// export default function CoveChatWidget() {
//   const [messages, setMessages] = useState<ChatMessage[]>([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);

//   // NEW: track whether this widget has already sent at least one user message
//   const [hasStartedChat, setHasStartedChat] = useState(false);

//   const { user, isSignedIn } = useUser();

//   const { guestSessionId, ensureGuestSessionId } = useCartSessionStore();
//   const addItem = useCartStore((s) => s.addItem);

//   useEffect(() => {
//     ensureGuestSessionId();
//   }, [ensureGuestSessionId]);

//   async function handleSubmit(e: FormEvent) {
//     e.preventDefault();
//     if (!input.trim() || loading) return;

//     const userMsg: ChatMessage = {
//       id: makeId(),
//       role: "user",
//       content: input.trim(),
//     };

//     setMessages((prev) => [...prev, userMsg]);
//     setInput("");
//     setLoading(true);

//     try {
//       const sessionId = guestSessionId ?? ensureGuestSessionId();

//       // If this is the very first user message in this widget,
//       // tell the backend not to load any old per-user history.
//       const isFirstTurnInThisWidget = !hasStartedChat;

//       const payload: any = {
//         message: userMsg.content,
//         top_k: 4,
//         guestSessionId: sessionId,
//         historyScope: isFirstTurnInThisWidget ? "none" : "user",
//       };

//       if (isSignedIn && user) {
//         payload.clerkUserId = user.id;
//         const emailObj = user.primaryEmailAddress;
//         payload.email = emailObj ? emailObj.emailAddress : null;
//       }

//       // mark that this chat has now started
//       if (!hasStartedChat) {
//         setHasStartedChat(true);
//       }

//       const res = await fetch("/api/agent-dev/query", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         throw new Error(`Query failed: ${res.status}`);
//       }

//       const data: AgentResponse = await res.json();
//       handleAgentResponse(data);
//     } catch (err) {
//       console.error("Error talking to agent:", err);
//       const errorMsg: ChatMessage = {
//         id: makeId(),
//         role: "assistant",
//         content:
//           "Sorry, something went wrong talking to Cove AI. Please try again.",
//       };
//       setMessages((prev) => [...prev, errorMsg]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleAgentResponse(data: AgentResponse) {
//     if (data.kind === "answer") {
//       const msg: ChatMessage = {
//         id: makeId(),
//         role: "assistant",
//         content: data.answer,
//       };
//       setMessages((prev) => [...prev, msg]);
//       return;
//     }

//     if (data.kind === "cart_proposal") {
//       const firstItem = data.items?.[0];
//       const cp = data.cart_payload;

//       const summary =
//         firstItem && cp
//           ? `I found ${firstItem.title} in size ${cp.size}. Add this to your cart?`
//           : data.answer || "I found an item I can add to your cart. Proceed?";

//       const msg: ChatMessage = {
//         id: makeId(),
//         role: "assistant",
//         content: summary,
//         meta: {
//           kind: "cart_proposal",
//           agentResponse: data,
//         },
//       };

//       setMessages((prev) => [...prev, msg]);
//       return;
//     }

//     if (data.kind === "recommendations") {
//       const items = data.items ?? [];

//       const msg: ChatMessage = {
//         id: makeId(),
//         role: "assistant",
//         content:
//           data.answer || "Here are some options that match what you asked for.",
//         meta: items.length
//           ? ({
//               kind: "recommendations",
//               items,
//             } as RecommendationsMeta)
//           : undefined,
//       };

//       setMessages((prev) => [...prev, msg]);
//       return;
//     }

//     const msg: ChatMessage = {
//       id: makeId(),
//       role: "assistant",
//       content: data.answer,
//     };
//     setMessages((prev) => [...prev, msg]);
//   }

//   async function handleConfirmCartProposal(messageId: string) {
//     const target = messages.find(
//       (m) => m.id === messageId && isCartProposalMeta(m.meta),
//     );
//     if (!target || !target.meta) return;

//     const meta = target.meta as CartProposalMeta;
//     const { agentResponse } = meta;
//     const cp = agentResponse.cart_payload;
//     const firstItem = agentResponse.items?.[0];

//     if (!cp || !firstItem) {
//       console.warn("Cart proposal missing cart_payload or items");
//       return;
//     }

//     const sessionId = guestSessionId ?? ensureGuestSessionId();

//     const payload: AgentCartPayload = {
//       ...cp,
//       guestSessionId: sessionId,
//       cartId: cp.cartId ?? null,
//     };

//     try {
//       setMessages((prev) =>
//         prev.map((m) =>
//           m.id === messageId
//             ? { ...m, content: m.content + " (adding...)" }
//             : m,
//         ),
//       );

//       fetch("/api/agent-dev/cart-add", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       }).catch((err) => {
//         console.warn("Background cart-add call failed:", err);
//       });

//       const cartItem: CartItem = {
//         productId: firstItem.slug ?? cp.variantId,
//         variantId: cp.variantId,
//         name: firstItem.title,
//         type: firstItem.type ?? "",
//         tier: firstItem.tier ?? "",
//         size: cp.size,
//         color: firstItem.color ?? "",
//         colorName: firstItem.color ?? "",
//         quantity: cp.quantity,
//         price: 0, // TODO: wire real prices
//         imageUrl: "/clothing-images/placeholder.png",
//         material: "",
//       };

//       await addItem(cartItem);

//       setMessages((prev) =>
//         prev.map((m) =>
//           m.id === messageId && isCartProposalMeta(m.meta)
//             ? {
//                 ...m,
//                 content: "Added to your cart. You can open it from the navbar.",
//                 meta: {
//                   ...m.meta,
//                   confirmed: true,
//                 } as CartProposalMeta,
//               }
//             : m,
//         ),
//       );
//     } catch (err) {
//       console.error("Error in cart-add flow:", err);
//       setMessages((prev) =>
//         prev.map((m) =>
//           m.id === messageId && isCartProposalMeta(m.meta)
//             ? {
//                 ...m,
//                 content:
//                   "I tried to add this to your cart, but something went wrong. Please try again.",
//                 meta: {
//                   ...m.meta,
//                   confirmed: false,
//                 } as CartProposalMeta,
//               }
//             : m,
//         ),
//       );
//     }
//   }

//   function handleCancelCartProposal(messageId: string) {
//     setMessages((prev) =>
//       prev.map((m) =>
//         m.id === messageId && isCartProposalMeta(m.meta)
//           ? {
//               ...m,
//               content: "Okay, I won’t add that item to your cart.",
//               meta: {
//                 ...m.meta,
//                 cancelled: true,
//               } as CartProposalMeta,
//             }
//           : m,
//       ),
//     );
//   }

//   return (
//     <div className="flex flex-col h-full max-h-[600px] rounded-2xl border border-neutral-800 bg-neutral-950/80">
//       {/* Messages list */}
//       <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
//         {messages.map((m) => {
//           const isUser = m.role === "user";

//           const cartMeta = isCartProposalMeta(m.meta)
//             ? (m.meta as CartProposalMeta)
//             : undefined;
//           const recMeta = isRecommendationsMeta(m.meta)
//             ? (m.meta as RecommendationsMeta)
//             : undefined;

//           return (
//             <div
//               key={m.id}
//               className={`flex ${isUser ? "justify-end" : "justify-start"}`}
//             >
//               <div
//                 className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
//                   isUser
//                     ? "bg-neutral-100 text-black"
//                     : "bg-neutral-800 text-neutral-50"
//                 }`}
//               >
//                 <p className="whitespace-pre-wrap">{m.content}</p>

//                 {/* vertical list of product cards */}
//                 {!isUser &&
//                   recMeta &&
//                   recMeta.items &&
//                   recMeta.items.length > 0 && (
//                     <div className="mt-3 space-y-2">
//                       {recMeta.items.map((item, idx) => (
//                         <ChatProductCard
//                           key={`${item.variantId ?? item.slug ?? item.url}-${idx}`}
//                           item={item}
//                         />
//                       ))}
//                     </div>
//                   )}

//                 {/* cart proposal confirm / cancel */}
//                 {cartMeta && !cartMeta.confirmed && !cartMeta.cancelled && (
//                   <div className="mt-2 flex gap-2">
//                     <button
//                       className="px-3 py-1 text-xs rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transition"
//                       onClick={() => handleConfirmCartProposal(m.id)}
//                     >
//                       Add to cart
//                     </button>
//                     <button
//                       className="px-3 py-1 text-xs rounded-full bg-neutral-700 text-neutral-100 hover:bg-neutral-600 transition"
//                       onClick={() => handleCancelCartProposal(m.id)}
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           );
//         })}

//         {loading && (
//           <div className="text-xs text-neutral-400 mt-2">
//             Cove AI is thinking…
//           </div>
//         )}
//       </div>

//       {/* Input */}
//       <form
//         onSubmit={handleSubmit}
//         className="border-t border-neutral-800 px-3 py-2 flex gap-2"
//       >
//         <input
//           className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 outline-none"
//           placeholder="Ask Cove AI anything about products, sizes, fits…"
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//         />
//         <button
//           type="submit"
//           disabled={loading || !input.trim()}
//           className="px-3 py-1 text-sm rounded-full bg-neutral-100 text-black disabled:opacity-40"
//         >
//           Send
//         </button>
//       </form>
//     </div>
//   );
// }

// src/components/cove-ai/CoveChatWidget.tsx
"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
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
import { AgentThinkingSteps } from "@/src/components/cove-ai/AgentThinkingSteps";
import LoadingSkeleton from "@/src/components/cove-ai/LoadingSkeleton";
import Toast, { ToastType } from "@/src/components/cove-ai/Toast";
import { useAgentStreaming } from "@/src/hooks/useAgentStreaming";  // Week 5
import { TypingIndicator, StreamingCursor } from "@/src/components/cove-ai/TypingIndicator";  // Week 5

// ---------- TYPES ----------

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
  thinking_steps?: Array<{ icon: string; status: string; detail?: string }>;  // Week 4: Agentic
};

// Week 4: New metadata types
interface CheckoutData {
  paymentUrl: string;
  checkoutPageUrl?: string;  // Week 4: Option to review cart
  total?: number;
  currency?: string;
  checkoutId?: string;
}

interface CheckoutReadyMeta extends CheckoutData {
  kind: "checkout_ready";
};

type OrderHistoryMeta = {
  kind: "order_history";
  orders: import("@/types/agent").Order[];
};

type EmailConfirmationMeta = {
  kind: "email_confirmed";
  orderId: number;
  sentTo: string;
};

type AssistantMeta =
  | CartProposalMeta
  | RecommendationsMeta
  | CheckoutReadyMeta  // Week 4: Renamed from CheckoutMeta
  | OrderHistoryMeta
  | EmailConfirmationMeta;

type ChatMessage = BaseMessage & {
  meta?: AssistantMeta;
};

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

// Week 4: New type guards
function isCheckoutMeta(
  meta: AssistantMeta | undefined,
): meta is CheckoutReadyMeta {
  return meta?.kind === "checkout_ready";
}

function isOrderHistoryMeta(
  meta: AssistantMeta | undefined,
): meta is OrderHistoryMeta {
  return meta?.kind === "order_history";
}

function isEmailConfirmationMeta(
  meta: AssistantMeta | undefined,
): meta is EmailConfirmationMeta {
  return meta?.kind === "email_confirmed";
}

// ---------- COMPONENT ----------

export default function CoveChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Has the user sent at least one message in this widget?
  const [hasStartedChat, setHasStartedChat] = useState(false);
  // Have we already fetched + shown the greeting in this widget?
  const [hasSentGreeting, setHasSentGreeting] = useState(false);

  // Week 4: Toast notifications
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const { user, isSignedIn } = useUser();

  const { guestSessionId, ensureGuestSessionId } = useCartSessionStore();
  const addItem = useCartStore((s) => s.addItem);

  // Week 5: Streaming support (feature flag)
  const USE_STREAMING = process.env.NEXT_PUBLIC_USE_STREAMING === 'true';
  const {
    streamingMessage,
    isStreaming,
    sendStreamingMessage,
    cancelStreaming
  } = useAgentStreaming();

  // Make sure we *have* a guest session id
  useEffect(() => {
    ensureGuestSessionId();
  }, [ensureGuestSessionId]);

  // Derive a friendly user name once, memoized
  const userName = useMemo(() => {
    if (!user) return null;

    const first = user.firstName?.trim();
    if (first) return first;

    const full = user.fullName?.trim();
    if (full) return full;

    const uname = user.username?.trim();
    if (uname) return uname;

    return null;
  }, [user]);

  // -------- AUTO-GREETING EFFECT (once per widget mount) --------
  // -------- AUTO-GREETING EFFECT (once per widget mount) --------
  useEffect(() => {
    // don’t run twice
    if (hasSentGreeting) return;

    // wait until Clerk has loaded user info (so we can use the name)
    // and until we at least *tried* to initialise the guest session
    // (but we DON’T block if there’s no id yet)
    const sessionId = guestSessionId || ensureGuestSessionId() || null;

    let cancelled = false;

    (async () => {
      try {
        const payload: any = {
          userName,
        };

        // only send sessionId if we actually have one
        if (sessionId) {
          payload.guestSessionId = sessionId;
        }

        if (isSignedIn && user) {
          payload.clerkUserId = user.id;
          const emailObj = user.primaryEmailAddress;
          payload.email = emailObj ? emailObj.emailAddress : null;
        }

        const res = await fetch("/api/agent-dev/greeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.warn("Greeting request failed:", res.status);
          return;
        }

        const data: AgentResponse = await res.json();

        if (!cancelled && data && typeof data.answer === "string") {
          const msg: ChatMessage = {
            id: makeId(),
            role: "assistant",
            content: data.answer,
          };
          setMessages((prev) => [...prev, msg]);
        }
      } catch (err) {
        console.warn("Greeting call failed:", err);
      } finally {
        if (!cancelled) {
          setHasSentGreeting(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hasSentGreeting,
    guestSessionId,
    ensureGuestSessionId,
    userName,
    isSignedIn,
    user,
  ]);


  // -------- SUBMIT HANDLER --------

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

      const isFirstTurnInThisWidget = !hasStartedChat;

      const payload: any = {
        message: userMsg.content,
        top_k: 4,
        guestSessionId: sessionId,
        historyScope: isFirstTurnInThisWidget ? "none" : "user",
        userName,
      };

      if (isSignedIn && user) {
        payload.clerkUserId = user.id;
        const emailObj = user.primaryEmailAddress;
        payload.email = emailObj ? emailObj.emailAddress : null;
      }

      if (!hasStartedChat) {
        setHasStartedChat(true);
      }

      // Week 4: Add request timeout (30s)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch("/api/agent-dev/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Query failed: ${res.status}`);
        }

        const data: AgentResponse = await res.json();
        handleAgentResponse(data);
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
          console.error("Request timed out after 30s");
          const errorMsg: ChatMessage = {
            id: makeId(),
            role: "assistant",
            content: "Request timed out. The server is taking too long to respond. Please try again.",
          };
          setMessages((prev) => [...prev, errorMsg]);
        } else {
          console.error("Error talking to agent:", err);
          const errorMsg: ChatMessage = {
            id: makeId(),
            role: "assistant",
            content: "Sorry, something went wrong talking to Cove AI. Please try again.",
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // -------- RESPONSE HANDLER --------

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

      const sizeLabel =
        cp && cp.size ? ` in size ${String(cp.size).toUpperCase()}` : "";

      const summary =
        firstItem && cp
          ? `I found ${firstItem.title}${sizeLabel}. Add this to your cart?`
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
        content:
          data.answer || "Here are some options that match what you asked for.",
        meta: items.length
          ? ({
            kind: "recommendations",
            items,
            thinking_steps: data.thinking_steps,  // Week 4: FIX - Include thinking steps!
          } as RecommendationsMeta)
          : undefined,
      };

      setMessages((prev) => [...prev, msg]);
      return;
    }

    // Week 4: Checkout ready
    if (data.kind === "checkout_ready" && data.checkout) {
      // Week 4: Store checkout options for user to choose
      const checkoutMeta: CheckoutReadyMeta = {
        kind: "checkout_ready",
        paymentUrl: data.checkout.paymentUrl,
        checkoutPageUrl: data.checkout.checkoutPageUrl || "/checkoutpage",
        total: data.checkout.total || 0,
        currency: data.checkout.currency || "EUR",
      };

      const aiMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer,
        meta: checkoutMeta,
      };

      setMessages((prev) => [...prev, aiMsg]);
      return;
    }

    // Week 4: Order history
    if (data.kind === "order_history" && data.orders) {
      const msg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer || "Here are your recent orders:",
        meta: {
          kind: "order_history",
          orders: data.orders.orders,
        },
      };
      setMessages((prev) => [...prev, msg]);
      return;
    }

    // Week 4: Email confirmation
    if (data.kind === "email_confirmed" && data.emailConfirmation) {
      const msg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: data.answer || "Email confirmation sent!",
        meta: {
          kind: "email_confirmed",
          orderId: data.emailConfirmation.orderId,
          sentTo: data.emailConfirmation.sentTo,
        },
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

  // -------- CART PROPOSAL ACTIONS --------

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

    // Match AI core's AgentCartAddIn schema
    const payload = {
      variantId: cp.variantId,
      size: cp.size,
      quantity: cp.quantity,
      cartId: cp.cartId ?? null,
      clerkUserId: cp.clerkUserId ?? null,
      guestSessionId: sessionId,
      email: cp.email ?? null,
    };

    try {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: m.content + " (adding...)" }
            : m,
        ),
      );

      // Week 4: Proper await with error handling (was fire-and-forget)
      const cartAddRes = await fetch("/api/agent-dev/cart-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!cartAddRes.ok) {
        const errorData = await cartAddRes.json().catch(() => ({}));
        console.error("Cart add failed:", errorData);
        throw new Error(`Cart add failed: ${cartAddRes.status}`);
      }


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
        price: firstItem.price ?? 0,  // Week 4: Use real price if available
        imageUrl: "/clothing-images/placeholder.png",
        material: "",
      };

      await addItem(cartItem);

      // Week 4: Show success toast
      setToast({ message: "Added to cart!", type: "success" });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && isCartProposalMeta(m.meta)
            ? {
              ...m,
              content: "✓ Added to your cart. You can open it from the navbar.",
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
                "Failed to add to cart. Please try again or add it manually from the product page.",
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

  // -------- RENDER --------

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
          // Week 4: Extract new metadata
          const checkoutMeta = isCheckoutMeta(m.meta)
            ? (m.meta as CheckoutReadyMeta)
            : undefined;
          const orderMeta = isOrderHistoryMeta(m.meta)
            ? (m.meta as OrderHistoryMeta)
            : undefined;
          const emailMeta = isEmailConfirmationMeta(m.meta)
            ? (m.meta as EmailConfirmationMeta)
            : undefined;

          return (
            <div
              key={m.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isUser
                  ? "bg-neutral-100 text-black"
                  : "bg-neutral-800 text-neutral-50"
                  }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Week 4: Agent thinking process */}
                {!isUser && recMeta?.thinking_steps && recMeta.thinking_steps.length > 0 && (
                  <AgentThinkingSteps steps={recMeta.thinking_steps} />
                )}

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

                {/* Week 4: Checkout choice buttons */}
                {checkoutMeta && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => window.location.href = checkoutMeta.checkoutPageUrl || '/checkoutpage'}
                      className="block w-full px-4 py-2 text-center rounded-lg border border-gray-300 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      📋 Review Cart First
                    </button>
                    <button
                      onClick={() => window.location.href = checkoutMeta.paymentUrl}
                      className="block w-full px-4 py-2 text-center rounded-lg bg-green-500 text-white font-medium hover:bg-green-400 transition"
                    >
                      💳 Proceed to Payment ({checkoutMeta.currency || 'EUR'} {(checkoutMeta.total || 0).toFixed(2)})
                    </button>
                  </div>
                )}

                {/* Week 4: Order history */}
                {orderMeta && orderMeta.orders && orderMeta.orders.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {orderMeta.orders.map((order, idx) => (
                      <div
                        key={order.orderId}
                        className="p-2 rounded-lg bg-neutral-700/50 border border-neutral-600"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Order #{order.orderId}</p>
                            <p className="text-xs text-neutral-400">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{order.currency}{order.total}</p>
                            <p className="text-xs text-neutral-400">{order.itemCount} items</p>
                          </div>
                        </div>
                        <p className="text-xs text-emerald-400 mt-1">{order.status}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Week 4: Email confirmation */}
                {emailMeta && (
                  <div className="mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-green-400">
                      ✓ Email sent to {emailMeta.sentTo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && <LoadingSkeleton />}

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

      {/* Week 4: Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
