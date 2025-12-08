"use client";

import { useState, useEffect, useMemo, useRef, FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Send, X, Check, Package, ShoppingCart } from "lucide-react";

import { useCartSessionStore } from "@/src/store/cartSessionStore";
import { useCartStore } from "@/src/store/cartStore";
import type { CartItem } from "@/types/cart";
import type {
  AgentItem,
  AgentCartPayload,
  AgentResponse,
} from "@/types/agent";
import ChatProductCard from "@/src/components/cove-ai/ChatProductCard";
import ProductCarousel from "@/src/components/cove-ai/ProductCarousel";
import SuggestedQueries from "@/src/components/cove-ai/SuggestedQueries";
import { AgentThinkingSteps } from "@/src/components/cove-ai/AgentThinkingSteps";
import LoadingSkeleton from "@/src/components/cove-ai/LoadingSkeleton";
import Toast, { ToastType } from "@/src/components/cove-ai/Toast";
import { useAgentStreaming } from "@/src/hooks/useAgentStreaming";
import { useAgentStream } from "@/src/hooks/useAgentStream";
import { useChatHistory } from "@/src/hooks/useChatHistory";
import { TypingIndicator, StreamingCursor } from "@/src/components/cove-ai/TypingIndicator";
import ThinkingSteps from "@/src/components/cove-ai/ThinkingSteps";
import PersonalizedGreeting from "@/src/components/cove-ai/PersonalizedGreeting";

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
  suggestedActions?: import("@/types/agent").SuggestedAction[];
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
  const USE_STREAMING = process.env.NEXT_PUBLIC_USE_STREAMING === 'true';  // Week 5: Streaming (optional - feature flagged)
  const {
    streamingMessage,
    isStreaming: isStreamingText,
    sendStreamingMessage,
  } = useAgentStreaming();

  // Week 6: Real-time thinking progress + ALL response types
  const {
    thinkingSteps,
    introText,
    items: streamedItems,
    error: streamError,
    isStreaming: isStreamingProgress,
    sendQuery: sendStreamingQuery,
    cartProposal,
    checkout,
    answer,
    kind,
    suggestedActions,
  } = useAgentStream();

  // Week 6: Chat history persistence
  const sessionId = guestSessionId || ensureGuestSessionId();
  const { history, isLoading: historyLoading, saveMessage } = useChatHistory(sessionId);

  // Week 6: Router for navigation (no page refresh)
  const router = useRouter();

  // Week 6: Disabled auto-load of chat history (prevents seeing old chats)
  // Users start fresh each time - history is still saved to DB
  /*
  useEffect(() => {
    if (!historyLoading && history.length > 0 && messages.length === 0) {
      // Convert history to chat messages
      const historyMessages: ChatMessage[] = history.map((h, i) => ({
        id: `history-${i}-${Date.now()}`,
        role: h.role,
        content: h.content,
        meta: h.meta,
      }));
      setMessages(historyMessages);
      setHasStartedChat(true); // Mark as started if we have history
    }
  }, [history, historyLoading]);
  */

  // Clear messages when user signs out or signs in (prevents showing wrong user's history)
  useEffect(() => {
    // Clear messages and reset chat when auth state changes
    setMessages([]);
    setHasStartedChat(false);
  }, [isSignedIn, user?.id]);

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

  // -------- AUTO-GREETING EFFECT (DISABLED - Using PersonalizedGreeting component instead) --------
  /*
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
  */



  // -------- SUBMIT HANDLER --------

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || loading || isStreamingProgress) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = input.trim().toLowerCase();
    setInput("");
    setLoading(true);

    // Week 6: Save user message to history
    saveMessage({
      role: 'user',
      content: userMsg.content,
    });

    try {
      const sessionId = guestSessionId ?? ensureGuestSessionId();

      if (!hasStartedChat) {
        setHasStartedChat(true);
      }

      // Week 6: ALL queries use streaming - backend decides routing!
      // No hardcoded patterns - let the agent's classify() decide
      await sendStreamingQuery(
        userMsg.content,
        isSignedIn && user ? user.id : undefined,
        sessionId
      );

    } catch (err: any) {
      console.error("Error talking to agent:", err);
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "Sorry, something went wrong talking to Cove AI. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
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
          orders: data.orders, // Fixed: data.orders is already the array
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

  // Week 6: Add thinking message when streaming starts
  useEffect(() => {
    if (isStreamingProgress && thinkingSteps.length > 0) {
      // Check if we already have a thinking message
      const hasThinkingMsg = messages.some(m => m.id === 'thinking-temp');

      if (!hasThinkingMsg) {
        // Add a temporary thinking message
        const thinkingMsg: ChatMessage = {
          id: 'thinking-temp',
          role: 'assistant',
          content: '',
        };
        setMessages(prev => [...prev, thinkingMsg]);
      } else {
        // Update the thinking message with latest steps
        setMessages(prev => prev.map(m =>
          m.id === 'thinking-temp'
            ? { ...m, content: '' } // Content doesn't matter, steps render separately
            : m
        ));
      }
    }
  }, [isStreamingProgress, thinkingSteps]);

  // Week 6: Replace thinking message with final result
  useEffect(() => {
    if (!isStreamingProgress && introText && streamedItems.length > 0) {
      // Remove thinking message and add final result
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'thinking-temp');
        return [
          ...filtered,
          {
            id: makeId(),
            role: 'assistant',
            content: introText,
            meta: {
              kind: 'recommendations',
              items: streamedItems,
            },
            suggestedActions: suggestedActions || [],
          }
        ];
      });

      // Week 6: Save assistant message to history
      saveMessage({
        role: 'assistant',
        content: introText,
        kind: 'recommendations',
        meta: {
          kind: 'recommendations',
          items: streamedItems,
        },
      });
    }
  }, [isStreamingProgress, introText, streamedItems, suggestedActions, saveMessage]);

  // Week 6: Handle cart proposal from streaming
  useEffect(() => {
    if (!isStreamingProgress && cartProposal) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'thinking-temp');
        return [
          ...filtered,
          {
            id: makeId(),
            role: 'assistant' as const,
            content: cartProposal.answer || '',
            meta: {
              kind: 'cart_proposal' as const,
              agentResponse: {
                kind: 'cart_proposal' as const,
                answer: cartProposal.answer || '',
                cart_payload: cartProposal.cart_payload,
                items: cartProposal.items || [],
                citations: [],
              },
            } as CartProposalMeta,
          }
        ];
      });
      saveMessage({
        role: 'assistant',
        content: cartProposal.answer || '',
        kind: 'cart_proposal',
        meta: {
          kind: 'cart_proposal',
          agentResponse: {
            kind: 'cart_proposal',
            answer: cartProposal.answer || '',
            cart_payload: cartProposal.cart_payload,
            items: cartProposal.items || [],
            citations: [],
          },
        }
      });
    }
  }, [isStreamingProgress, cartProposal, saveMessage]);

  // Week 6: Handle checkout from streaming
  useEffect(() => {
    if (!isStreamingProgress && checkout) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'thinking-temp');
        return [
          ...filtered,
          {
            id: makeId(),
            role: 'assistant',
            content: checkout.answer || 'Your checkout is ready!',
            meta: {
              kind: 'checkout_ready',
              paymentUrl: checkout.paymentUrl,
              checkoutPageUrl: checkout.checkoutPageUrl,
              total: checkout.total,
              currency: checkout.currency,
            },
          }
        ];
      });
      saveMessage({
        role: 'assistant',
        content: checkout.answer || '',
        kind: 'checkout_ready',
        meta: {
          kind: 'checkout_ready',
          paymentUrl: checkout.paymentUrl,
          checkoutPageUrl: checkout.checkoutPageUrl,
          total: checkout.total,
          currency: checkout.currency,
        }
      });
    }
  }, [isStreamingProgress, checkout, saveMessage]);

  // Week 6: Handle plain answers from streaming
  useEffect(() => {
    if (!isStreamingProgress && answer && kind === 'answer') {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'thinking-temp');
        return [
          ...filtered,
          {
            id: makeId(),
            role: 'assistant',
            content: answer,
          }
        ];
      });
      saveMessage({
        role: 'assistant',
        content: answer,
        kind: 'answer',
      });
    }
  }, [isStreamingProgress, answer, kind, saveMessage]);

  // -------- CART / CHECKOUT ACTIONS --------

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
        {/* Personalized Greeting - NEW! */}
        {messages.length === 0 && !isStreamingProgress && <PersonalizedGreeting />}

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
              className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-300`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm text-neutral-50 overflow-hidden ${isUser ? "chat-msg-user" : "chat-msg-assistant"
                  }`}
              >
                {/* Week 6: Show thinking steps inline for temp message */}
                {!isUser && m.id === 'thinking-temp' && isStreamingProgress && (
                  <div className="flex flex-wrap gap-2">
                    {thinkingSteps.map((step, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <span className="text-base">{step.icon}</span>
                        <span className="text-purple-200">{step.status}</span>
                        {step.done && <Check className="h-3 w-3 text-green-400" />}
                      </div>
                    ))}
                  </div>
                )}

                {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}


                {/* Recommendations */}
                {recMeta?.items && recMeta.items.length > 0 && (
                  <div className="mt-1">
                    <ProductCarousel items={recMeta.items} />
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
                      onClick={() => window.location.href = (checkoutMeta.checkoutPageUrl || '/checkoutpage')}
                      className="block w-full px-4 py-2 text-center rounded-lg border border-gray-300 text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      📋 Review Cart First
                    </button>
                    <button
                      onClick={() => window.open(checkoutMeta.paymentUrl, '_blank')}
                      className="block w-full px-4 py-2 text-center rounded-lg bg-green-500 text-white font-medium hover:bg-green-400 transition"
                    >
                      💳 Proceed to Payment ({checkoutMeta.currency || 'EUR'} {(checkoutMeta.total || 0).toFixed(2)})
                    </button>
                  </div>
                )}

                {/* Week 4: Order history */}
                {orderMeta && orderMeta.orders && Array.isArray(orderMeta.orders) && orderMeta.orders.length > 0 && (
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

                {/* Week 6: Suggested Actions (Context-aware quick replies) */}
                {!isUser && m.suggestedActions && m.suggestedActions.length > 0 && (
                  <SuggestedQueries
                    suggestions={m.suggestedActions}
                    onSelect={(query) => {
                      // Auto-send by setting input and triggering submit
                      setInput(query);
                      // Trigger form submission after a brief delay to ensure input is set
                      setTimeout(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        form?.requestSubmit();
                      }, 50);
                    }}
                    disabled={loading}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Welcome suggestions - shown when chat is empty */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-neutral-200 mb-2">
                👋 Hey! What can I help you find today?
              </h3>
              <p className="text-sm text-neutral-400">
                Try one of these to get started:
              </p>
            </div>
            <SuggestedQueries
              suggestions={[
                { id: 'welcome-1', text: '✨ Show me trending styles', query: 'Show me trending styles' },
                { id: 'welcome-2', text: '🧥 I need a hoodie', query: 'Show me some hoodies' },
                { id: 'welcome-3', text: '👕 Looking for tees', query: 'Show me some tees' },
                { id: 'welcome-4', text: '🎨 Surprise me!', query: 'Recommend something cool' },
              ]}
              onSelect={async (query) => {
                setInput(query);
                setTimeout(() => {
                  const form = document.querySelector('form') as HTMLFormElement;
                  form?.requestSubmit();
                }, 50);
              }}
              disabled={loading}
            />
          </div>
        )}

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
      {
        toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )
      }
    </div >
  );
}
