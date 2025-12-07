// frontend/src/hooks/useAgentStreaming.ts
/**
 * Week 5: EventSource hook for streaming agent responses
 * 
 * This is a NEW hook - existing chat logic unchanged.
 * Use via feature flag for gradual rollout.
 */

import { useState, useCallback, useRef } from 'react';

export interface StreamingMessage {
    intent?: string;
    content: string;
    isComplete: boolean;
    error?: string;
}

export interface UseAgentStreamingReturn {
    streamingMessage: StreamingMessage | null;
    isStreaming: boolean;
    sendStreamingMessage: (message: string, userId: string) => void;
    cancelStreaming: () => void;
}

export function useAgentStreaming(): UseAgentStreamingReturn {
    const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    const cancelStreaming = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    const sendStreamingMessage = useCallback((message: string, userId: string) => {
        // Clean up any existing stream
        cancelStreaming();

        // Initialize streaming state
        setIsStreaming(true);
        setStreamingMessage({
            intent: undefined,
            content: '',
            isComplete: false
        });

        // Build EventSource URL (encode parameters)
        const params = new URLSearchParams({
            message,
            userId,
        });

        // Connect to streaming endpoint via Next.js API route
        const url = `/api/agent-dev/query/stream?${params}`;
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        let accumulatedContent = '';
        let detectedIntent: string | undefined;

        // Handle intent event
        eventSource.addEventListener('intent', (event) => {
            const data = JSON.parse(event.data);
            detectedIntent = data.intent;

            setStreamingMessage(prev => prev ? {
                ...prev,
                intent: detectedIntent
            } : null);

            console.log('📊 Intent:', detectedIntent, `(${data.time_ms}ms)`);
        });

        // Handle stream start
        eventSource.addEventListener('stream_start', () => {
            console.log('🚀 Stream started');
        });

        // Handle token events (the actual text chunks)
        eventSource.addEventListener('token', (event) => {
            const data = JSON.parse(event.data);
            const token = data.token;

            accumulatedContent += token;

            setStreamingMessage(prev => prev ? {
                ...prev,
                content: accumulatedContent,
                isComplete: false
            } : null);
        });

        // Handle stream end
        eventSource.addEventListener('stream_end', (event) => {
            const data = JSON.parse(event.data);
            console.log(`✅ Stream complete in ${data.total_time_ms}ms (${data.token_count} tokens)`);

            setStreamingMessage(prev => prev ? {
                ...prev,
                isComplete: true
            } : null);

            setIsStreaming(false);
            eventSource.close();
            eventSourceRef.current = null;
        });

        // Handle errors
        eventSource.addEventListener('error', (event: Event) => {
            console.error('❌ Stream error:', event);

            setStreamingMessage(prev => prev ? {
                ...prev,
                error: 'Streaming error occurred',
                isComplete: true
            } : null);

            setIsStreaming(false);
            eventSource.close();
            eventSourceRef.current = null;
        });

    }, [cancelStreaming]);

    return {
        streamingMessage,
        isStreaming,
        sendStreamingMessage,
        cancelStreaming
    };
}
