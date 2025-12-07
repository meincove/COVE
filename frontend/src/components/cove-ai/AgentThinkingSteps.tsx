// frontend/src/components/cove-ai/AgentThinkingSteps.tsx
"use client";

import { useEffect, useState } from "react";

interface ThinkingStep {
    icon: string;
    status: string;
    detail?: string;
}

interface Props {
    steps: ThinkingStep[];
}

export function AgentThinkingSteps({ steps }: Props) {
    // Week 4: Show all steps immediately (no progressive animation)
    // This ensures thinking appears BEFORE products load
    return (
        <div className="mb-4 space-y-2">
            {steps.map((step, idx) => (
                <div
                    key={idx}
                    className="flex items-start gap-3 animate-fade-in"
                >
                    {/* Icon */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm bg-gray-700">
                        {step.icon}
                    </div>

                    {/* Status text */}
                    <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-200">
                            {step.status}
                        </p>
                        {step.detail && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {step.detail}
                            </p>
                        )}
                    </div>

                    {/* Checkmark for all completed steps */}
                    <div className="text-green-400 text-sm pt-0.5">
                        ✓
                    </div>
                </div>
            ))}
        </div>
    );
}
