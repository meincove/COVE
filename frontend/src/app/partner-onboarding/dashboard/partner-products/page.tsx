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
    AlertCircle,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EditProductModal from './EditProductModal'
import DeleteAlertModal from './DeleteAlertModal'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

interface ProductSize {
    size_label: string
    stock_quantity: number
    base_price: string
}

interface ProductColor {
    variant_id?: string
    color_name: string
    hex_code: string
    sizes: ProductSize[]
    images: { image_url: string; display_order: number; is_primary: boolean }[] // Refined type
}

interface Product {
    product_id: string
    slug: string
    product_name: string
    product_type: string
    gender: string
    brand_name: string
    color_count: number
    default_variant_id?: string
    description: string
    colors: ProductColor[]
    affiliate_url?: string
}

export default function PartnerProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [trashedCount, setTrashedCount] = useState(0)

    // Modals State
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

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
            const response = await fetch(`${API_BASE}/api/brands/${brandId}/products/?status=active`)
            if (!response.ok) throw new Error('Failed to fetch products')

            const data = await response.json()
            setProducts(data.products || [])

            // Fetch Trashed Count
            const trashRes = await fetch(`${API_BASE}/api/brands/${brandId}/products/?status=trashed`)
            if (trashRes.ok) {
                const trashData = await trashRes.json()
                setTrashedCount(trashData.count || 0)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleEditSuccess = () => {
        const brandId = localStorage.getItem('cove_brand_id')
        if (brandId) fetchProducts(brandId)
    }

    // Delete Logic
    const confirmDelete = async () => {
        if (!deletingProductId) return

        const brandId = localStorage.getItem('cove_brand_id')
        try {
            const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/${deletingProductId}/`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setProducts(prev => prev.filter(p => p.product_id !== deletingProductId))
                setDeletingProductId(null) // Close modal
            } else {
                console.error("Failed to delete product")
            }
        } catch (error) {
            console.error("Error deleting product", error)
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

                    <Link href="/partner-onboarding/dashboard/bin" className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-2">
                            <Trash2 className="w-8 h-8 text-slate-400 group-hover:text-red-500 transition-colors" />
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" />
                        </div>
                        <div className="text-lg font-bold text-slate-900 mb-1">Recycle Bin</div>
                        <div className="text-sm text-slate-600">
                            {products.length > 0 ? (
                                <span className={trashedCount > 0 ? "text-red-600 font-medium" : ""}>
                                    {trashedCount} items deleted
                                </span>
                            ) : "View deleted items"}
                        </div>
                    </Link>
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
                            <ProductCard
                                key={product.product_id}
                                product={product}
                                onDelete={(id) => setDeletingProductId(id)}
                                onEdit={(p) => setEditingProduct(p)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingProduct && (
                    <EditProductModal
                        product={editingProduct}
                        isOpen={!!editingProduct}
                        onClose={() => setEditingProduct(null)}
                        onSave={handleEditSuccess}
                    />
                )}
            </AnimatePresence>

            {/* Delete Alert Modal */}
            <DeleteAlertModal
                isOpen={!!deletingProductId}
                onClose={() => setDeletingProductId(null)}
                onConfirm={confirmDelete}
            />
        </div>
    )
}

function ProductCard({ product, onDelete, onEdit }: {
    product: Product,
    onDelete: (id: string) => void,
    onEdit: (product: Product) => void
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => window.location.href = `/partner-onboarding/dashboard/partner-products/${product.product_id}`}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
        >
            {/* Product Image */}
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 relative">
                {product.colors?.[0]?.images?.[0]?.image_url ? (
                    <img
                        src={
                            product.colors[0].images[0].image_url.startsWith('http')
                                ? product.colors[0].images[0].image_url
                                : `${API_BASE}/media/${product.colors[0].images[0].image_url}`
                        }
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center')
                            const icon = document.createElement('div')
                            icon.innerHTML = '<svg class="w-16 h-16 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'
                            e.currentTarget.parentElement?.appendChild(icon)
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-slate-400" />
                    </div>
                )}
            </div>

            <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-slate-900 text-lg mb-1">{product.product_name}</h3>
                        <p className="text-sm text-slate-600">{product.product_type}</p>
                    </div>
                    <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${product.affiliate_url ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {product.affiliate_url ? 'Affiliate' : 'Partner'}
                        </span>
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                            Active
                        </span>
                    </div>
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
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(product)
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        Edit
                    </button>
                    <Link
                        href={`/product/${product.slug}${product.default_variant_id ? `?variantId=${product.default_variant_id}` : ''}`}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Visit Product Page"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink className="w-4 h-4 text-slate-600" />
                    </Link>
                    <button
                        className="p-2 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Move to Bin"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(product.product_id)
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
