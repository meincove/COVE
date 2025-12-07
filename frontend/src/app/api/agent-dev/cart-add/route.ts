// frontend/src/app/api/agent-dev/cart-add/route.ts
// Direct cart add endpoint for confirmed cart proposals
import { NextRequest, NextResponse } from "next/server";

const AI_CORE_URL =
  process.env.AI_CORE_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward to AI core cart_add endpoint
    const res = await fetch(`${AI_CORE_URL}/ai/agent/cart_add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error in /api/agent-dev/cart-add:", err);
    return NextResponse.json(
      { error: "Internal error adding to cart." },
      { status: 500 },
    );
  }
}
