'use client'

import { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2, Loader2, Image as ImageIcon, Package, Palette, Ruler } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ImageUpload from '../../../../components/partner/ImageUpload'

interface ProductSize {
    size_label: string
    stock_quantity: number
    base_price: string
}

interface ProductImage {
    image_url: string
    display_order: number
    is_primary: boolean
    view_type?: string // Added view type
}

interface ProductColor {
    variant_id?: string
    color_name: string
    hex_code: string
    sizes: ProductSize[]
    images: ProductImage[]
}

interface Product {
    product_id: string
    product_name: string
    product_type: string
    gender?: string
    description: string
    colors: ProductColor[]
    // New AI/Style Fields
    material?: string
    fit?: string
    pattern?: string
    style_tags?: string[]
    season?: string[]
    use_cases?: string[]
    formality_score?: number
    versatility?: number
    statement_piece?: boolean
    color_family?: string
    affiliate_url?: string
}

interface EditProductModalProps {
    product: Product
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

const FITS = ['Slim', 'Regular', 'Oversized', 'Loose', 'Skinny', 'Relaxed']
const PATTERNS = ['Solid', 'Striped', 'Checked', 'Graphic', 'Floral', 'Polka Dot']
const COLOR_FAMILIES = ['Neutral', 'Warm', 'Cool', 'Pastel', 'Bright', 'Dark']
const VIEW_TYPES = ['Front', 'Back', 'Side', 'Close-up', 'Model', 'Common']

export default function EditProductModal({ product, isOpen, onClose, onSave }: EditProductModalProps) {
    const [formData, setFormData] = useState<Product>(product)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // --- Media Logic ---
    const [mediaModalOpen, setMediaModalOpen] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [selectedColorIndexForMedia, setSelectedColorIndexForMedia] = useState<number>(0)
    const [selectedViewType, setSelectedViewType] = useState<string>('Front')

    // Reset form and fetch full details when product changes
    useEffect(() => {
        if (product && isOpen) {
            const fetchDetails = async () => {
                const brandId = localStorage.getItem('cove_brand_id')
                if (!brandId) return

                try {
                    // Initialize with passed data first to avoid empty flicker
                    const initialData = JSON.parse(JSON.stringify(product))
                    if (!initialData.colors) initialData.colors = []
                    setFormData(initialData)

                    // Fetch full details (deep colors/sizes)
                    const res = await fetch(`${API_BASE}/api/brands/${brandId}/products/${product.product_id}/`)
                    if (res.ok) {
                        const fullData = await res.json()
                        if (!fullData.colors) fullData.colors = []
                        setFormData(fullData)
                    }
                } catch (err) {
                    console.error("Failed to fetch full details", err)
                }
            }
            fetchDetails()
        }
    }, [product, isOpen])

    // --- Variant Logic ---
    const addColor = () => {
        setFormData(prev => ({
            ...prev,
            colors: [
                ...prev.colors,
                {
                    color_name: '',
                    hex_code: '#000000',
                    sizes: [
                        { size_label: 'S', stock_quantity: 0, base_price: '' },
                        { size_label: 'M', stock_quantity: 0, base_price: '' },
                        { size_label: 'L', stock_quantity: 0, base_price: '' }
                    ],
                    images: []
                }
            ]
        }))
    }

    const removeColor = (index: number) => {
        if (formData.colors.length <= 1) return
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.filter((_, i) => i !== index)
        }))
    }

    // --- Color Autosuggest Logic ---
    const fetchColorName = async (hex: string, colorIndex: number) => {
        if (!hex || hex.length < 4) return

        // Simple debounce manually or just call. Since user types hex, we can wait a bit or just call on blur.
        // For better UX during typing, we wait for 7 chars (#RRGGBB) or 4 (#RGB)
        if (hex.length !== 7 && hex.length !== 4) return

        try {
            const res = await fetch(`${API_BASE}/api/tools/color-name/?hex=${encodeURIComponent(hex)}`)
            if (res.ok) {
                const data = await res.json()
                if (data.status === 'success') {
                    setFormData(prev => ({
                        ...prev,
                        colors: prev.colors.map((c, i) =>
                            i === colorIndex
                                // Only auto-fill if empty or previously auto-filled (we can't track "previously auto-filled" easily, so just if empty/default)
                                // actually user asked to suggest, picking recommended. 
                                ? { ...c, color_name: c.color_name ? c.color_name : data.recommended_name }
                                : c
                        )
                    }))
                }
            }
        } catch (e) {
            console.error("Failed to fetch color name", e)
        }
    }

    const updateColor = (colorIndex: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, i) =>
                i === colorIndex ? { ...color, [field]: value } : color
            )
        }))

        // Trigger autosuggest if hex changed
        if (field === 'hex_code') {
            fetchColorName(value, colorIndex)
        }
    }

    const updateSize = (colorIndex: number, sizeIndex: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, ci) =>
                ci === colorIndex
                    ? {
                        ...color,
                        sizes: color.sizes.map((size, si) =>
                            si === sizeIndex ? { ...size, [field]: value } : size
                        )
                    }
                    : color
            )
        }))
    }

    const addSize = (colorIndex: number) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, i) =>
                i === colorIndex
                    ? {
                        ...color,
                        sizes: [...color.sizes, { size_label: 'XL', stock_quantity: 0, base_price: color.sizes[0]?.base_price || '' }]
                    }
                    : color
            )
        }))
    }

    const removeSize = (colorIndex: number, sizeIndex: number) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, i) =>
                i === colorIndex
                    ? { ...color, sizes: color.sizes.filter((_, si) => si !== sizeIndex) }
                    : color
            )
        }))
    }

    // --- Media Gallery Handlers ---
    const handleGlobalImageUpload = (url: string) => {
        setTempImage(url)
        // Auto-select first color if available
        if (formData.colors.length > 0) setSelectedColorIndexForMedia(0)
    }

    const saveMediaToColor = () => {
        if (!tempImage) return

        if (formData.colors.length === 0) {
            alert("Please add a color variant first!")
            return
        }

        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, i) =>
                i === selectedColorIndexForMedia
                    ? {
                        ...color,
                        images: [...color.images, {
                            image_url: tempImage,
                            display_order: color.images.length + 1,
                            is_primary: color.images.length === 0,
                            view_type: selectedViewType // Saving view type
                        }]
                    }
                    : color
            )
        }))
        setTempImage(null)
        setMediaModalOpen(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) return

        try {
            const response = await fetch(`${API_BASE}/api/brands/${brandId}/products/${product.product_id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(`Failed to update: ${text}`)
            }

            onSave()
            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Edit Product</h2>
                            <p className="text-sm text-gray-500">{product.product_id}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300">
                        <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-8">

                            {/* --- MEDIA GALLERY (New) --- */}
                            <section className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 dashed">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-semibold text-slate-800">Media Gallery</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMediaModalOpen(true)}
                                        className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm"
                                    >
                                        + Add New Image
                                    </button>
                                </div>
                                {/* Preview Strip of all images across all colors */}
                                <div className="flex gap-4 overflow-x-auto pb-2 min-h-[100px] items-center">
                                    {(formData.colors || []).flatMap((c, cIdx) => (c.images || []).map((img, iIdx) => (
                                        <div key={`${cIdx}-${iIdx}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 group bg-white shadow-sm">
                                            <img src={img.image_url} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white p-1">
                                                <span className="text-[10px] font-bold">{c.color_name}</span>
                                                {img.view_type && <span className="text-[9px] bg-blue-500 px-1 rounded mt-1">{img.view_type}</span>}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newColors = [...(formData.colors || [])]
                                                        newColors[cIdx].images = newColors[cIdx].images.filter((_, i) => i !== iIdx)
                                                        setFormData({ ...formData, colors: newColors })
                                                    }}
                                                    className="mt-1 p-1 bg-red-500 rounded-full hover:bg-red-600"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    )))}
                                    {(!formData.colors || formData.colors.every(c => (c.images || []).length === 0)) && (
                                        <div className="text-sm text-slate-500 italic py-2 w-full text-center">No images uploaded yet. Click "Add New Image" to start.</div>
                                    )}
                                </div>
                            </section>

                            {/* 1. Basic Info */}
                            <section>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                        <input
                                            type="text"
                                            value={formData.product_name}
                                            onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={formData.product_type}
                                            onChange={e => setFormData({ ...formData, product_type: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {['T-Shirt', 'Detailed Tee', 'Zip Hoodie', 'Hoodie', 'Jacket', 'Pants', 'Shorts', 'Dress', 'Shoes', 'Accessories', 'Other'].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        <select
                                            value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="men">Men</option>
                                            <option value="women">Women</option>
                                            <option value="unisex">Unisex</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 2. Affiliate / External Link */}
                            <section className="bg-green-50/50 rounded-xl p-6 border border-green-100 dashed">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="font-semibold text-slate-800">Affiliate Link (Optional)</h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">External Product URL</label>
                                    <input
                                        type="url"
                                        value={formData.affiliate_url || ''}
                                        onChange={e => setFormData({ ...formData, affiliate_url: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none placeholder:text-gray-400"
                                        placeholder="https://brand.com/products/jacket..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        If provided, the "Add to Cart" button will be replaced by a "Buy on Brand Site" button redirecting users here.
                                    </p>
                                </div>
                            </section>

                            {/* 3. Style & AI Details */}
                            <section className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-semibold text-slate-800">Style & AI Details</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                                        <input
                                            type="text"
                                            value={formData.material || ''}
                                            onChange={e => setFormData({ ...formData, material: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="e.g. Cotton"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Fit</label>
                                        <select
                                            value={formData.fit || 'regular'}
                                            onChange={e => setFormData({ ...formData, fit: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        >
                                            {FITS.map(f => (
                                                <option key={f} value={f.toLowerCase()}>{f}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                                        <select
                                            value={formData.pattern || 'solid'}
                                            onChange={e => setFormData({ ...formData, pattern: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        >
                                            {PATTERNS.map(p => (
                                                <option key={p} value={p.toLowerCase()}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color Family</label>
                                        <select
                                            value={formData.color_family || 'neutral'}
                                            onChange={e => setFormData({ ...formData, color_family: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        >
                                            {COLOR_FAMILIES.map(c => (
                                                <option key={c} value={c.toLowerCase()}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sliders */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                                            <span>Formality Score</span>
                                            <span className="font-bold text-blue-600">{formData.formality_score || 5}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={formData.formality_score || 5}
                                            onChange={(e) => setFormData({ ...formData, formality_score: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                                            <span>Versatility Score</span>
                                            <span className="font-bold text-purple-600">{formData.versatility || 5}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={formData.versatility || 5}
                                            onChange={(e) => setFormData({ ...formData, versatility: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                    </div>

                                    {/* Statement Toggle */}
                                    <div className="col-span-2 flex items-center justify-between p-3 bg-yellow-50/50 rounded-lg border border-yellow-100">
                                        <span className="text-sm font-medium text-yellow-900">Statement Piece?</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.statement_piece || false}
                                            onChange={(e) => setFormData({ ...formData, statement_piece: e.target.checked })}
                                            className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 3. Color Variants (Full Control) */}
                            <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                            <Palette className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-900">Color Variants</h2>
                                        <div className="text-xs text-slate-500 font-normal ml-2">({(formData.colors || []).length})</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addColor}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Color
                                    </button>
                                </div>

                                {(!formData.colors || formData.colors.length === 0) ? (
                                    <div className="text-center p-8 bg-slate-50 dashed border border-slate-200 rounded-xl">
                                        <p className="text-slate-500 mb-2">No color variants added yet.</p>
                                        <button type="button" onClick={addColor} className="text-blue-600 font-bold hover:underline">Add your first color</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {formData.colors?.map((color, colorIndex) => (
                                            <div key={colorIndex} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-medium text-slate-900">Color Variant #{colorIndex + 1}</h3>
                                                    {(formData.colors?.length || 0) > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeColor(colorIndex)}
                                                            className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Color Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={color.color_name}
                                                            onChange={(e) => updateColor(colorIndex, 'color_name', e.target.value)}
                                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                                                            placeholder="e.g., Black"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Hex Code</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={color.hex_code}
                                                                onChange={(e) => updateColor(colorIndex, 'hex_code', e.target.value)}
                                                                className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                required
                                                                value={color.hex_code}
                                                                onChange={(e) => updateColor(colorIndex, 'hex_code', e.target.value)}
                                                                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                                                                placeholder="#000000"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Sizes */}
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                                            <Ruler className="w-4 h-4" />
                                                            Sizes & Stock
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => addSize(colorIndex)}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            + Add Size
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {color.sizes.map((size, sizeIndex) => (
                                                            <div key={sizeIndex} className="grid grid-cols-12 gap-2">
                                                                <div className="col-span-3">
                                                                    <input
                                                                        type="text"
                                                                        value={size.size_label}
                                                                        onChange={(e) => updateSize(colorIndex, sizeIndex, 'size_label', e.target.value)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                                                                        placeholder="Size"
                                                                    />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <input
                                                                        type="number"
                                                                        value={size.stock_quantity}
                                                                        onChange={(e) => updateSize(colorIndex, sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                                                                        placeholder="Stock"
                                                                    />
                                                                </div>
                                                                <div className="col-span-5">
                                                                    <input
                                                                        type="text"
                                                                        value={size.base_price}
                                                                        onChange={(e) => updateSize(colorIndex, sizeIndex, 'base_price', e.target.value)}
                                                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                                                                        placeholder="Price"
                                                                    />
                                                                </div>
                                                                <div className="col-span-1 flex items-center">
                                                                    {color.sizes.length > 1 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeSize(colorIndex, sizeIndex)}
                                                                            className="p-1 hover:bg-red-100 rounded text-red-600"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {error && (
                                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-product-form"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>

                    {/* --- INNER MEDIA MODAL --- */}
                    {mediaModalOpen && (
                        <div className="absolute inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                                <h3 className="text-lg font-bold mb-4">Add Product Image</h3>

                                {!tempImage ? (
                                    <div className="mb-4">
                                        <ImageUpload
                                            onUpload={(url) => handleGlobalImageUpload(url)}
                                            label="Upload from Device or URL"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-full h-48 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                                            <img src={tempImage} className="h-full object-contain" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Associate with Color</label>
                                            <select
                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                value={selectedColorIndexForMedia}
                                                onChange={(e) => setSelectedColorIndexForMedia(parseInt(e.target.value))}
                                            >
                                                {formData.colors.length === 0 && <option value="-1">No colors available (Add one first)</option>}
                                                {formData.colors.map((c, i) => (
                                                    <option key={i} value={i}>{c.color_name || `Color ${i + 1}`}</option>
                                                ))}
                                            </select>

                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">View Type</label>
                                            <select
                                                className="w-full p-2 border border-slate-200 rounded-lg"
                                                value={selectedViewType}
                                                onChange={(e) => setSelectedViewType(e.target.value)}
                                            >
                                                {VIEW_TYPES.map(vt => (
                                                    <option key={vt} value={vt}>{vt}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {formData.colors.length === 0 && (
                                            <p className="text-xs text-red-500 mt-1 bg-red-50 p-2 rounded">
                                                ⚠️ You must add a color variant in the background before you can link this image.
                                            </p>
                                        )}

                                        <div className="flex justify-end gap-2 pt-2">
                                            <button
                                                onClick={() => { setTempImage(null); setMediaModalOpen(false) }}
                                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={saveMediaToColor}
                                                disabled={formData.colors.length === 0}
                                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                Link Image
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </motion.div>
            </div>
        </AnimatePresence>
    )
}
