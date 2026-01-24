'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    ArrowRight,
    Download
} from 'lucide-react'
import Link from 'next/link'

// Quick Mock Data
const REVENUE_DATA = [
    { month: 'Jan', value: 4500 },
    { month: 'Feb', value: 5200 },
    { month: 'Mar', value: 4800 },
    { month: 'Apr', value: 6100 },
    { month: 'May', value: 5900 },
    { month: 'Jun', value: 7200 },
    { month: 'Jul', value: 8400 },
]

export default function PartnerRevenuePage() {
    const maxVal = Math.max(...REVENUE_DATA.map(d => d.value))

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/partner-onboarding/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Revenue Analytics</h1>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-all text-slate-700">
                            <Calendar className="w-4 h-4" /> This Year
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white border border-black rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm transition-all">
                            <Download className="w-4 h-4" /> Reports
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <RevenueCard
                        title="Total Revenue"
                        value="€42,100.00"
                        trend="+18%"
                        sub="vs last year"
                        icon={<DollarSign className="w-6 h-6 text-white" />}
                        gradient="from-blue-600 to-blue-500"
                    />
                    <RevenueCard
                        title="Average Order Value"
                        value="€124.50"
                        trend="+5%"
                        sub="vs last month"
                        icon={<TrendingUp className="w-6 h-6 text-white" />}
                        gradient="from-purple-600 to-purple-500"
                    />
                    <RevenueCard
                        title="Projected (Q4)"
                        value="€85,000.00"
                        trend="On Track"
                        sub="based on current growth"
                        icon={<TrendingUp className="w-6 h-6 text-white" />}
                        gradient="from-slate-800 to-slate-900"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart Card */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Revenue Growth</h3>
                                <p className="text-sm text-slate-500">Monthly breakdown for 2025</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-xs text-slate-500 font-medium">Direct Sales</span>
                            </div>
                        </div>

                        {/* Custom Bar Chart Visualization */}
                        <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 md:gap-8 overflow-hidden relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                <div className="border-t border-slate-100 w-full h-px"></div>
                                <div className="border-t border-slate-100 w-full h-px"></div>
                                <div className="border-t border-slate-100 w-full h-px"></div>
                                <div className="border-t border-slate-100 w-full h-px"></div>
                                <div className="border-t border-slate-100 w-full h-px"></div>
                            </div>

                            {REVENUE_DATA.map((d, i) => (
                                <div key={d.month} className="flex flex-col items-center gap-2 group w-full relative z-10">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.value / maxVal) * 100}%` }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                        className="w-full max-w-[40px] bg-slate-100 rounded-t-lg group-hover:bg-blue-500 transition-colors relative"
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            €{d.value}
                                        </div>
                                    </motion.div>
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 uppercase tracking-wide">{d.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Top Products</h3>
                        <div className="space-y-6">
                            <ProductRow name="Myself (Jacket)" percent={45} sales="€18,400" />
                            <ProductRow name="Urban Hoodie" percent={30} sales="€12,200" />
                            <ProductRow name="Classic Tee" percent={15} sales="€6,100" />
                            <ProductRow name="Others" percent={10} sales="€5,400" />
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-900 mb-2">Insights</h4>
                            <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                Your jacket collection is outperforming industry standards by 15%. Consider adding more winter variants.
                            </p>
                            <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
                                View Full Report <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function RevenueCard({ title, value, trend, sub, icon, gradient }: any) {
    return (
        <div className={`p-6 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-blue-900/10 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-6 opacity-10 scale-150 pointer-events-none">
                {icon}
            </div>
            <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                    {icon}
                </div>
                <div className="text-3xl font-bold mb-1">{value}</div>
                <div className="text-blue-100 text-sm font-medium mb-4">{title}</div>

                <div className="bg-white/10 backdrop-blur-md rounded-lg py-2 px-3 inline-flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-300" />
                    <span className="text-xs font-bold">{trend}</span>
                    <span className="text-xs text-blue-200 border-l border-white/20 pl-2 ml-1">{sub}</span>
                </div>
            </div>
        </div>
    )
}

function ProductRow({ name, percent, sales }: any) {
    return (
        <div className="group">
            <div className="flex justify-between items-end mb-2">
                <span className="font-medium text-slate-700">{name}</span>
                <span className="font-bold text-slate-900">{sales}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-800 rounded-full" style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    )
}
