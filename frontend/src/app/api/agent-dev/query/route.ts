// src/app/api/agent-dev/route.ts
import { NextRequest, NextResponse } from "next/server";

const AI_CORE_BASE_URL =
  process.env.NEXT_PUBLIC_AI_CORE_BASE_URL ?? "http://127.0.0.1:8000";

const DJANGO_BACKEND_URL =
  process.env.DJANGO_BACKEND_URL ?? "http://127.0.0.1:8001";

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
    await fetch(`${DJANGO_BACKEND_URL}/ai_profiles/log_chat/`, {
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
    // Don't break dev chat if logging fails
    console.error("agent-dev log_chat failed:", err);
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    message,
    topK = 6,
    cartId,
    clerkUserId,
    guestSessionId,
    email,
  } = body || {};

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Field 'message' (string) is required." },
      { status: 400 }
    );
  }

  try {
    const payload: any = {
      message,
      top_k: topK,
      cartId,
      clerkUserId,
      guestSessionId,
      email,
    };

    const res = await fetch(`${AI_CORE_BASE_URL}/ai/agent/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json().catch(() => ({}));

    // Build a small meta payload for analytics/debug
    const metaBase: LogMeta = {
      source: "agent-dev",
      intent: data?.debug_plan?.intent_kind ?? null,
      kind: data?.kind ?? null,
    };

    // Fire-and-forget logging of user turn
    void logChatTurn({
      guestSessionId,
      clerkUserId,
      role: "user",
      content: message,
      cartId: cartId ?? null,
      meta: metaBase,
    });

    // Fire-and-forget logging of assistant turn
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
    console.error("agent-dev proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach AI core" },
      { status: 502 }
    );
  }
}
