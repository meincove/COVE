// frontend/src/app/api/catalog/details/route.ts
import { NextRequest, NextResponse } from "next/server";

const DJANGO_URL =
  process.env.DJANGO_BACKEND_URL ?? "http://127.0.0.1:8001";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const variantId = searchParams.get("variantId");

  if (!slug && !variantId) {
    return NextResponse.json(
      { error: "Either `slug` or `variantId` is required." },
      { status: 400 },
    );
  }

  const qs = new URLSearchParams();
  if (slug) qs.set("slug", slug);
  if (variantId) qs.set("variantId", variantId);

  try {
    const res = await fetch(
      `${DJANGO_URL}/tools/catalog.details?${qs.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Error proxying to catalog.details:", err);
    return NextResponse.json(
      { error: "Error talking to catalog.details" },
      { status: 500 },
    );
  }
}
