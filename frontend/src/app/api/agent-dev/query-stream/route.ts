// frontend/src/app/api/agent-dev/query-stream/route.ts
/**
 * Week 6: Streaming proxy for real-time thinking progress
 * Proxies POST SSE stream from AI core to browser
 */

import { NextRequest } from 'next/server';

const AI_CORE_URL = process.env.AI_CORE_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Call AI core streaming endpoint
        const response = await fetch(`${AI_CORE_URL}/ai/agent/query-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
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
                'X-Accel-Buffering': 'no', // Disable nginx buffering
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
