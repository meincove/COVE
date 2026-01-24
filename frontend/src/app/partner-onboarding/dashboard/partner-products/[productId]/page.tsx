'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Edit,
    Trash2,
    Package,
    ShieldCheck,
    Globe,
    ShoppingBag,
    AlertCircle,
    CheckCircle2,
    Palette,
    TrendingUp,
    Eye,
    DollarSign,
    BarChart3,
    ExternalLink,
    ChevronRight,
    Search
} from 'lucide-react'
import EditProductModal from '../EditProductModal'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

interface ProductFull {
    product_id: string
    product_name: string
    product_type: string
    status: string
    description: string
    colors: any[]
    gender?: string
    material?: string
    fit?: string
    formality_score?: number
    versatility?: number
    slug?: string // For store link
    affiliate_url?: string // For detection
}

export default function ProductDetailPage() {
    const params = useParams()
    const router = useRouter()
    const productId = params.productId as string

    const [product, setProduct] = useState<ProductFull | null>(null)
    const [loading, setLoading] = useState(true)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [seoscore, setSeoScore] = useState(0)

    useEffect(() => {
        fetchProduct()
    }, [productId])

    // --- Data Fetching ---
    const fetchProduct = async () => {
        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) return

        try {
            const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/${productId}/`)
            if (res.ok) {
                const data = await res.json()
                setProduct(data)
                analyzeProduct(data)
            }
        } catch (err) {
            console.error("Failed to fetch product", err)
        } finally {
            setLoading(false)
        }
    }

    // --- Metrics & Analysis ---
    const analyzeProduct = (data: ProductFull) => {
        let score = 0
        const tips: string[] = []

        // 1. Description
        if (data.description && data.description.length > 100) score += 30
        else tips.push("Expand description to 100+ characters")

        // 2. Images
        const imageCount = data.colors?.reduce((acc, c) => acc + (c.images?.length || 0), 0) || 0
        if (imageCount >= 3) score += 30
        else tips.push(`Add more images (Current: ${imageCount}, Goal: 3+)`)

        // 3. Variants
        if (data.colors && data.colors.length >= 2) score += 20
        else tips.push("Add another color variant to boost visibility")

        // 4. Attributes
        if (data.material && data.fit) score += 20
        else tips.push("Complete material & fit attributes")

        setSeoScore(score)
        setSuggestions(tips)
    }

    // --- Mock Metrics for Demo ---
    const getMockMetrics = () => {
        // Deterministic mock based on ID
        const seed = productId.charCodeAt(productId.length - 1)
        return {
            views: seed * 120,
            sales: Math.floor(seed / 2),
            revenue: Math.floor(seed / 2) * 45,
            conversion: (seed % 5) + 1.2
        }
    }
    const metrics = getMockMetrics()

    // --- Helpers ---
    const getPrimaryImage = () => {
        return product?.colors?.[0]?.images?.[0]?.image_url || null
    }

    const resolveImage = (url: string) => {
        if (url.startsWith('http')) return url
        return `${API_BASE}/media/${url}`
    }

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div>
        </div>
    )

    if (!product) return <div className="p-10 text-center">Product not found</div>

    const primaryImg = getPrimaryImage()

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-20">
            {/* --- Breadcrumb & Actions --- */}
            <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="cursor-pointer hover:text-black" onClick={() => router.push('/partner-onboarding/dashboard')}>Dashboard</span>
                        <ChevronRight className="w-4 h-4" />
                        <span className="cursor-pointer hover:text-black" onClick={() => router.push('/partner-onboarding/dashboard/partner-products')}>Products</span>
                        <ChevronRight className="w-4 h-4" />
                        <span className="font-medium text-black truncate max-w-[150px]">{product.product_name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Orders Action */}
                        <button
                            onClick={() => router.push(`/partner-onboarding/dashboard/partner-orders?productId=${productId}`)}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700"
                        >
                            <ShoppingBag className="w-4 h-4" /> View Orders
                        </button>

                        {/* View in Store */}
                        <button
                            onClick={() => window.open(`/product/${product.slug}`, '_blank')}
                            className="p-2 text-slate-400 hover:text-black transition-colors"
                            title="View in Store"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        <button
                            onClick={() => setEditModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-all shadow-lg shadow-black/10"
                        >
                            <Edit className="w-4 h-4" /> Edit
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">

                {/* --- Hero Header --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-slate-200">
                                {product.product_type}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${product.affiliate_url ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {product.affiliate_url ? 'Affiliate Product' : 'Direct Product'}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black mb-2">{product.product_name}</h1>
                        <p className="text-slate-400 font-mono text-sm">ID: {product.product_id}</p>
                    </div>
                    {/* Status Toggle (Visual only) */}
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-full border border-slate-100">
                        <div className="px-4 py-1.5 bg-white rounded-full shadow-sm text-xs font-bold text-green-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Active
                        </div>
                    </div>
                </div>

                {/* --- Metrics Grid --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    <MetricCard icon={<DollarSign />} label="Total Revenue" value={`€${metrics.revenue.toLocaleString()}`} trend="+12%" />
                    <MetricCard icon={<ShoppingBag />} label="Units Sold" value={metrics.sales} trend="+5%" />
                    <MetricCard icon={<Eye />} label="Product Views" value={metrics.views.toLocaleString()} trend="+24%" />
                    <MetricCard icon={<BarChart3 />} label="Conv. Rate" value={`${metrics.conversion}%`} trend="-1%" negative />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* --- LEFT COL: Media & Details --- */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Hero Media */}
                        <div className="bg-slate-50 rounded-3xl p-2 border border-slate-100 aspect-video md:aspect-[21/9] relative overflow-hidden group">
                            {primaryImg ? (
                                <img src={resolveImage(primaryImg)} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Package className="w-16 h-16" />
                                </div>
                            )}
                        </div>

                        {/* Variants */}
                        <div>
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Palette className="w-5 h-5 text-slate-400" /> Color Variants
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {product.colors?.map((color, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-black/10 hover:shadow-md transition-all group">
                                        <div className="w-16 h-16 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                            {color.images?.[0]?.image_url ? (
                                                <img src={resolveImage(color.images[0].image_url)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-sm">{color.color_name}</h4>
                                                <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: color.hex_code }}></div>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 truncate">
                                                {color.sizes?.map((s: any) => `${s.size_label} (${s.stock_quantity})`).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Specs */}
                        <div className="border-t border-slate-100 pt-8">
                            <h3 className="text-lg font-bold mb-4">Specifications</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <SpecItem label="Material" value={product.material} />
                                <SpecItem label="Fit" value={product.fit} />
                                <SpecItem label="Formality" value={product.formality_score + "/10"} />
                                <SpecItem label="Versatility" value={product.versatility + "/10"} />
                            </div>
                            <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                                <p className="text-slate-600 leading-relaxed max-w-2xl">
                                    {product.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COL: SEO & Optimization --- */}
                    <div className="space-y-6">

                        {/* Listing Strength */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" /> Listing Strength
                                </h3>
                                <span className="text-2xl font-black text-blue-600">{seoscore}%</span>
                            </div>

                            {/* Circular (Simulated with Bar) */}
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                                    style={{ width: `${seoscore}%` }}
                                ></div>
                            </div>

                            {suggestions.length > 0 ? (
                                <div className="space-y-3">
                                    {suggestions.map((tip, i) => (
                                        <div key={i} className="flex gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0"></div>
                                            {tip}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                    <p className="font-medium text-green-700">Listing is optimized!</p>
                                </div>
                            )}
                        </div>

                        {/* AI Style Profile */}
                        <div className="bg-black text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-20">
                                <Package className="w-24 h-24 stroke-1" />
                            </div>
                            <h3 className="font-bold text-lg mb-6 relative z-10">AI Style Analysis</h3>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        <span>Formality</span>
                                        <span>{product.formality_score}/10</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-white h-full rounded-full" style={{ width: `${(product.formality_score || 0) * 10}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        <span>Versatility</span>
                                        <span>{product.versatility}/10</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-white h-full rounded-full" style={{ width: `${(product.versatility || 0) * 10}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            <EditProductModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                product={product}
                onSave={() => {
                    fetchProduct()
                    setEditModalOpen(false)
                }}
            />
        </div>
    )
}

// Minimal Sub-components for cleanliness
function MetricCard({ icon, label, value, trend, negative }: any) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">{icon}</div>
                <span className={`text-xs font-bold ${negative ? 'text-red-500' : 'text-green-500'}`}>{trend}</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{value}</div>
            <div className="text-xs text-slate-500 font-medium">{label}</div>
        </div>
    )
}

function SpecItem({ label, value }: any) {
    return (
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
            <div className="font-semibold text-slate-900 capitalize">{value || 'N/A'}</div>
        </div>
    )
}
