// src/components/cove-ai/InteractiveQuestionOptions.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sliders } from "lucide-react";

interface QuestionOption {
    label: string;
    value: string;
    icon?: string;
    min?: number;
    max?: number;
}

interface SliderConfig {
    min: number;
    max: number;
    step: number;
    currency: string;
}

interface InteractiveQuestionOptionsProps {
    inputType: 'budget_range' | 'style' | 'occasion' | 'text';
    options: QuestionOption[];
    allowCustom: boolean;
    sliderConfig?: SliderConfig;
    onSelect: (value: string) => void;
    onFocusInput?: () => void;
    disabled?: boolean;
}

export default function InteractiveQuestionOptions({
    inputType,
    options,
    allowCustom,
    sliderConfig,
    onSelect,
    onFocusInput,
    disabled = false,
}: InteractiveQuestionOptionsProps) {
    const [showSlider, setShowSlider] = useState(false);
    const [sliderValue, setSliderValue] = useState<[number, number]>([
        sliderConfig?.min ?? 0,
        sliderConfig?.max ?? 500
    ]);

    // Handle option click
    const handleOptionClick = (option: QuestionOption) => {
        if (disabled) return;
        onSelect(option.value);
    };

    // Handle "Other" click
    const handleOtherClick = () => {
        if (disabled) return;

        if (inputType === 'budget_range' && sliderConfig) {
            // Show slider for budget
            setShowSlider(true);
        } else {
            // Focus text input for style/occasion
            onFocusInput?.();
        }
    };

    // Handle slider confirm
    const handleSliderConfirm = () => {
        const currency = sliderConfig?.currency || '€';
        const budgetText = `${currency}${sliderValue[0]} - ${currency}${sliderValue[1]}`;
        onSelect(budgetText);
        setShowSlider(false);
    };

    return (
        <div className="mt-3">
            <AnimatePresence mode="wait">
                {showSlider ? (
                    // Budget Slider View
                    <motion.div
                        key="slider"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                                Select your budget range
                            </span>
                            <button
                                onClick={() => setShowSlider(false)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Min/Max Inputs */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                        {sliderConfig?.currency || '€'}
                                    </span>
                                    <input
                                        type="number"
                                        value={sliderValue[0]}
                                        onChange={(e) => setSliderValue([parseInt(e.target.value) || 0, sliderValue[1]])}
                                        min={sliderConfig?.min}
                                        max={sliderValue[1]}
                                        step={sliderConfig?.step}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <span className="text-gray-400 mt-5">—</span>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                        {sliderConfig?.currency || '€'}
                                    </span>
                                    <input
                                        type="number"
                                        value={sliderValue[1]}
                                        onChange={(e) => setSliderValue([sliderValue[0], parseInt(e.target.value) || 500])}
                                        min={sliderValue[0]}
                                        max={sliderConfig?.max}
                                        step={sliderConfig?.step}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={handleSliderConfirm}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Confirm Budget
                        </button>
                    </motion.div>
                ) : (
                    // Options Pills View
                    <motion.div
                        key="options"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
                    >
                        {options.map((option, idx) => (
                            <motion.button
                                key={option.value}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleOptionClick(option)}
                                disabled={disabled}
                                className={`
                                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0
                                    transition-all duration-200 transform hover:scale-[1.02]
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    bg-white border border-gray-200 text-gray-700
                                    hover:bg-gray-50 hover:border-gray-300
                                    shadow-sm
                                `}
                            >
                                {option.label}
                            </motion.button>
                        ))}

                        {/* "Other" Button */}
                        {allowCustom && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: options.length * 0.05 }}
                                onClick={handleOtherClick}
                                disabled={disabled}
                                className={`
                                    px-4 py-2 rounded-full text-sm font-medium
                                    transition-all duration-200 transform hover:scale-[1.02]
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    bg-gray-100 border border-gray-200 text-gray-600
                                    hover:bg-gray-200 hover:border-gray-300
                                    flex items-center gap-1.5
                                `}
                            >
                                {inputType === 'budget_range' ? (
                                    <>
                                        <Sliders className="h-3.5 w-3.5" />
                                        Other
                                    </>
                                ) : (
                                    'Other...'
                                )}
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
