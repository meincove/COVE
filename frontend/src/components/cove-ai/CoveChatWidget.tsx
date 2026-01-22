"use client";

import { useState, useEffect, useMemo, useRef, FormEvent, forwardRef, useImperativeHandle } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Send,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  Box,
  ShoppingCart,
  Check,
  ChevronRight,
  Sparkles,
  Wand2,
  ShoppingBag,
  RefreshCw,
  MoreHorizontal
} from "lucide-react";
// Note: react-markdown removed - not currently used

import { useCartSessionStore } from "@/src/store/cartSessionStore";
import { useCartStore } from "@/src/store/cartStore";
import {
  AgentItem,
  AgentCartPayload,
  AgentResponse,
} from "@/types/agent";
import type { CartItem } from "@/types/cart";
import ProductCarousel from "@/src/components/cove-ai/ProductCarousel";
import SuggestedQueries from "@/src/components/cove-ai/SuggestedQueries";
import { AgentThinkingSteps } from "@/src/components/cove-ai/AgentThinkingSteps";
import LoadingSkeleton from './LoadingSkeleton';
import AgenticOutfitBuilder from './AgenticOutfitBuilder';
import { useOutfitStore } from '@/src/hooks/useOutfitStore';
import Toast, { ToastType } from "@/src/components/cove-ai/Toast";
import { useAgentStreaming } from "@/src/hooks/useAgentStreaming";
import { useAgentStream } from "@/src/hooks/useAgentStream";
import { useChatHistory } from "@/src/hooks/useChatHistory";
import { TypingIndicator, StreamingCursor } from "@/src/components/cove-ai/TypingIndicator";
import ThinkingSteps from "@/src/components/cove-ai/ThinkingSteps";
import EnhancedThinking from "@/src/components/cove-ai/EnhancedThinking";  // Phase 1
import PersonalizedGreeting from "@/src/components/cove-ai/PersonalizedGreeting";
import InteractiveQuestionOptions from "@/src/components/cove-ai/InteractiveQuestionOptions";
import { useLayoutStore } from "@/src/store/layoutStore";
import CandidateExplorationPanel from "@/src/components/cove-ai/CandidateExplorationPanel";
import { useOutfitEvents } from "@/src/hooks/useOutfitEvents";


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
  // Phase 1: Enhanced thinking
  thinking_events?: AgentResponse["thinking_events"];
  tools_used?: AgentResponse["tools_used"];
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

// ✨ PHASE 6: Props for mode-specific behavior
// ✨ BUBBLES: Added onThinkingChange for status pill
interface CoveChatWidgetProps {
  mode?: 'chat' | 'outfit_builder';
  onThinkingChange?: (thinking: boolean, steps: { icon: string; status: string }[]) => void;
  onQuickAction?: (text: string) => void;
  onTabChange?: (tab: 'chat' | 'outfit_builder' | 'cart') => void;
  onOutfitReady?: () => void;
}

function CoveChatWidgetInner({ mode = 'chat', onThinkingChange, onQuickAction, onTabChange, onOutfitReady }: CoveChatWidgetProps, ref: React.Ref<{ sendQuickMessage: (msg: string, image?: File) => void; clearChat: () => void }>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Internal quick action handler - will be set after sendStreamingQuery is defined
  const internalQuickActionRef = useRef<(msg: string) => void>(() => { });

  // Has the user sent at least one message in this widget?
  const [hasStartedChat, setHasStartedChat] = useState(false);
  // Have we already fetched + shown the greeting in this widget?
  const [hasSentGreeting, setHasSentGreeting] = useState(false);

  // Week 4: Toast notifications
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Candidate Exploration Panel state - auto-opens during outfit building
  const [isCandidatePanelOpen, setIsCandidatePanelOpen] = useState(false);


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
    thinking_events: streamThinkingEvents,
    tools_used: streamToolsUsed,
    agenticEvents,  // ✨ PHASE 6: Live product exploration
    questionOptions,  // Interactive question options for conversation flow
  } = useAgentStream();

  // Phase 3: Layout Store integration for Virtual Trial Room
  const setGeneratedOutfit = useLayoutStore((s) => s.setGeneratedOutfit);

  // Week 6: Chat history persistence
  const sessionId = guestSessionId || ensureGuestSessionId();
  const { history, isLoading: historyLoading, saveMessage } = useChatHistory(sessionId);

  // ✨ PHASE 6: Centralized Outfit Event Processing
  // Updates the global outfit store from streaming events (normalizes categories etc.)
  useOutfitEvents(agenticEvents);

  // Subscribe to store for reactive UI updates
  const outfitCategories = useOutfitStore(state => state.categories);

  // ✨ FIX: Panel Interaction Logic
  const manuallyClosedRef = useRef(false);

  // Reset manual close flag when new stream starts
  useEffect(() => {
    if (agenticEvents.length === 0) {
      manuallyClosedRef.current = false;
    }
  }, [agenticEvents.length]);

  // Auto-open panel when agentic events arrive - Respect Manual Close!
  useEffect(() => {
    // Only auto-open if we are ACTIVELY streaming.
    // If streaming is finished, do not auto-open (prevents loop with auto-dismiss).
    // ✨ CHANGED: Removed the mode check so this opens in outfit_builder too (consolidated UI)
    if (agenticEvents.length > 0 && !isCandidatePanelOpen && !manuallyClosedRef.current && isStreamingProgress) {
      setIsCandidatePanelOpen(true);
    }
  }, [agenticEvents, isCandidatePanelOpen, isStreamingProgress]);

  // Auto-dismiss panel when streaming ends
  useEffect(() => {
    // If streaming finished, start exit timer.
    // We intentionally exclude isCandidatePanelOpen from deps so this ONLY
    // fires when streaming state changes (finishes), not when user toggles the panel later.
    if (!isStreamingProgress && agenticEvents.length > 0) {
      const timer = setTimeout(() => {
        setIsCandidatePanelOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isStreamingProgress, agenticEvents.length]);

  // Week 6: Router for navigation (no page refresh)
  const router = useRouter();

  // Week 6: Disabled auto-load of chat history (prevents seeing old chats)
  // Users start fresh each time - history is still saved to DB
  /*
  useEffect(() => {
    if (!historyLoading && history.length > 0 && messages.length === 0) {
      // Convert history to chat messages
      const historyMessages: ChatMessage[] = history.map((h, i) => ({
        id: `history - ${ i } -${ Date.now() } `,
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

  // Auto-open Candidate Panel when building starts (agentic events arrive)
  // Only if we are NOT in outfit builder mode (since that view already shows progress)


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

  // ✨ BUBBLES: Expose sendQuickMessage method to parent via ref
  useImperativeHandle(ref, () => ({
    clearChat: () => {
      setMessages([]);
      setHasStartedChat(false);
      setHasSentGreeting(false);
      setToast({ message: "Chat history cleared", type: 'success' });
    },
    sendQuickMessage: async (msg: string, image?: File) => {
      if (!msg.trim() && !image) return;

      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: msg.trim(),
        // TODO: Handle image display in message if needed
      };

      setMessages(prev => [...prev, userMsg]);
      setLoading(true);

      if (!hasStartedChat) {
        setHasStartedChat(true);
        // Mark that user has chatted (for personalized greeting on next visit)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cove_has_chatted', 'true');
        }
      }

      // Save user message to history
      saveMessage({
        role: 'user',
        content: userMsg.content,
      });

      try {
        const sessionId = guestSessionId ?? ensureGuestSessionId();

        // Send via streaming query
        await sendStreamingQuery(
          userMsg.content,
          isSignedIn && user ? user.id : undefined,
          sessionId,
          mode === 'outfit_builder' ? 'outfit_builder' : undefined
        );
      } catch (err: any) {
        console.error("Error talking to agent:", err);
        const errorMsg: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: 'Sorry, something went wrong talking to Cove AI. Please try again.',
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    }
  }), [hasStartedChat, isSignedIn, user, guestSessionId, ensureGuestSessionId, mode, saveMessage, sendStreamingQuery]);

  // ✨ BUBBLES: Internal quick action handler for PersonalizedGreeting and suggested actions
  const handleInternalQuickAction = async (text: string) => {
    if (!text.trim()) return;

    // If parent provides onQuickAction, use that (FloatingChatbot controls input)
    if (onQuickAction) {
      onQuickAction(text);
      return;
    }

    // Otherwise, handle internally (fallback for standalone usage)
    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    if (!hasStartedChat) {
      setHasStartedChat(true);
    }

    saveMessage({
      role: 'user',
      content: userMsg.content,
    });

    try {
      const sessionId = guestSessionId ?? ensureGuestSessionId();

      await sendStreamingQuery(
        userMsg.content,
        isSignedIn && user ? user.id : undefined,
        sessionId,
        mode === 'outfit_builder' ? 'outfit_builder' : undefined
      );
    } catch (err: any) {
      console.error("Error talking to agent:", err);
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: 'Sorry, something went wrong talking to Cove AI. Please try again.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // -------- SUBMIT HANDLER --------

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim()) return;

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
      // ✨ PHASE 6: Use mode prop to determine sessionType (no keyword detection)
      await sendStreamingQuery(
        userMsg.content,
        isSignedIn && user ? user.id : undefined,
        sessionId,
        mode === 'outfit_builder' ? 'outfit_builder' : undefined
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
        cp && cp.size ? ` in size ${String(cp.size).toUpperCase()} ` : "";

      const summary =
        firstItem && cp
          ? `I found ${firstItem.title}${sizeLabel}. Add this to your cart ? `
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



      // Week 6: Trigger Virtual Trial Room ONLY for outfit builder responses
      // Not for simple product queries like "show me hoodies"
      // Use STRICT phrases to avoid false positives from casual "outfit" mentions
      const answerLower = data.answer?.toLowerCase() || '';
      const isOutfitResponse = answerLower.includes('built a complete outfit') ||
        answerLower.includes('complete outfit for you') ||
        answerLower.includes("i've built") ||
        answerLower.includes('your outfit is ready') ||
        answerLower.includes('€0.00 total');  // Outfit builder signature
      if (items.length > 0 && isOutfitResponse) {
        setGeneratedOutfit(items);
      }


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
            thinking_events: data.thinking_events,  // Phase 1: Enhanced thinking
            tools_used: data.tools_used,  // Phase 1: Tool tracking
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
  // ✨ BUBBLES: Track previous streaming state to prevent infinite loops
  const prevStreamingRef = useRef(false);
  // ✨ BUBBLES: Track processed responses to avoid duplicates
  const lastProcessedIntroRef = useRef<string | null>(null);

  useEffect(() => {
    // Only notify when streaming state actually changes
    const streamingChanged = prevStreamingRef.current !== isStreamingProgress;

    // ✨ BUBBLES: Reset response tracking when new streaming session starts
    if (isStreamingProgress && streamingChanged) {
      lastProcessedIntroRef.current = null;
    }

    if (isStreamingProgress && thinkingSteps.length > 0) {
      // Notify parent about thinking state (only if streaming just started or steps updated)
      if (streamingChanged || thinkingSteps.length > 0) {
        onThinkingChange?.(true, thinkingSteps);
      }

      // Map streaming steps to EnhancedThinking format
      const mappedEvents = thinkingSteps.map((step, idx) => ({
        id: `stream - step - ${idx} `,
        timestamp: Date.now(),
        agent: getAgentFromIcon(step.icon), // simple helper to map icon to agent type
        action: step.status, // "status" in streaming is the text description
        status: step.done ? "done" : "pending",
        details: step.detail
      }));

      // ✨ BUBBLES CHANGE: Do not show thinking bubble in chat list, only in the header pill
      // The onThinkingChange callback above handles the pill update.
      /* 
      setMessages(prev => {
        const hasThinkingMsg = prev.some(m => m.id === 'thinking-temp');

        if (!hasThinkingMsg) {
          return [...prev, {
            id: 'thinking-temp',
            role: 'assistant',
            content: '',
            meta: {
              kind: 'recommendations',
              items: [],
              thinking_events: mappedEvents as any 
            } as RecommendationsMeta
          }];
        }

        return prev.map(m =>
          m.id === 'thinking-temp'
            ? {
              ...m,
              meta: {
                ...m.meta,
                kind: 'recommendations',
                thinking_events: mappedEvents as any
              } as RecommendationsMeta
            }
            : m
        );
      });
      */
    }
    // ✨ BUBBLES: Clear thinking state when streaming ends (only if it actually ended)
    if (!isStreamingProgress && prevStreamingRef.current) {
      onThinkingChange?.(false, []);
    }

    // Update ref for next comparison
    prevStreamingRef.current = isStreamingProgress;
  }, [isStreamingProgress, thinkingSteps]);

  function getAgentFromIcon(icon: string): string {
    if (icon.includes("🧠")) return "classifier";
    if (icon.includes("🔍")) return "search";
    if (icon.includes("✨")) return "stylist";
    if (icon.includes("💰")) return "budget";
    if (icon.includes("📏")) return "fit";
    return "classifier"; // default
  }

  // Week 6: Replace thinking message with final result
  useEffect(() => {
    // Skip if still streaming or no intro text
    if (isStreamingProgress || !introText) return;

    // Skip if we already processed this exact response
    if (lastProcessedIntroRef.current === introText) return;

    console.log('[CoveChatWidget] Processing response:', { kind, introText: introText?.substring(0, 50), items: streamedItems.length });

    // Handle recommendations WITH items
    if (streamedItems.length > 0) {
      // Mark as processed
      lastProcessedIntroRef.current = introText;

      // ✨ TRIGGER VIRTUAL TRIAL ROOM (Fix for Streaming)
      // Only for outfit builder responses, not simple product queries
      // Use STRICT phrases to avoid false positives from casual "outfit" mentions
      const introLower = introText.toLowerCase();
      const isOutfitResponse = introLower.includes('built a complete outfit') ||
        introLower.includes('complete outfit for you') ||
        introLower.includes("i've built") ||
        introLower.includes('your outfit is ready') ||
        introLower.includes('€0.00 total');  // Outfit builder signature
      if (isOutfitResponse) {
        setGeneratedOutfit(streamedItems);
      }

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
              // Phase 1: Include thinking_events and tools_used from streaming
              thinking_events: streamThinkingEvents ?? undefined,
              tools_used: streamToolsUsed ?? undefined,
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
          thinking_events: streamThinkingEvents,
          tools_used: streamToolsUsed,
        },
      });
    }
    // ✨ BUBBLES FIX: Handle introText WITHOUT items (e.g., simple text response from recommendations intent)
    else if (streamedItems.length === 0 && kind !== 'answer') {
      // Mark as processed
      lastProcessedIntroRef.current = introText;

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'thinking-temp');
        // Only add if no message with this exact content exists already
        const hasContent = filtered.some(m => m.content === introText);
        if (hasContent) return filtered;

        return [
          ...filtered,
          {
            id: makeId(),
            role: 'assistant',
            content: introText,
          }
        ];
      });
      saveMessage({
        role: 'assistant',
        content: introText,
      });
    }
  }, [isStreamingProgress, introText, streamedItems, suggestedActions, saveMessage, streamThinkingEvents, streamToolsUsed, kind]);

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

    // ✅ VALIDATION: Check if we have required fields
    if (!payload.variantId) {
      console.error("[CART_ADD] Missing variantId!", { cp, firstItem });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: "❌ Can't add - missing product variant. Please try selecting a specific product." }
            : m,
        ),
      );
      return;
    }

    if (!payload.size) {
      console.warn("[CART_ADD] Missing size, may fail");
    }

    console.log("[CART_ADD] Sending payload:", payload);

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

      const responseData = await cartAddRes.json().catch(() => ({}));
      console.log("[CART_ADD] Response:", { status: cartAddRes.status, data: responseData });

      if (!cartAddRes.ok) {
        console.error("Cart add failed:", responseData);
        throw new Error(responseData.message || `Cart add failed: ${cartAddRes.status} `);
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
        imageUrl: firstItem.imageUrl || "",  // Use image from AI response
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

  // NOTE: useImperativeHandle is defined earlier (around line 333) with both clearChat and sendQuickMessage

  // -------- RENDER --------

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Messages list - Muted neutral background, hidden scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-16 pb-4 space-y-4 bg-neutral-100/80 scrollbar-hide">

        {/* OUTFIT BUILDER MODE: Show only the outfit builder, no chat messages */}
        {mode === 'outfit_builder' ? (
          <div className="flex flex-col h-full">
            <AgenticOutfitBuilder
              streamEvents={agenticEvents}
              isActive={true}
            />
          </div>
        ) : (
          <>
            {/* CHAT MODE: Show personalized greeting when no messages */}
            {messages.length === 0 && !isStreamingProgress && (
              <PersonalizedGreeting onQuickAction={handleInternalQuickAction} />
            )}

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
                  className={`flex ${isUser ? "flex-col items-end" : "items-start gap-2"} animate-in fade-in slide-in-from-bottom-4 duration-300`}
                >
                  {/* Bot Avatar - Left side, top aligned, smaller */}
                  {!isUser && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center mt-1">
                      <span className="text-white text-[10px] font-bold">B</span>
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed overflow-hidden ${isUser
                      ? "bg-gray-900 text-white font-medium shadow-md"
                      : "bg-white border border-gray-200 shadow-sm text-gray-700"
                      }`}
                  >
                    {/* Phase 1: Old streaming thinking pills removed - now using EnhancedThinking component below */}

                    {/* Phase 1: Show enhanced thinking if available */}
                    {/* ✨ BUBBLES CHANGE: Hiding thinking details in chat, only shown in header pill */}
                    {/*
                {recMeta && (recMeta.thinking_events || recMeta.tools_used) && (
                  <EnhancedThinking
                    thinking_events={recMeta.thinking_events}
                    tools_used={recMeta.tools_used}
                    loading={isStreamingProgress && m.id === messages[messages.length - 1].id}
                  />
                )}
                */}

                    {/* Show content (answer text) always */}
                    {m.content && <p className="whitespace-pre-wrap font-normal">{m.content}</p>}

                    {/* Week 4: Fallback for original thinking steps if no enhanced thinking */}
                    {/*
                {!recMeta?.thinking_events && !recMeta?.tools_used &&
                  recMeta?.thinking_steps && recMeta.thinking_steps.length > 0 && (
                    <AgentThinkingSteps steps={recMeta.thinking_steps} />
                  )}
                */}

                    {/* Recommendations - show ONLY if not an outfit response */}
                    {/* Outfits are displayed in the Outfit Builder tab, not as carousels in chat */}
                    {recMeta?.items && recMeta.items.length > 0 && (() => {
                      // Detect if this is an outfit response (should not show carousel)
                      const contentLower = m.content?.toLowerCase() || '';
                      const isOutfitContent = contentLower.includes('built a complete outfit') ||
                        contentLower.includes('complete outfit for you') ||
                        contentLower.includes("i've built") ||
                        contentLower.includes('your outfit is ready') ||
                        contentLower.includes('€0.00 total') ||
                        contentLower.includes('curated outfit') ||
                        contentLower.includes('look 1') ||
                        contentLower.includes('3 outfits');

                      // Only show carousel for regular product recommendations, not outfits
                      if (isOutfitContent) return null;

                      return (
                        <div className="mt-4">
                          <ProductCarousel items={recMeta.items} />
                        </div>
                      );
                    })()}

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

                  {/* Message Status - only for user messages */}
                  {isUser && (() => {
                    const msgIndex = messages.findIndex(msg => msg.id === m.id);
                    const hasNextBotMessage = messages.slice(msgIndex + 1).some(msg => msg.role === 'assistant');
                    const isLastMessage = msgIndex === messages.length - 1;
                    const showRead = hasNextBotMessage || (isLastMessage && isStreamingProgress);
                    // Generate timestamp for status
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
                    return (
                      <span className="text-[10px] text-gray-400 mt-0.5 mr-1">
                        {showRead ? 'Read' : 'Delivered'} · {timeStr}
                      </span>
                    );
                  })()}
                </div>
              );
            })}

            {/* Welcome suggestions removed - PersonalizedGreeting handles the empty state */}

            {/* Generic Query Thinking Indicator - shows spinning icon when not an outfit query */}
            {isStreamingProgress && agenticEvents.length === 0 && mode !== 'outfit_builder' && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-4 py-3 flex items-center gap-2.5">
                  {/* Spinning Icon */}
                  <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500 font-medium">Thinking...</span>
                </div>
              </div>
            )}

            {/* Round 3: Skeleton hidden as thinking is in pill */}
            {/* {loading && thinkingSteps.length === 0 && <LoadingSkeleton />} */}

            {/* Interactive Question Options for Conversation Flow */}
            {!isStreamingProgress && questionOptions && questionOptions.options && questionOptions.options.length > 0 && (
              <div className="px-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <InteractiveQuestionOptions
                  inputType={questionOptions.input_type}
                  options={questionOptions.options}
                  allowCustom={questionOptions.allow_custom}
                  sliderConfig={questionOptions.slider_config}
                  onSelect={(value) => {
                    // Auto-send the selected value
                    setInput(value);
                    setTimeout(() => {
                      const form = document.querySelector('form') as HTMLFormElement;
                      form?.requestSubmit();
                    }, 50);
                  }}
                  onFocusInput={() => {
                    // Focus the main input field for custom typing
                    // Use setTimeout to ensure the DOM is ready
                    setTimeout(() => {
                      const inputEl = document.querySelector('input[type="text"][placeholder="Write a message..."]') as HTMLInputElement;
                      if (inputEl) {
                        inputEl.focus();
                        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 100);
                  }}
                  disabled={loading}
                />
              </div>
            )}

            {/* ✨ Chat mode: Show outfit notification when agentic events complete */}
            {agenticEvents.length > 0 && (
              <div className="px-3 mb-4">
                {isStreamingProgress ? (
                  /* Show "Building outfit" when streaming */
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-gray-600">Building your outfit...</span>
                  </div>
                ) : (
                  /* Done streaming - show "Outfit Ready" notification */
                  <button
                    onClick={() => {
                      onTabChange?.('outfit_builder');
                      onOutfitReady?.();
                    }}
                    className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3 hover:bg-emerald-100 transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                      <span className="text-base">✨</span>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-emerald-900 text-sm">Outfit Ready!</p>
                      <p className="text-xs text-emerald-600">Tap to view in Outfit Builder</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </button>
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Input - Hidden since FloatingChatbot has its own input */}
      <form
        onSubmit={handleSubmit}
        className="hidden"
      >
        <input
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
          placeholder="Write a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-1 text-sm rounded-full bg-black text-white disabled:opacity-40"
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

      {/* Candidate Exploration Panel - Visible in Chat Mode */}
      <CandidateExplorationPanel
        isOpen={isCandidatePanelOpen}
        onClose={() => {
          setIsCandidatePanelOpen(false);
          manuallyClosedRef.current = true; // Prevent auto-reopen
        }}
        categories={outfitCategories}
        isBuilding={isStreamingProgress}
      />
    </div>
  );
}

// Export with forwardRef
const CoveChatWidget = forwardRef<{ sendQuickMessage: (msg: string, image?: File) => void; clearChat: () => void }, CoveChatWidgetProps>(CoveChatWidgetInner);
export default CoveChatWidget;
