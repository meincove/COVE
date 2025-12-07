// frontend/src/components/cove-ai/TypingIndicator.tsx
/**
 * Week 5: Typing animation for streaming responses
 * 
 * Shows animated dots while agent is "thinking" or streaming
 */

export function TypingIndicator() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-3">
            <span className="text-sm text-gray-400">Thinking</span>
            <div className="flex gap-1">
                <div
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '0ms', animationDuration: '1s' }}
                />
                <div
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '150ms', animationDuration: '1s' }}
                />
                <div
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '300ms', animationDuration: '1s' }}
                />
            </div>
        </div>
    );
}

/**
 * Streaming cursor that appears at end of partial text
 */
export function StreamingCursor() {
    return (
        <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5" />
    );
}
