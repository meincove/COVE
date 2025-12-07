// frontend/src/components/cove-ai/Toast.tsx
// Simple toast notification component

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgClass = {
        success: "bg-green-500/90",
        error: "bg-red-500/90",
        info: "bg-blue-500/90",
    }[type];

    const icon = {
        success: "✓",
        error: "✕",
        info: "ℹ",
    }[type];

    return (
        <div
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 transition-all duration-300 ${bgClass} ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
        >
            <span className="font-bold text-lg">{icon}</span>
            <p className="text-sm">{message}</p>
        </div>
    );
}
