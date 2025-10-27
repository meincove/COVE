import { NextResponse } from "next/server";

// Try your preferred import first:
import { createCheckoutSession } from "@/src/lib/api/payments";
// If your tsconfig doesn't have "@/lib" path alias, use one of these instead:
// import { createCheckoutSession } from "@/src/lib/api/payments";
// import { createCheckoutSession } from "../../../lib/api/payments";

export async function GET() {
  const ok = typeof createCheckoutSession === "function";
  return NextResponse.json({ ok });
}
