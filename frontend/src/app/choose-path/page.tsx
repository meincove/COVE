'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ChoosePathPage() {
    const router = useRouter()
    const [hoveredPath, setHoveredPath] = useState<'shop' | 'platform' | null>(null)

    const handlePathSelect = (path: 'shop' | 'platform') => {
        // Store selection in localStorage
        localStorage.setItem('cove_selected_path', path)
        localStorage.setItem('cove_path_timestamp', Date.now().toString())

        // Navigate to questions or directly to destination
        if (path === 'shop') {
            // For now, go directly to shop (we'll add questions later)
            router.push('/shop')
        } else {
            router.push('/partner-onboarding')
        }
    }

    const handleSkip = () => {
        // Skip to shop as guest
        localStorage.setItem('cove_selected_path', 'shop')
        localStorage.setItem('cove_skipped', 'true')
        router.push('/shop')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-7xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent mb-4">
                        Choose Your Experience
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Whether you're here to discover premium products or grow your brand, we've got you covered.
                    </p>
                </motion.div>

                {/* Dual Path Cards */}
                <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
                    {/* COVE SHOP Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        onMouseEnter={() => setHoveredPath('shop')}
                        onMouseLeave={() => setHoveredPath(null)}
                        onClick={() => handlePathSelect('shop')}
                        className={`
              relative overflow-hidden rounded-3xl bg-white border-2 cursor-pointer
              transition-all duration-500 ease-out
              ${hoveredPath === 'shop'
                                ? 'border-blue-500 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                                : 'border-slate-200 hover:border-blue-300 shadow-lg'
                            }
            `}
                    >
                        <div className="p-8 md:p-10">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
                                <span className="text-2xl">🛍️</span>
                                <span className="text-sm font-semibold text-blue-700">For Shoppers</span>
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                                COVE SHOP
                            </h2>
                            <p className="text-lg text-slate-600 mb-8">
                                Browse & Buy Premium Products
                            </p>

                            {/* Visual Placeholder */}
                            <div className="relative h-48 mb-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] opacity-50"></div>
                                <div className="relative grid grid-cols-3 gap-3 p-4">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div
                                            key={i}
                                            className="w-16 h-20 bg-white rounded-lg shadow-sm border border-slate-200"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8">
                                {[
                                    'AI-Powered Search & Discovery',
                                    'Curated Premium Collections',
                                    'Secure & Fast Checkout',
                                    'Personalized Recommendations'
                                ].map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-slate-700">
                                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                className={`
                  w-full py-4 px-6 rounded-xl font-semibold text-lg
                  transition-all duration-300
                  ${hoveredPath === 'shop'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }
                `}
                            >
                                Start Shopping →
                            </button>
                        </div>

                        {/* Hover Glow Effect */}
                        {hoveredPath === 'shop' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 pointer-events-none"
                            />
                        )}
                    </motion.div>

                    {/* COVE PLATFORM Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        onMouseEnter={() => setHoveredPath('platform')}
                        onMouseLeave={() => setHoveredPath(null)}
                        onClick={() => handlePathSelect('platform')}
                        className={`
              relative overflow-hidden rounded-3xl bg-white border-2 cursor-pointer
              transition-all duration-500 ease-out
              ${hoveredPath === 'platform'
                                ? 'border-emerald-500 shadow-2xl shadow-emerald-500/20 scale-[1.02]'
                                : 'border-slate-200 hover:border-emerald-300 shadow-lg'
                            }
            `}
                    >
                        <div className="p-8 md:p-10">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full mb-6">
                                <span className="text-2xl">📦</span>
                                <span className="text-sm font-semibold text-emerald-700">For Brands</span>
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                                COVE PLATFORM
                            </h2>
                            <p className="text-lg text-slate-600 mb-8">
                                Sell Your Products
                            </p>

                            {/* Visual Placeholder */}
                            <div className="relative h-48 mb-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] opacity-50"></div>
                                <div className="relative">
                                    <div className="w-48 h-32 bg-white rounded-xl shadow-lg border border-slate-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="h-2 w-16 bg-emerald-200 rounded"></div>
                                            <div className="h-2 w-8 bg-slate-200 rounded"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-1.5 w-full bg-slate-100 rounded"></div>
                                            <div className="h-1.5 w-3/4 bg-slate-100 rounded"></div>
                                            <div className="h-1.5 w-5/6 bg-slate-100 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8">
                                {[
                                    'Reach Premium Shoppers',
                                    'Easy Product Management',
                                    'Analytics & Insights',
                                    'Marketing Support'
                                ].map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-slate-700">
                                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                className={`
                  w-full py-4 px-6 rounded-xl font-semibold text-lg
                  transition-all duration-300
                  ${hoveredPath === 'platform'
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    }
                `}
                            >
                                Apply to Sell →
                            </button>
                        </div>

                        {/* Hover Glow Effect */}
                        {hoveredPath === 'platform' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 pointer-events-none"
                            />
                        )}
                    </motion.div>
                </div>

                {/* Skip Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center"
                >
                    <button
                        onClick={handleSkip}
                        className="text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200 underline-offset-4 hover:underline"
                    >
                        Just Browsing? Skip to Shop →
                    </button>
                </motion.div>
            </div>
        </div>
    )
}
