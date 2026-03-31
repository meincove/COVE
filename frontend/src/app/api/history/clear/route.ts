
import { NextRequest, NextResponse } from 'next/server';

const DJANGO_BASE = process.env.DJANGO_BACKEND_URL || 'http://127.0.0.1:8001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward to Django backend
        const response = await fetch(`${DJANGO_BASE}/ai_profiles/history/clear/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('Django history clear failed:', response.status);
            return NextResponse.json(
                { ok: false, error: `Backend returned ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        console.error('History clear error:', error);
        return NextResponse.json(
            { ok: false, error: String(error) },
            { status: 500 }
        );
    }
}
