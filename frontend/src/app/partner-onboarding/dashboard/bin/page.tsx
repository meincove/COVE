'use client'

import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8001'

interface TrashedProduct {
    product_id: string
    product_name: string
    trashed_at: string
}

export default function BinPage() {
    const [trashedItems, setTrashedItems] = useState<TrashedProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [restoring, setRestoring] = useState<string | null>(null)

    // TODO: Fetch logic would normally go here, but for now we might need a new endpoint 
    // or filter the main list. Since we filtered the main list to exclude trashed, 
    // we need an endpoint to GET trashed items. 
    // For MVP, I'll update the backend to support ?status=trashed filter on the product list view.

    useEffect(() => {
        fetchBinItems()
    }, [])

    const fetchBinItems = async () => {
        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) return

        try {
            // We need to implement this filter support in backend first or now
            // Let's assume we add ?status=trashed support to the GET endpoint 
            const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/?status=trashed`)
            if (res.ok) {
                const data = await res.json()
                setTrashedItems(data.products || [])
            }
        } catch (error) {
            console.error('Failed to fetch bin', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (productId: string) => {
        const brandId = localStorage.getItem('cove_brand_id')
        setRestoring(productId)
        try {
            const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/${productId}/restore/`, {
                method: 'POST'
            })
            if (res.ok) {
                setTrashedItems(prev => prev.filter(p => p.product_id !== productId))
            }
        } catch (error) {
            console.error('Restore failed', error)
        } finally {
            setRestoring(null)
        }
    }

    const handlePermanentDelete = async (productId: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return

        const brandId = localStorage.getItem('cove_brand_id')
        try {
            const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/${productId}/permanent/`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setTrashedItems(prev => prev.filter(p => p.product_id !== productId))
            }
        } catch (error) {
            console.error('Delete failed', error)
        }
    }

    return (
        <div className="min-h-screen bg-[#fafafa] p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/partner-onboarding/dashboard" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                            <Trash2 className="w-6 h-6" />
                            Recycle Bin
                        </h1>
                        <p className="text-sm text-black/60">Items will be permanently deleted after 30 days (or 60s if you implemented that logic).</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-black/40">Loading bin...</div>
                    ) : trashedItems.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-black">Bin is empty</h3>
                            <p className="text-black/50">Your deleted items will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/5">
                            {trashedItems.map((item) => (
                                <div key={item.product_id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <h3 className="font-medium text-black">{item.product_name}</h3>
                                        <p className="text-xs text-black/40 font-mono">{item.product_id}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleRestore(item.product_id)}
                                            disabled={restoring === item.product_id}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                        >
                                            <RotateCcw size={14} />
                                            Restore
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(item.product_id)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                                        >
                                            <XCircle size={14} />
                                            Delete Forever
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
