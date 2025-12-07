// frontend/src/app/api/agent-dev/query/stream/route.ts
/**
 * Week 5: Next.js API route proxy for streaming endpoint
 * 
 * Proxies SSE stream from AI core to browser
 */

import { NextRequest } from 'next/server';

const AI_CORE_URL = process.env.AI_CORE_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const message = searchParams.get('message');
    const userId = searchParams.get('userId');

    if (!message) {
        return new Response('Missing message parameter', { status: 400 });
    }

    try {
        // Call AI core streaming endpoint
        const response = await fetch(`${AI_CORE_URL}/ai/agent/query/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                clerkUserId: userId || undefined,
                historyScope: 'none', // For now, keep simple
            }),
        });

        if (!response.ok) {
            throw new Error(`AI core returned ${response.status}`);
        }

        // Pass through the SSE stream
        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Streaming proxy error:', error);

        // Return error as SSE event
        const errorStream = new ReadableStream({
            start(controller) {
                controller.enqueue(
                    new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
                );
                controller.close();
            }
        });

        return new Response(errorStream, {
            headers: {
                'Content-Type': 'text/event-stream',
            },
        });
    }
}
