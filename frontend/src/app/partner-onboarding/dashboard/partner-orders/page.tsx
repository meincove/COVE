'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Search,
    Filter,
    Download,
    MoreHorizontal,
    ArrowUpDown,
    ChevronLeft,
    CheckCircle2,
    Clock,
    XCircle,
    Package
} from 'lucide-react'
import Link from 'next/link'

// Mock Data
const MOCK_ORDERS = [
    { id: '#ORD-7729', customer: 'Alex Rivera', date: 'Today, 2:34 PM', total: '€129.00', status: 'pending', items: 2 },
    { id: '#ORD-7728', customer: 'Sarah Chen', date: 'Today, 11:20 AM', total: '€89.50', status: 'processing', items: 1 },
    { id: '#ORD-7727', customer: 'Michael Smith', date: 'Yesterday', total: '€245.00', status: 'shipped', items: 4 },
    { id: '#ORD-7726', customer: 'Emma Wilson', date: 'Oct 24, 2024', total: '€55.00', status: 'delivered', items: 1 },
    { id: '#ORD-7725', customer: 'James Cooper', date: 'Oct 23, 2024', total: '€120.00', status: 'cancelled', items: 2 },
]

export default function PartnerOrdersPage() {
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/partner-onboarding/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900">Orders</h1>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-all text-slate-700">
                            <Download className="w-4 h-4" /> Export
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Orders" value="1,245" trend="+12%" />
                    <StatCard label="Pending" value="24" color="text-yellow-600" bg="bg-yellow-50" />
                    <StatCard label="Shipped" value="12" color="text-blue-600" bg="bg-blue-50" />
                    <StatCard label="Returns" value="3" color="text-red-600" bg="bg-red-50" />
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                            <Filter className="w-4 h-4" /> Filter
                        </button>
                        <button className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                            <ArrowUpDown className="w-4 h-4" /> Sort
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {MOCK_ORDERS.map((order, i) => (
                                <motion.tr
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={order.id}
                                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                    onClick={() => {/* Navigate to details */ }}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">{order.id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{order.date}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {order.customer[0]}
                                            </div>
                                            {order.customer}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{order.items} Items</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-900">{order.total}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}

function StatCard({ label, value, trend, color = 'text-slate-900', bg = 'bg-white' }: any) {
    return (
        <div className={`p-6 rounded-xl border border-slate-200 shadow-sm ${bg}`}>
            <div className="text-sm text-slate-500 font-medium mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {trend && <div className="text-xs text-green-600 font-medium mt-1">{trend} from last month</div>}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        processing: 'bg-blue-50 text-blue-700 border-blue-200',
        shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        delivered: 'bg-green-50 text-green-700 border-green-200',
        cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
    }

    const icons = {
        pending: Clock,
        processing: Package,
        shipped: Package,
        delivered: CheckCircle2,
        cancelled: XCircle,
    }

    const Icon = icons[status as keyof typeof icons] || Clock

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="capitalize">{status}</span>
        </span>
    )
}
