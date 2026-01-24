'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
    Shirt,
    Heart,
    ShoppingBag,
    Sparkles,
    ArrowRight,
    Clock,
    Package
} from 'lucide-react'
import Link from 'next/link'

// Mock Data for "Real Feel"
const STATS = [
    { label: 'Closet Items', value: '12', icon: Shirt, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Saved Outfits', value: '4', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Wishlist', value: '8', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Orders', value: '3', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

const RECENT_ORDERS = [
    { id: '#ORD-2024-001', date: 'Oct 24, 2024', status: 'Delivered', img: '/clothing-images/hoodie_black_front.webp' },
    { id: '#ORD-2024-002', date: 'Nov 02, 2024', status: 'Processing', img: '/clothing-images/white_tee_1.jpg' }
]

export default function BuyerDashboardOverview({ user }: { user: any }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.firstName || 'Style Icon'}! 👋</h1>
                    <p className="text-gray-300 max-w-lg mb-6">
                        Your wardrobe is growing. You have 3 new recommendations based on your recent "Casual Chic" preference.
                    </p>
                    <div className="flex gap-4">
                        <Link href="/shopping" className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm hover:bg-gray-100 transition-colors">
                            Browse New Arrivals
                        </Link>
                        <button className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white font-bold rounded-full text-sm hover:bg-white/20 transition-colors border border-white/20">
                            Upload to Closet
                        </button>
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
                <div className="absolute -right-10 -bottom-20 opacity-20 rotate-12">
                    <Sparkles className="w-64 h-64 text-white" strokeWidth={1} />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STATS.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className="text-2xl font-black text-gray-900">{stat.value}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-400" /> Recent Activity
                        </h3>
                        <Link href="/dashboard?tab=orders" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
                    </div>

                    <div className="space-y-4">
                        {RECENT_ORDERS.map((order) => (
                            <div key={order.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                        <Package className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-gray-900">{order.id}</h4>
                                    <p className="text-xs text-gray-500">{order.date}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {order.status}
                                </span>
                                <ArrowRight className="w-4 h-4 text-gray-300" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Style Insight */}
                <div className="bg-black text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Sparkles className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold mb-2">Style Pulse</h3>
                            <p className="text-gray-400 text-sm mb-4">You're trending towards minimal aesthetics this month.</p>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs font-bold uppercase text-gray-500 mb-1">Minimalism</div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full">
                                        <div className="bg-white h-full rounded-full w-[85%]"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold uppercase text-gray-500 mb-1">Streetwear</div>
                                    <div className="w-full bg-gray-800 h-1.5 rounded-full">
                                        <div className="bg-white h-full rounded-full w-[40%]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="mt-6 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-white/10">
                            Update Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
