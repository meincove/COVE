// frontend/src/app/api/catalog/search/route.ts
import { NextRequest, NextResponse } from "next/server";

const DJANGO_URL =
  process.env.DJANGO_BACKEND_URL ?? "http://127.0.0.1:8001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const res = await fetch(`${DJANGO_URL}/tools/catalog.search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error proxying to catalog.search:", err);
    return NextResponse.json(
      { error: "Error talking to catalog.search" },
      { status: 500 },
    );
  }
}
