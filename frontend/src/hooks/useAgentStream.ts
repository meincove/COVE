// frontend/src/hooks/useAgentStream.ts
import { useState, useRef, useCallback } from 'react';

export type ThinkingStep = {
    icon: string;
    status: string;
    detail?: string;  // Optional to match backend
    done?: boolean;
};

export type StreamState = {
    thinkingSteps: ThinkingStep[];
    introText: string;
    items: any[];
    isStreaming: boolean;
    error: string | null;
    // New fields for all response types
    cartProposal: any | null;
    checkout: any | null;
    answer: string | null;
    kind: string | null;
    suggestedActions: any[] | null;  // Week 6: Context-aware quick replies
};

export function useAgentStream() {
    const [state, setState] = useState<StreamState>({
        thinkingSteps: [],
        introText: '',
        items: [],
        isStreaming: false,
        error: null,
        cartProposal: null,
        checkout: null,
        answer: null,
        kind: null,
        suggestedActions: null,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const sendQuery = useCallback(async (
        message: string,
        userId?: string,
        sessionId?: string
    ) => {
        // Abort previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Reset state
        setState({
            thinkingSteps: [],
            introText: '', // Changed from null to ''
            items: [],
            isStreaming: true,
            error: null,
            cartProposal: null,
            checkout: null,
            answer: null,
            kind: null,
            suggestedActions: null,
        });

        try {
            const response = await fetch('/api/agent-dev/query-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    clerkUserId: userId,
                    guestSessionId: sessionId,
                    top_k: 4,
                }),
                signal: abortController.signal,
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const parts = line.split('\n');
                    if (parts.length < 2) continue;

                    const eventLine = parts.find(p => p.startsWith('event:'));
                    const dataLine = parts.find(p => p.startsWith('data:'));

                    if (!eventLine || !dataLine) continue;

                    const eventType = eventLine.replace('event:', '').trim();
                    const data = JSON.parse(dataLine.replace('data:', '').trim());

                    handleEvent(eventType, data);
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return; // Ignore abort errors
            }

            setState(prev => ({
                ...prev,
                isStreaming: false,
                error: error.message || 'Something went wrong',
            }));
        }
    }, []);

    const handleEvent = (eventType: string, data: any) => {
        switch (eventType) {
            case 'thinking:step':
                setState(prev => ({
                    ...prev,
                    thinkingSteps: [...prev.thinkingSteps, data],
                }));
                break;

            case 'intro':
                setState(prev => ({
                    ...prev,
                    introText: data.text,
                }));
                break;

            case 'items:batch':
                setState(prev => ({
                    ...prev,
                    items: [...prev.items, ...data.items],
                }));
                break;

            case 'done':
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    kind: data.kind || null,
                }));
                break;

            case 'cart_proposal':
                setState(prev => ({
                    ...prev,
                    cartProposal: data,
                    introText: data.answer || '',
                }));
                break;

            case 'checkout':
                setState(prev => ({
                    ...prev,
                    checkout: data,
                    introText: data.answer || '',
                }));
                break;

            case 'answer':
                setState(prev => ({
                    ...prev,
                    answer: data.text || '',
                    introText: data.text || '',
                }));
                break;

            case 'suggestions':
                setState(prev => ({
                    ...prev,
                    suggestedActions: data.suggestions || [],
                }));
                break;

            case 'error':
                setState(prev => ({
                    ...prev,
                    isStreaming: false,
                    error: data.message || 'Something went wrong',
                }));
                break;
        }
    };

    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setState(prev => ({
                ...prev,
                isStreaming: false,
            }));
        }
    }, []);

    return { ...state, sendQuery, cancel };
}
