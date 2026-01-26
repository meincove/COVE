// frontend/src/app/api/history/save/route.ts
import { NextRequest, NextResponse } from 'next/server';

const DJANGO_BASE = process.env.DJANGO_BACKEND_URL || 'http://127.0.0.1:8001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${DJANGO_BASE}/ai_profiles/history/log/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('Django history save failed:', response.status);
            // Don't fail the request - history save is non-critical
            return NextResponse.json(
                { ok: false },
                { status: 200 }
            );
        }

        const data = await response.json();
        return NextResponse.json({ ok: true, ...data });
    } catch (error) {
        console.error('History save error:', error);
        return NextResponse.json(
            { ok: false },
            { status: 200 }
        );
    }
}
