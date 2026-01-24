// frontend/src/app/api/history/load/route.ts
import { NextRequest, NextResponse } from 'next/server';

const DJANGO_BASE = process.env.DJANGO_BACKEND_URL || 'http://127.0.0.1:8001';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    try {
        const url = `${DJANGO_BASE}/ai_profiles/history/?${searchParams}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('Django history load failed:', response.status);
            return NextResponse.json(
                { messages: [] }, // Return empty on error
                { status: 200 } // Don't fail - just return empty
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('History load error:', error);
        return NextResponse.json(
            { messages: [] },
            { status: 200 }
        );
    }
}
