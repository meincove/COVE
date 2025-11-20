// src/app/api/agent-dev/route.ts
import { NextRequest, NextResponse } from "next/server";

const AI_CORE_BASE_URL =
  process.env.NEXT_PUBLIC_AI_CORE_BASE_URL ?? "http://127.0.0.1:8000";

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
    const res = await fetch(`${AI_CORE_BASE_URL}/ai/agent/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        top_k: topK,
        cartId,
        clerkUserId,
        guestSessionId,
        email,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("agent-dev proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach AI core" },
      { status: 502 }
    );
  }
}
