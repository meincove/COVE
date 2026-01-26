'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ParticleWave from '@/components/ParticleWave'
import {
    Zap,
    ShieldCheck,
    Layers,
    ArrowRight,
    Brain,
    Sparkles,
    TrendingUp,
    LayoutDashboard
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function PartnerOnboardingPage() {
    const { isSignedIn } = useUser()
    const [navbarScrolled, setNavbarScrolled] = useState(false)

    // Handle navbar scroll effect
    if (typeof window !== 'undefined') {
        window.addEventListener('scroll', () => {
            setNavbarScrolled(window.scrollY > 50)
        })
    }

    return (
        <div className="bg-white text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden relative">
            {/* Background Canvas for Particle Wave */}
            <ParticleWave />

            {/* Gradient Overlay for Depth (Light Mode Fade) */}
            <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent via-white/50 to-white"></div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 transition-all duration-300">
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-b border-slate-200"></div>
                <div className="relative max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                    <a href="/" className="text-lg font-medium tracking-tight z-10 flex items-center gap-2 text-slate-900">
                        <span className="bg-blue-600 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                            C
                        </span>
                        COVE AI Partners
                    </a>

                    <div className="hidden md:flex items-center gap-8 text-sm text-slate-500 font-medium z-10">
                        <a href="#features" className="hover:text-blue-600 transition-colors">AI Features</a>
                        <a href="#benefits" className="hover:text-blue-600 transition-colors">Benefits</a>
                        <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
                    </div>

                    <Link
                        href={isSignedIn ? "/partner-onboarding/dashboard" : "/partner-onboarding/register"}
                        className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-slate-800 transition-all active:scale-95 z-10 shadow-lg shadow-slate-900/10"
                    >
                        {isSignedIn ? 'Dashboard' : 'Get Started'}
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden z-10">
                <div className="max-w-3xl mx-auto px-6 text-center z-10 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 mb-8 backdrop-blur-sm shadow-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                        </span>
                        <span className="text-xs font-medium text-slate-600">AI-Powered Partner Program</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-semibold tracking-tight text-slate-900 mb-6 [text-shadow:0_0_30px_rgba(59,130,246,0.1)]"
                    >
                        Supercharge your sales <br className="hidden md:block" /> with AI intelligence.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-xl mx-auto mb-10"
                    >
                        COVE AI transforms how you sell. Intelligent product discovery, automated marketing, and predictive analytics—all powered by cutting-edge AI to maximize your revenue.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href={isSignedIn ? "/partner-onboarding/dashboard" : "/partner-onboarding/register"}
                            className="h-12 px-8 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition-all shadow-[0_4px_20px_rgba(37,99,235,0.25)] flex items-center gap-2 hover:-translate-y-0.5"
                        >
                            {isSignedIn ? <LayoutDashboard className="w-4 h-4" /> : null}
                            <span>{isSignedIn ? 'Go to Dashboard' : 'Join as Partner'}</span>
                            {!isSignedIn && <ArrowRight className="w-4 h-4" />}
                        </Link>
                        <button className="h-12 px-8 rounded-full bg-white text-slate-700 border border-slate-200 font-medium text-sm hover:bg-slate-50 transition-all flex items-center gap-2 backdrop-blur-sm shadow-sm hover:border-slate-300">
                            <span>See AI in Action</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>

                {/* Dashboard Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="mt-24 relative max-w-4xl mx-auto px-6"
                >
                    {/* Mockup Shadow/Glow (Blue) */}
                    <div className="absolute -inset-1 bg-blue-500/20 rounded-3xl blur-3xl opacity-60"></div>

                    {/* Dashboard Preview */}
                    <div className="relative bg-white rounded-2xl p-6 shadow-2xl ring-1 ring-slate-900/5 border border-slate-200">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
                                    <Brain className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">AI Analytics Dashboard</h3>
                                    <p className="text-xs text-slate-500">Powered by COVE Intelligence</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {[
                                { label: 'AI-Driven Sales', value: '$24,890', change: '+47%' },
                                { label: 'Smart Matches', value: '2,156', change: '+89' },
                                { label: 'Conversion Rate', value: '18.4%', change: '+5.2%' }
                            ].map((stat, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        {stat.change}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Chart Placeholder */}
                        <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-6 h-48 flex items-end justify-between gap-2">
                            {[40, 65, 45, 80, 55, 90, 70, 85].map((height, idx) => (
                                <div
                                    key={idx}
                                    className="flex-1 bg-blue-600 rounded-t-lg transition-all hover:bg-blue-500"
                                    style={{ height: `${height}%` }}
                                ></div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Bento Grid Features */}
            <section id="features" className="py-24 relative z-10 bg-white border-t border-slate-200">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 mb-4">AI-powered essentials.</h2>
                        <p className="text-slate-500 max-w-lg mx-auto">Intelligent features that work 24/7 to grow your business while you sleep.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1 */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-80 group">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight text-slate-900 mb-2">Smart Product Discovery</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">AI matches your products with the right customers using advanced behavioral analysis and preference learning.</p>
                            </div>
                        </div>

                        {/* Card 2 (Span 2) */}
                        <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-white rounded-3xl p-8 shadow-sm text-slate-900 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative group border border-slate-200 hover:border-blue-200 transition-colors">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_40%)]"></div>

                            <div className="relative z-10 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 mb-6 group-hover:text-blue-600 transition-colors shadow-sm">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold tracking-tight mb-2">Predictive Analytics</h3>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                                    Our AI forecasts trends, optimizes pricing, and predicts demand—giving you insights before your competition even notices.
                                </p>
                            </div>
                            {/* Visual decoration */}
                            <div className="relative w-48 h-32 md:h-full flex-shrink-0 flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-600/10 rounded-2xl transform rotate-3 group-hover:rotate-6 transition-transform duration-500 blur-xl"></div>
                                <div className="relative bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-xl flex flex-col gap-3 w-40 transform -rotate-2 group-hover:rotate-0 transition-transform duration-500 shadow-xl">
                                    <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 w-24 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                                    <div className="h-2 w-12 bg-blue-500/50 rounded-full self-end"></div>
                                </div>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-80">
                            <div className="w-full flex-1 flex items-center justify-center mb-6">
                                {/* Custom Toggle UI */}
                                <div className="w-16 h-9 bg-slate-100 rounded-full relative shadow-inner border border-slate-200">
                                    <div className="absolute top-1 left-1 w-7 h-7 bg-blue-600 rounded-full shadow-lg transition-all duration-300 translate-x-7"></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight text-slate-900 mb-2">Auto-Pilot Marketing</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">AI automatically creates and optimizes campaigns, targeting the perfect audience at the perfect time.</p>
                            </div>
                        </div>

                        {/* Card 4 */}
                        <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold tracking-tight text-slate-900 mb-2">Intelligent Inventory</h3>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                                    AI-powered stock management predicts what sells, when to restock, and automatically adjusts to market demand.
                                </p>
                            </div>
                            <div className="flex-shrink-0 grid grid-cols-2 gap-2 opacity-80 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                                <div className="w-12 h-12 rounded-lg bg-indigo-100 border border-indigo-200"></div>
                                <div className="w-12 h-12 rounded-lg bg-purple-100 border border-purple-200"></div>
                                <div className="w-12 h-12 rounded-lg bg-blue-100 border border-blue-200"></div>
                                <div className="w-12 h-12 rounded-lg bg-emerald-100 border border-emerald-200"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonial / Large Text */}
            <section className="py-32 bg-slate-50 relative z-10 border-t border-slate-200">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-2xl md:text-4xl font-medium tracking-tight text-slate-900 leading-snug">
                        &quot;COVE AI increased our sales by 47% in just 3 months. The AI recommendations are eerily accurate—it&apos;s like having a data scientist on staff.&quot;
                    </h2>
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm border border-slate-200 shadow-sm">
                            MK
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-semibold text-slate-900">Marcus Kim</div>
                            <div className="text-xs text-slate-500">CEO, TechStyle Collective</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section id="apply" className="py-20 bg-white border-t border-slate-200 relative z-10">
                <div className="max-w-xl mx-auto px-6 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl shadow-sm border border-slate-200 mx-auto flex items-center justify-center mb-6 text-slate-900">
                        <Brain className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mb-4">Ready to unlock AI-powered growth?</h2>
                    <p className="text-slate-500 mb-8">Join leading brands using COVE AI. Get started with our intelligent platform today.</p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="/partner-onboarding/register" className="w-full sm:w-auto h-12 px-6 rounded-full bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-all shadow-[0_4px_15px_rgba(37,99,235,0.3)]">
                            Start with COVE AI
                        </a>
                        <button className="w-full sm:w-auto h-12 px-6 rounded-full bg-transparent text-slate-700 border border-slate-300 font-medium text-sm hover:bg-slate-50 transition-all">
                            Book AI Demo
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-50 py-12 border-t border-slate-200 relative z-10">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tracking-tight text-slate-900">COVE AI Partners</span>
                        <span className="text-xs text-slate-500">© 2024</span>
                    </div>
                    <div className="flex gap-6 text-xs text-slate-500 font-medium">
                        <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">AI Ethics</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
