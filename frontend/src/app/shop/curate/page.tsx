'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface CurationPreferences {
    stylePreference: string[]
    occasion: string[]
    fitPreference: string
    budgetRange: string
    colorPreferences: string[]
    location?: {
        city: string
        allowed: boolean
    }
}

const questions = [
    {
        id: 1,
        title: "What's your style vibe?",
        subtitle: "Select all that match your aesthetic",
        type: "multiple",
        options: [
            { value: "casual", label: "Casual Everyday", emoji: "👕", color: "from-blue-400 to-cyan-400" },
            { value: "bold", label: "Bold & Original", emoji: "⚡", color: "from-purple-400 to-pink-400" },
            { value: "designer", label: "Designer Streetwear", emoji: "👔", color: "from-slate-700 to-slate-900" },
            { value: "limited", label: "Limited Edition", emoji: "💎", color: "from-yellow-400 to-orange-400" },
            { value: "exploring", label: "Just Exploring", emoji: "🔍", color: "from-green-400 to-emerald-400" }
        ]
    },
    {
        id: 2,
        title: "What's the occasion?",
        subtitle: "Where will you wear these pieces?",
        type: "multiple",
        options: [
            { value: "daily", label: "Daily Wear", emoji: "☀️", color: "from-amber-400 to-yellow-400" },
            { value: "events", label: "Special Events", emoji: "🎉", color: "from-rose-400 to-pink-400" },
            { value: "work", label: "Work/Professional", emoji: "💼", color: "from-slate-500 to-slate-700" },
            { value: "athletic", label: "Athletic/Active", emoji: "⚽", color: "from-green-500 to-teal-500" },
            { value: "all", label: "All Occasions", emoji: "✨", color: "from-indigo-400 to-purple-400" }
        ]
    },
    {
        id: 3,
        title: "How do you like your fit?",
        subtitle: "Choose your preferred style",
        type: "single",
        options: [
            { value: "relaxed", label: "Relaxed Fit", emoji: "🌊", color: "from-blue-300 to-cyan-300" },
            { value: "regular", label: "Regular Fit", emoji: "👌", color: "from-slate-400 to-slate-600" },
            { value: "slim", label: "Slim Fit", emoji: "📏", color: "from-purple-400 to-indigo-400" },
            { value: "oversized", label: "Oversized", emoji: "🎨", color: "from-pink-400 to-rose-400" },
            { value: "skip", label: "Not Sure", emoji: "🤷", color: "from-gray-300 to-gray-400" }
        ]
    },
    {
        id: 4,
        title: "What's your budget range?",
        subtitle: "We'll show you the best options",
        type: "single",
        options: [
            { value: "budget", label: "Budget-Friendly", emoji: "💵", desc: "Under $50", color: "from-green-400 to-emerald-400" },
            { value: "mid", label: "Mid-Range", emoji: "💳", desc: "$50 - $150", color: "from-blue-400 to-indigo-400" },
            { value: "premium", label: "Premium", emoji: "💎", desc: "$150 - $300", color: "from-purple-400 to-pink-400" },
            { value: "luxury", label: "Luxury", emoji: "👑", desc: "$300+", color: "from-yellow-400 to-orange-400" },
            { value: "no-pref", label: "No Preference", emoji: "🎯", desc: "Show me everything", color: "from-slate-400 to-slate-600" }
        ]
    },
    {
        id: 5,
        title: "What colors speak to you?",
        subtitle: "Select your favorite palettes",
        type: "multiple",
        options: [
            { value: "neutrals", label: "Neutrals", emoji: "⚫", desc: "Black, White, Gray", color: "from-gray-700 to-slate-900" },
            { value: "earth", label: "Earth Tones", emoji: "🌿", desc: "Brown, Beige, Olive", color: "from-amber-600 to-yellow-700" },
            { value: "bold", label: "Bold Colors", emoji: "🎨", desc: "Red, Blue, Yellow", color: "from-red-500 to-blue-500" },
            { value: "pastels", label: "Pastels", emoji: "🌸", desc: "Pink, Lavender, Mint", color: "from-pink-300 to-purple-300" },
            { value: "all", label: "All Colors", emoji: "🌈", desc: "I love variety", color: "from-red-400 via-yellow-400 to-blue-400" }
        ]
    },
    {
        id: 6,
        title: "Help us personalize better",
        subtitle: "Optional: Share your location for weather-based suggestions",
        type: "location",
        options: [
            { value: "allow", label: "Allow Location", emoji: "📍", color: "from-blue-500 to-cyan-500" },
            { value: "manual", label: "Enter City", emoji: "🏙️", color: "from-purple-500 to-pink-500" },
            { value: "skip", label: "Skip This", emoji: "⏭️", color: "from-gray-400 to-slate-500" }
        ]
    }
]

export default function CurationFlow() {
    const router = useRouter()
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [preferences, setPreferences] = useState<Partial<CurationPreferences>>({
        stylePreference: [],
        occasion: [],
        fitPreference: '',
        budgetRange: '',
        colorPreferences: []
    })
    const [selectedOptions, setSelectedOptions] = useState<string[]>([])

    const question = questions[currentQuestion]
    const progress = ((currentQuestion + 1) / questions.length) * 100

    const handleOptionClick = (value: string) => {
        if (question.type === 'multiple') {
            if (selectedOptions.includes(value)) {
                setSelectedOptions(selectedOptions.filter(v => v !== value))
            } else {
                setSelectedOptions([...selectedOptions, value])
            }
        } else {
            setSelectedOptions([value])
        }
    }

    const handleNext = () => {
        // Save current answers
        const updatedPreferences = { ...preferences }

        if (question.id === 1) updatedPreferences.stylePreference = selectedOptions
        if (question.id === 2) updatedPreferences.occasion = selectedOptions
        if (question.id === 3) updatedPreferences.fitPreference = selectedOptions[0] || ''
        if (question.id === 4) updatedPreferences.budgetRange = selectedOptions[0] || ''
        if (question.id === 5) updatedPreferences.colorPreferences = selectedOptions
        if (question.id === 6 && selectedOptions[0] === 'allow') {
            updatedPreferences.location = { city: 'Auto-detected', allowed: true }
        }

        setPreferences(updatedPreferences)

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1)
            setSelectedOptions([])
        } else {
            // Save to localStorage and redirect to shop
            localStorage.setItem('cove_curation_preferences', JSON.stringify({
                ...updatedPreferences,
                timestamp: Date.now()
            }))
            router.push('/shop?curated=true')
        }
    }

    const handleSkip = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1)
            setSelectedOptions([])
        } else {
            router.push('/shop')
        }
    }

    const handleBack = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1)
            setSelectedOptions([])
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
            {/* Progress Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        {currentQuestion > 0 && (
                            <button
                                onClick={handleBack}
                                className="text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                {questions.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${idx <= currentQuestion ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                Question {currentQuestion + 1} of {questions.length}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="ml-4 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                        Skip →
                    </button>
                </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-24">
                <div className="w-full max-w-4xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestion}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                        >
                            {/* Question Header */}
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-3">
                                    {question.title}
                                </h2>
                                <p className="text-lg text-slate-600">
                                    {question.subtitle}
                                </p>
                            </div>

                            {/* Option Tiles */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                                {question.options.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        onClick={() => handleOptionClick(option.value)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`
                      relative p-6 rounded-2xl border-2 transition-all duration-300
                      ${selectedOptions.includes(option.value)
                                                ? 'border-purple-500 shadow-lg shadow-purple-500/20 bg-white'
                                                : 'border-slate-200 hover:border-purple-300 bg-white/50'
                                            }
                    `}
                                    >
                                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${option.color} opacity-10`}></div>
                                        <div className="relative">
                                            <div className="text-4xl mb-3">{option.emoji}</div>
                                            <div className="text-sm font-semibold text-slate-900 mb-1">
                                                {option.label}
                                            </div>
                                            {option.desc && (
                                                <div className="text-xs text-slate-500">
                                                    {option.desc}
                                                </div>
                                            )}
                                        </div>
                                        {selectedOptions.includes(option.value) && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                                            >
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>

                            {/* Next Button */}
                            {selectedOptions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center"
                                >
                                    <button
                                        onClick={handleNext}
                                        className="px-12 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300"
                                    >
                                        {currentQuestion === questions.length - 1 ? 'See My Curated Shop ✨' : 'Next Question →'}
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
