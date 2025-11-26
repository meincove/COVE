// frontend/src/app/api/cove-ai/turn/route.ts
import { NextRequest, NextResponse } from "next/server";

const AI_CORE_URL =
  process.env.AI_CORE_URL ?? "http://127.0.0.1:8000"; // cove-ai-core

const DJANGO_URL =
  process.env.DJANGO_BACKEND_URL ?? "http://127.0.0.1:8001"; // Django

type LogMeta = Record<string, unknown>;

async function logChatTurn(params: {
  guestSessionId?: string | null;
  clerkUserId?: string | null;
  role: "user" | "assistant";
  content: string;
  agent_kind?: string | null;
  cartId?: string | null;
  meta?: LogMeta;
}) {
  const {
    guestSessionId,
    clerkUserId,
    role,
    content,
    agent_kind = "cove_ai",
    cartId,
    meta = {},
  } = params;

  try {
    await fetch(`${DJANGO_URL}/ai_profiles/log_chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestSessionId: guestSessionId ?? null,
        clerkUserId: clerkUserId ?? null,
        role,
        content,
        agent_kind,
        cartId: cartId ?? null,
        meta,
      }),
    });
  } catch (err) {
    // Don't break the chat if logging fails
    console.error("log_chat failed:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      message,
      top_k = 6,
      cartId,
      clerkUserId,
      guestSessionId,
      email,
    } = body ?? {};

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Field `message` is required." },
        { status: 400 },
      );
    }

    const payload: any = { message, top_k };
    if (cartId) payload.cartId = cartId;
    if (clerkUserId) payload.clerkUserId = clerkUserId;
    if (guestSessionId) payload.guestSessionId = guestSessionId;
    if (email) payload.email = email;

    // 1) Call cove-ai-core agent
    const res = await fetch(`${AI_CORE_URL}/ai/agent/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({} as any));

    // 2) Fire-and-forget logging into Django
    const metaBase: LogMeta = {
      source: "frontend",
      // useful extras for later analytics
      debug_intent: data?.debug_plan?.intent_kind ?? null,
      kind: data?.kind ?? null,
    };

    // user turn
    void logChatTurn({
      guestSessionId,
      clerkUserId,
      role: "user",
      content: message,
      cartId: cartId ?? null,
      meta: metaBase,
    });

    // assistant turn
    const answerText: string =
      typeof data?.answer === "string" ? data.answer : "";

    void logChatTurn({
      guestSessionId,
      clerkUserId,
      role: "assistant",
      content: answerText,
      cartId: data?.cart_payload?.cartId ?? cartId ?? null,
      meta: metaBase,
    });

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error in /api/cove-ai/turn:", err);
    return NextResponse.json(
      { error: "Internal error talking to Cove AI." },
      { status: 500 },
    );
  }
}
