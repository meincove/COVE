// frontend/src/app/api/cart/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";

const DJANGO_BASE_URL = process.env.AI_CORE_DJANGO_URL || "http://127.0.0.1:8001";

export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const userId = params.userId;

        if (!userId) {
            return NextResponse.json(
                { error: "userId required" },
                { status: 400 }
            );
        }

        // Fetch cart from Django backend
        const queryParams = new URLSearchParams({ clerkUserId: userId });
        const res = await fetch(`${DJANGO_BASE_URL}/tools/cart.get?${queryParams}`);

        if (!res.ok) {
            throw new Error(`Backend returned ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Cart fetch error:", error);
        return NextResponse.json(
            { error: "Cart fetch failed", details: error.message },
            { status: 500 }
        );
    }
}
