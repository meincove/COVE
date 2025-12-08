// frontend/src/hooks/useChatHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export type HistoryMessage = {
    role: 'user' | 'assistant';
    content: string;
    kind?: string;
    meta?: any;
    created_at?: string;
};

export function useChatHistory(guestSessionId: string) {
    const { isSignedIn, user } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<HistoryMessage[]>([]);

    // Load history on mount
    const loadHistory = useCallback(async () => {
        if (!guestSessionId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('guestSessionId', guestSessionId);
            if (isSignedIn && user) {
                params.set('clerkUserId', user.id);
            }
            params.set('limit', '50'); // Last 50 messages

            const res = await fetch(`/api/history/load?${params}`);
            if (res.ok) {
                const data = await res.json();
                // Backend returns { messages: [...] } or { items: [...] }
                const messages = data.messages || data.items || [];
                setHistory(messages);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoading(false);
        }
    }, [guestSessionId, isSignedIn, user]);

    // Save message to history
    const saveMessage = useCallback(async (message: HistoryMessage) => {
        if (!guestSessionId) return;

        try {
            await fetch('/api/history/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_session_id: guestSessionId,
                    clerk_user_id: isSignedIn && user ? user.id : undefined,
                    email: isSignedIn && user?.primaryEmailAddress?.emailAddress,
                    ...message,
                }),
            });
        } catch (error) {
            console.error('Failed to save message:', error);
            // Don't throw - history save is non-critical
        }
    }, [guestSessionId, isSignedIn, user]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    return { history, isLoading, saveMessage, loadHistory };
}
