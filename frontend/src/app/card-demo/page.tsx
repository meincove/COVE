"use client"

import { useRouter } from 'next/navigation'

export default function ElegantCard() {
    const router = useRouter()

    return (
        <div className="fixed inset-0 overflow-hidden bg-neutral-950 flex items-center justify-center p-8">
            {/* Single Shopping Card - Elegant & Balanced */}
            <div className="relative w-[460px] bg-gradient-to-br from-[#f5f0ed] to-[#e8e4e0] rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-12">

                {/* Icon Circle */}
                <div className="mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-4xl font-semibold text-gray-900 mb-3 tracking-tight">
                    Shopper
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-base leading-relaxed mb-10">
                    Discover amazing products and enjoy seamless shopping experiences tailored just for you.
                </p>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/shop')}
                        className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Get Started
                    </button>

                    <button
                        onClick={() => { }}
                        className="w-full py-4 bg-transparent hover:bg-white/50 text-blue-600 font-medium rounded-full border-2 border-blue-500 transition-all duration-200"
                    >
                        Learn More
                    </button>
                </div>
            </div>
        </div>
    )
}