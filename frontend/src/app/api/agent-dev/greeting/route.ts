// src/app/api/agent-dev/greeting/route.ts
import { NextRequest, NextResponse } from "next/server";

const CORE_BASE_URL =
  process.env.COVE_AI_CORE_BASE_URL || "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // We forward only what the backend might reasonably care about.
    const payload = {
      userName: body.userName ?? null,
      guestSessionId: body.guestSessionId ?? null,
      clerkUserId: body.clerkUserId ?? null,
      email: body.email ?? null,
    };

    const res = await fetch(`${CORE_BASE_URL}/ai/assistant/greeting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Core greeting failed:", res.status, text);
      return NextResponse.json(
        {
          kind: "answer",
          answer:
            "Hey! I’m Cove AI. I can help you explore products, sizes, and fits.",
          items: [],
          cart_payload: null,
        },
        { status: 200 },
      );
    }

    const data = await res.json();

    // Normalize to AgentResponse shape (kind = "answer")
    const answer =
      typeof data === "string"
        ? data
        : typeof data?.answer === "string"
          ? data.answer
          : "Hey! I’m Cove AI. I can help you explore products, sizes, and fits.";

    return NextResponse.json(
      {
        kind: "answer",
        answer,
        items: [],
        cart_payload: null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Greeting route error:", err);
    return NextResponse.json(
      {
        kind: "answer",
        answer:
          "Hey! I’m Cove AI. I can help you explore products, sizes, and fits.",
        items: [],
        cart_payload: null,
      },
      { status: 200 },
    );
  }
}
