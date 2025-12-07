// frontend/src/app/api/cart/clear/route.ts
import { NextRequest, NextResponse } from "next/server";

const DJANGO_BASE_URL = process.env.AI_CORE_DJANGO_URL || "http://127.0.0.1:8001";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clerkUserId, guestSessionId } = body;

        if (!clerkUserId && !guestSessionId) {
            return NextResponse.json(
                { error: "clerkUserId or guestSessionId required" },
                { status: 400 }
            );
        }

        const res = await fetch(`${DJANGO_BASE_URL}/tools/cart.clear`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clerkUserId, guestSessionId }),
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Cart clear error:", error);
        return NextResponse.json(
            { error: "Cart clear failed", details: error.message },
            { status: 500 }
        );
    }
}
