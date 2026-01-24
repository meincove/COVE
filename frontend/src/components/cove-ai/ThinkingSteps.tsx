// frontend/src/components/cove-ai/ThinkingSteps.tsx
"use client";

import { Check, Loader2 } from "lucide-react";
import { ThinkingStep } from "@/hooks/useAgentStream";

type ThinkingStepsProps = {
  steps: ThinkingStep[];
  compact?: boolean;  // Compact mode for message history
};

export default function ThinkingSteps({ steps, compact = false }: ThinkingStepsProps) {
  if (steps.length === 0) return null;

  if (compact) {
    // Compact view: single line summary
    return (
      <div className="bg-neutral-900/50 rounded-lg px-3 py-2 mb-2 border border-neutral-700/50">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Check className="h-3 w-3 text-green-500" />
          <span>{steps.length} steps completed</span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-500">
            {steps.map(s => s.icon).join(' ')}
          </span>
        </div>
      </div>
    );
  }

  // Full view while streaming
  return (
    <div className="bg-gradient-to-br from-neutral-900/95 to-black/95 rounded-2xl p-4 border border-white/10 backdrop-blur-sm mb-4 animate-fade-in">
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 group animate-slide-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Icon */}
            <div className="flex-shrink-0 text-2xl">{step.icon}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">
                {step.status}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {step.detail}
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0">
              {step.done ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-in {
          opacity: 0;
          animation: slide-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
