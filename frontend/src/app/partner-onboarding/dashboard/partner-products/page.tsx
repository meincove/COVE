'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Package,
    Edit,
    Trash2,
    ExternalLink,
    MapPin,
    Search,
    Filter,
    Plus,
    ArrowLeft,
    Eye,
    AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

interface ProductSize {
    size_label: string
    stock_quantity: number
    base_price: string
}

interface ProductColor {
    color_name: string
    hex_code: string
    sizes: ProductSize[]
}

interface Product {
    product_id: string
    slug: string
    product_name: string
    product_type: string
    gender: string
    brand_name: string
    color_count: number
}

export default function PartnerProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) {
            router.push('/partner-onboarding/register')
            return
        }

        fetchProducts(brandId)
    }, [])

    const fetchProducts = async (brandId: string) => {
        try {
            const response = await fetch(`${API_BASE}/api/brands/${brandId}/products/`)
            if (!response.ok) throw new Error('Failed to fetch products')

            const data = await response.json()
            setProducts(data.products || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter(product =>
        product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.product_type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading products...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/partner-onboarding/dashboard" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">Your Products</h1>
                            <p className="text-sm text-slate-600">Manage and edit your product catalog</p>
                        </div>
                    </div>
                    <Link
                        href="/partner-onboarding/products/add"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Add Product
                    </Link>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <Package className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{products.length}</div>
                        <div className="text-sm text-slate-600">Total Products</div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                <span className="text-lg">🎨</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">
                            {products.reduce((sum, p) => sum + p.color_count, 0)}
                        </div>
                        <div className="text-sm text-slate-600">Color Variants</div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                <span className="text-lg">✓</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{products.length}</div>
                        <div className="text-sm text-slate-600">Active</div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-8 h-8 text-orange-600" />
                        </div>
                        <div className="text-3xl font-bold text-slate-900">0</div>
                        <div className="text-sm text-slate-600">Out of Stock</div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search products by name or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                </div>

                {/* Products Grid */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
                        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No products found</h3>
                        <p className="text-slate-600 mb-6">
                            {searchQuery ? 'Try a different search term' : 'Get started by adding your first product'}
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/partner-onboarding/products/add"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Add Your First Product
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.product_id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function ProductCard({ product }: { product: Product }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
        >
            {/* Product Image Placeholder */}
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Package className="w-16 h-16 text-slate-400" />
            </div>

            <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-slate-900 text-lg mb-1">{product.product_name}</h3>
                        <p className="text-sm text-slate-600">{product.product_type}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                        Active
                    </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                        <span className="text-lg">🎨</span>
                        <span>{product.color_count} colors</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-lg">👕</span>
                        <span className="capitalize">{product.gender}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors">
                        <Edit className="w-4 h-4" />
                        Edit
                    </button>
                    <Link
                        href={`/product/${product.slug}`}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Visit Product Page"
                    >
                        <ExternalLink className="w-4 h-4 text-slate-600" />
                    </Link>
                    <button
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Locate in Catalog"
                        onClick={() => {
                            window.location.href = `/shopping?category=${product.product_type.toLowerCase()}&highlight=${product.slug}`
                        }}
                    >
                        <MapPin className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
