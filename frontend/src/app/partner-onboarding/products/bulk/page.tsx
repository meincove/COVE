'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, FileText, Check, AlertCircle, Loader2, Download } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

const CSV_TEMPLATE = `Product Name,Type,Gender,Description,Material,Fit,Pattern,Season,Use Cases,Color Name,Hex Code,Sizes (S:10:29.99|M:10:29.99),Image URL
Classic Tee,T-Shirt,Unisex,Premium cotton basic,Cotton,Regular,Solid,Summer;Spring,Casual;Work,Black,#000000,S:50:29.99|M:50:29.99|L:50:29.99,https://example.com/black.jpg
Classic Tee,T-Shirt,Unisex,Premium cotton basic,Cotton,Regular,Solid,Summer;Spring,Casual;Work,White,#FFFFFF,S:50:29.99|M:50:29.99|L:50:29.99,https://example.com/white.jpg
Urban Hoodie,Hoodie,Men,Streetwear essential,Fleece,Oversized,Graphic,Winter;Fall,Streetwear;Casual,Charcoal,#333333,M:20:59.99|L:20:59.99,https://example.com/hoodie.jpg`

export default function BulkUploadPage() {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string, details?: string[] } | null>(null)

    const handleDownloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'cove_product_template.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        setStatus(null)

        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) {
            setStatus({ type: 'error', message: 'Brand ID not found. Please login again.' })
            setUploading(false)
            return
        }

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/bulk-upload/`, {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Upload failed')
            }

            setStatus({
                type: 'success',
                message: `Successfully processed ${data.created_count} products!`,
                details: data.errors // warnings if any
            })
            setFile(null)
        } catch (err: any) {
            setStatus({
                type: 'error',
                message: err.message,
                details: err.details || [] // specific row errors
            })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <a href="/partner-onboarding/dashboard" className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </a>
                    <h1 className="text-3xl font-semibold text-slate-900 mb-2">Bulk Product Upload</h1>
                    <p className="text-slate-600">Upload multiple products at once using our CSV template.</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Step 1: Template */}
                    <div className="p-8 border-b border-slate-100">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">1. Download Template</h3>
                                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                                    Start by downloading our pre-formatted CSV template. It includes columns for
                                    product details, AI attributes, and variant configurations.
                                </p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download CSV Template
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="p-8">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Upload className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="w-full">
                                <h3 className="text-lg font-medium text-slate-900 mb-2">2. Upload Filled CSV</h3>
                                <p className="text-slate-600 text-sm mb-6">
                                    Fill out the template and upload it here. We'll automatically group rows with the same
                                    "Product Name" into single products with multiple colors.
                                </p>

                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="space-y-2">
                                            {file ? (
                                                <div className="flex items-center justify-center gap-2 text-blue-600 font-medium">
                                                    <FileText className="w-5 h-5" />
                                                    {file.name}
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="block text-sm font-medium text-slate-700 group-hover:text-blue-700">
                                                        Click to browse or drag file here
                                                    </span>
                                                    <span className="block text-xs text-slate-400">
                                                        Accepts .csv files only
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={!file || uploading}
                                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/20"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Upload Products
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Status Area */}
                    {status && (
                        <div className={`p-6 border-t ${status.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex gap-3">
                                {status.type === 'success' ? (
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Check className="w-4 h-4 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                    </div>
                                )}
                                <div>
                                    <h4 className={`font-medium mb-1 ${status.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                                        {status.type === 'success' ? 'Upload Successful' : 'Upload Failed'}
                                    </h4>
                                    <p className={`text-sm ${status.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                                        {status.message}
                                    </p>
                                    {status.details && status.details.length > 0 && (
                                        <div className="mt-3 p-3 bg-white/50 rounded-lg text-xs font-mono max-h-40 overflow-y-auto">
                                            {status.details.map((line, i) => (
                                                <div key={i} className={status.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                                                    • {line}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
