// frontend/src/hooks/useAgentStream.ts
import { useState, useRef, useCallback } from 'react';

export type ThinkingStep = {
    icon: string;
    status: string;
    detail?: string;  // Optional to match backend
    done?: boolean;
};

export type QuestionOptions = {
    input_type: 'budget_range' | 'style' | 'occasion' | 'text';
    options: Array<{ label: string; value: string; icon?: string; min?: number; max?: number }>;
    allow_custom: boolean;
    slider_config?: { min: number; max: number; step: number; currency: string };
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
    // Phase 1: Agentic enhancements
    thinking_events: any[] | null;
    tools_used: any[] | null;
    // ✨ PHASE 6: Live product exploration events
    agenticEvents: any[];
    // Interactive question options for conversation flow
    questionOptions: QuestionOptions | null;
    vto_image_url?: string | null;
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
        thinking_events: null,
        tools_used: null,
        agenticEvents: [],  // ✨ PHASE 6: Live exploration

        questionOptions: null,  // Interactive question options
        vto_image_url: null,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const sendQuery = useCallback(async (
        message: string,
        userId?: string,
        sessionId?: string,
        sessionType?: string,  // ✨ PHASE 6: For outfit_builder workflow
        imageUrl?: string,     // ✨ VISION: Image URL
        imageData?: string,    // ✨ VISION: Base64 data
        brand?: string | null  // 🏷️ BRAND FILTER
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
            thinking_events: null,
            tools_used: null,
            agenticEvents: [],  // ✨ PHASE 6
            questionOptions: null,
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
                    sessionType,  // ✨ PHASE 6: Triggers orchestrator for outfit_builder
                    imageUrl,     // ✨ VISION
                    imageData,    // ✨ VISION
                    brand         // 🏷️ BRAND FILTER
                }),
                signal: abortController.signal,
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // Safety timeout to prevent infinite "thinking" state
            const TIMEOUT_MS = 30000;
            let timeoutId: NodeJS.Timeout | undefined;

            const resetTimeout = () => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    console.warn('[useAgentStream] Stream timed out - no data received');
                    if (abortControllerRef.current) abortControllerRef.current.abort();
                    setState(prev => ({
                        ...prev,
                        isStreaming: false,
                        error: 'Response timed out. Please try again.',
                    }));
                }, TIMEOUT_MS);
            };

            resetTimeout(); // Start timeout

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    clearTimeout(timeoutId);
                    break;
                }

                resetTimeout(); // Reset on data received

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

                    // Defensive JSON parsing for SSE events
                    let data;
                    try {
                        data = JSON.parse(dataLine.replace('data:', '').trim());
                    } catch (parseError) {
                        console.warn('[useAgentStream] Failed to parse SSE data:', parseError);
                        continue;
                    }

                    handleEvent(eventType, data);
                }
            }
            // Stream finished naturally
            clearTimeout(timeoutId); // Ensure cleared
            setState(prev => ({ ...prev, isStreaming: false }));
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
                    // Phase 1: Capture thinking_events and tools_used from done event
                    thinking_events: data.thinking_events || null,
                    tools_used: data.tools_used || null,
                    vto_image_url: data.vto_image_url || null,
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
                    // Include question options for interactive UI
                    questionOptions: data.question_options || null,
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

            // ✨ PHASE 6: Handle agentic exploration events
            case 'agentic:category_start':
            case 'agentic:category_candidates':
            case 'agentic:item_selected':
            case 'agentic:category_vetting':
            case 'agentic:budget_set':
            // Also handle non-prefixed events (as sent by backend event_handler)
            case 'category_start':
            case 'category_candidates':
            case 'item_selected':
            case 'category_vetting':
            case 'budget_set':
            case 'complete': // ✨ Add complete event to agentic events
                console.log('🎯 AGENTIC EVENT:', eventType, data);  // DEBUG
                const normalizedType = eventType.startsWith('agentic:') ? eventType.replace('agentic:', '') : eventType;
                setState(prev => ({
                    ...prev,
                    agenticEvents: [...prev.agenticEvents, { event_type: normalizedType, ...data }],
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
