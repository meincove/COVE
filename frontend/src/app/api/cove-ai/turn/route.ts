// frontend/src/app/api/cove-ai/turn/route.ts
import { NextRequest, NextResponse } from "next/server";

const AI_CORE_URL =
  process.env.AI_CORE_URL ?? "http://127.0.0.1:8000"; // cove-ai-core

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
        { status: 400 }
      );
    }

    const payload: any = { message, top_k };
    if (cartId) payload.cartId = cartId;
    if (clerkUserId) payload.clerkUserId = clerkUserId;
    if (guestSessionId) payload.guestSessionId = guestSessionId;
    if (email) payload.email = email;

    const res = await fetch(`${AI_CORE_URL}/ai/agent/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error in /api/cove-ai/turn:", err);
    return NextResponse.json(
      { error: "Internal error talking to Cove AI." },
      { status: 500 }
    );
  }
}
