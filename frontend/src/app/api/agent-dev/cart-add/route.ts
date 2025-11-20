import { NextRequest, NextResponse } from "next/server";

const AI_CORE_BASE_URL =
  process.env.AI_CORE_BASE_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${AI_CORE_BASE_URL}/ai/agent/cart_add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  return NextResponse.json(data, { status: res.status });
}
