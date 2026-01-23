'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Building2,
    Package,
    ShoppingCart,
    TrendingUp,
    Plus,
    Upload,
    Settings,
    Mail,
    MapPin,
    FileText,
    CheckCircle,
    Clock,
    ArrowRight,
    Sparkles
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

interface BrandData {
    brand_id: string
    brand_name: string
    contact_email: string
    onboarding_status: string
    brand_type: string
    country: string
    integration_method: string
    contact_name?: string
    description?: string
    created_at: string
}

export default function BrandDashboard() {
    const [brand, setBrand] = useState<BrandData | null>(null)
    const [productCount, setProductCount] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Get brand_id from localStorage (set during registration)
        const brandId = localStorage.getItem('cove_brand_id')

        if (!brandId) {
            setError('No brand found. Please register first.')
            setLoading(false)
            return
        }

        // Fetch brand data and products
        const fetchData = async () => {
            try {
                // Fetch brand info
                const brandResponse = await fetch(`${API_BASE}/api/brands/${brandId}/`)
                if (!brandResponse.ok) throw new Error('Failed to load brand data')
                const brandData = await brandResponse.json()
                setBrand(brandData)

                // Fetch products count
                const productsResponse = await fetch(`${API_BASE}/api/brands/${brandId}/products/`)
                if (productsResponse.ok) {
                    const productsData = await productsResponse.json()
                    setProductCount(productsData.count || 0)
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    if (error || !brand) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Brand Not Found</h2>
                    <p className="text-slate-600 mb-6">{error || 'Please complete registration first'}</p>
                    <a
                        href="/partner-onboarding/register"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-all"
                    >
                        Register Your Brand
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        )
    }

    const statusColors = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        info_complete: 'bg-blue-50 text-blue-700 border-blue-200',
        products_added: 'bg-green-50 text-green-700 border-green-200',
        live: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        suspended: 'bg-red-50 text-red-700 border-red-200'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/30">
                                C
                            </div>
                            <span className="font-semibold text-slate-900">COVE Partners</span>
                        </a>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="/partner-onboarding" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">
                            Partner Info
                        </a>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <Settings className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
                                Welcome back, {brand.brand_name}! 👋
                            </h1>
                            <p className="text-slate-600">Manage your products and track your performance</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full border text-sm font-medium ${statusColors[brand.onboarding_status as keyof typeof statusColors] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {brand.onboarding_status === 'products_added' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                            {brand.onboarding_status === 'pending' && <Clock className="w-4 h-4 inline mr-1" />}
                            {brand.onboarding_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <a href="/partner-onboarding/dashboard/partner-products" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Package className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">{productCount}</div>
                            <div className="text-sm text-slate-600 group-hover:text-blue-600 transition-colors">Total Products →</div>
                        </a>

                        <a href="/partner-onboarding/dashboard/partner-orders" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                    <ShoppingCart className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">0</div>
                            <div className="text-sm text-slate-600 group-hover:text-emerald-600 transition-colors">Orders →</div>
                        </a>

                        <a href="/partner-onboarding/dashboard/partner-revenue" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">€0</div>
                            <div className="text-sm text-slate-600 group-hover:text-purple-600 transition-colors">Revenue →</div>
                        </a>

                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-1">-</div>
                            <div className="text-sm text-slate-600">AI Score</div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Action: Add Products */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-8 mb-8 text-white relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-start justify-between">
                            <div className="max-w-xl">
                                <h2 className="text-2xl font-semibold mb-2">Ready to add your products?</h2>
                                <p className="text-blue-100 mb-6">
                                    Start building your catalog and reach thousands of potential customers through COVE AI's intelligent platform.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <a
                                        href="/partner-onboarding/products/add"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-lg"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Add Product Manually
                                    </a>
                                    <button
                                        disabled
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-lg font-semibold cursor-not-allowed"
                                    >
                                        <Upload className="w-5 h-5" />
                                        Bulk Upload CSV (Coming Soon)
                                    </button>
                                </div>
                            </div>
                            <div className="hidden lg:block">
                                <div className="w-32 h-32 bg-white/10 rounded-2xl backdrop-blur-sm flex items-center justify-center">
                                    <Package className="w-16 h-16 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Brand Info Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                >
                    {/* Brand Details */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Brand Information</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Brand Name</div>
                                <div className="text-sm font-medium text-slate-900">{brand.brand_name}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Brand Type</div>
                                <div className="text-sm font-medium text-slate-900">
                                    {brand.brand_type === 'direct' ? 'Direct Seller' : 'Affiliate'}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Country</div>
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {brand.country}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Contact Email</div>
                                <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    {brand.contact_email}
                                </div>
                            </div>
                            {brand.description && (
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">Description</div>
                                    <div className="text-sm text-slate-700">{brand.description}</div>
                                </div>
                            )}
                        </div>

                        <button className="mt-6 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                            Edit Brand Info
                        </button>
                    </div>

                    {/* Integration Settings */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Integration</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Integration Method</div>
                                <div className="text-sm font-medium text-slate-900 capitalize">
                                    {brand.integration_method.replace('_', ' ')}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Brand ID</div>
                                <div className="text-sm font-mono text-slate-900 bg-slate-50 px-3 py-2 rounded border border-slate-200">
                                    {brand.brand_id}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-1">Member Since</div>
                                <div className="text-sm font-medium text-slate-900">
                                    {new Date(brand.created_at).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-sm font-medium text-blue-900 mb-1">AI-Powered Features Coming Soon</div>
                                    <p className="text-xs text-blue-700">
                                        Automated product tagging, smart pricing, and predictive analytics will be enabled once you add products.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
