"use client";

import { Send, ShoppingCart, HelpCircle, ArrowRight, Sparkles, Package, RefreshCw, Check } from "lucide-react";

interface SuggestedAction {
    id: string;
    text: string;
    query: string;
    type: "action" | "question" | "navigation" | "discovery" | "account";
    icon?: string;
    priority: number;
}

interface SuggestedQueriesProps {
    suggestions: SuggestedAction[];
    onSelect: (query: string) => void;
    disabled?: boolean;
}

export default function SuggestedQueries({
    suggestions,
    onSelect,
    disabled = false,
}: SuggestedQueriesProps) {
    if (!suggestions || suggestions.length === 0) return null;

    const getIcon = (iconName?: string) => {
        if (!iconName) return null;

        const iconMap: Record<string, React.ReactNode> = {
            shopping_cart: <ShoppingCart className="h-3 w-3" />,
            help_circle: <HelpCircle className="h-3 w-3" />,
            arrow_right: <ArrowRight className="h-3 w-3" />,
            sparkles: <Sparkles className="h-3 w-3" />,
            package: <Package className="h-3 w-3" />,
            refresh: <RefreshCw className="h-3 w-3" />,
            check: <Check className="h-3 w-3" />,
        };

        return iconMap[iconName] || <Send className="h-3 w-3" />;
    };

    const getButtonStyle = (type: string) => {
        const baseStyle = `
      px-3 py-1.5 rounded-full text-xs font-medium
      transition-all duration-200
      flex items-center gap-1.5
      disabled:opacity-50 disabled:cursor-not-allowed
      transform hover:scale-[1.02]
    `;

        switch (type) {
            case "action":
                return `${baseStyle} bg-black text-white hover:bg-gray-800`;
            case "question":
                return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200`;
            case "navigation":
                return `${baseStyle} bg-white text-gray-600 hover:bg-gray-50 border border-gray-200`;
            case "discovery":
                return `${baseStyle} bg-gray-800 text-white hover:bg-gray-700`;
            case "account":
                return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200`;
            default:
                return `${baseStyle} bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200`;
        }
    };

    return (
        <div className="flex flex-wrap gap-2 mt-3 animate-fade-in-up">
            {suggestions.map((suggestion, idx) => (
                <button
                    key={suggestion.id || idx}
                    onClick={() => !disabled && onSelect(suggestion.query)}
                    disabled={disabled}
                    className={getButtonStyle(suggestion.type)}
                    style={{
                        animationDelay: `${idx * 50}ms`,
                    }}
                >
                    {getIcon(suggestion.icon)}
                    <span>{suggestion.text}</span>
                </button>
            ))}

            <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
        </div>
    );
}
