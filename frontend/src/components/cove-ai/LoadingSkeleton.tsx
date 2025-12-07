// frontend/src/components/cove-ai/LoadingSkeleton.tsx
// Simple loading skeleton for chat messages

export default function LoadingSkeleton() {
    return (
        <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-3 py-2 bg-neutral-800 animate-pulse">
                <div className="h-4 bg-neutral-700 rounded w-48 mb-2"></div>
                <div className="h-4 bg-neutral-700 rounded w-32"></div>
            </div>
        </div>
    );
}
