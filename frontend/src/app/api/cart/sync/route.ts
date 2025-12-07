// frontend/src/app/api/cart/sync/route.ts
import { NextRequest, NextResponse } from "next/server";

const DJANGO_BASE_URL = process.env.AI_CORE_DJANGO_URL || "http://127.0.0.1:8001";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clerkUserId, guestSessionId, items } = body;

        if (!clerkUserId && !guestSessionId) {
            return NextResponse.json(
                { error: "clerkUserId or guestSessionId required" },
                { status: 400 }
            );
        }

        // Sync strategy: Clear cart and re-add all items
        // This ensures frontend Zustand state matches backend exactly

        // Step 1: Clear existing cart
        await fetch(`${DJANGO_BASE_URL}/tools/cart.clear`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clerkUserId, guestSessionId }),
        });

        // Step 2: Add each item
        for (const item of items || []) {
            await fetch(`${DJANGO_BASE_URL}/tools/cart.add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    variantId: item.variantId,
                    size: item.size,
                    quantity: item.quantity,
                    clerkUserId,
                    guestSessionId,
                }),
            });
        }

        // Step 3: Fetch updated cart
        const params = new URLSearchParams();
        if (clerkUserId) params.set("clerkUserId", clerkUserId);
        if (guestSessionId) params.set("guestSessionId", guestSessionId);

        const cartRes = await fetch(`${DJANGO_BASE_URL}/tools/cart.get?${params}`);
        const cartData = await cartRes.json();

        return NextResponse.json(cartData);
    } catch (error: any) {
        console.error("Cart sync error:", error);
        return NextResponse.json(
            { error: "Cart sync failed", details: error.message },
            { status: 500 }
        );
    }
}
