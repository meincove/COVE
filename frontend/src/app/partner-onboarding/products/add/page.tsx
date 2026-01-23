'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Package,
    ArrowLeft,
    Plus,
    X,
    Image as ImageIcon,
    Check,
    Loader2,
    Palette,
    Ruler
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

interface Size {
    size_label: string
    stock_quantity: number
    base_price: string
}

interface ProductImage {
    image_url: string
    display_order: number
    is_primary: boolean
}

interface Color {
    color_name: string
    hex_code: string
    sizes: Size[]
    images: ProductImage[]
}

interface ProductFormData {
    product_name: string
    product_type: string
    gender: string
    description: string
    colors: Color[]
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const PRODUCT_TYPES = ['T-Shirt', 'Dress', 'Pants', 'Jacket', 'Shoes', 'Accessories', 'Other']
const GENDERS = ['men', 'women', 'unisex']

export default function AddProductPage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [placeholder, setPlaceholder] = useState<string>('https://via.placeholder.com/400x500/3b82f6/ffffff?text=Fashion+Product')

    const PLACEHOLDER_OPTIONS = [
        { url: 'https://via.placeholder.com/400x500/3b82f6/ffffff?text=Fashion+Product', label: 'Blue Fashion' },
        { url: 'https://via.placeholder.com/400x500/8b5cf6/ffffff?text=Premium+Style', label: 'Purple Premium' },
        { url: 'https://via.placeholder.com/400x500/ec4899/ffffff?text=Trendy+Item', label: 'Pink Trendy' }
    ]

    const [formData, setFormData] = useState<ProductFormData>({
        product_name: '',
        product_type: 'T-Shirt',
        gender: 'unisex',
        description: '',
        colors: [
            {
                color_name: '',
                hex_code: '#000000',
                sizes: [
                    { size_label: 'S', stock_quantity: 0, base_price: '' },
                    { size_label: 'M', stock_quantity: 0, base_price: '' },
                    { size_label: 'L', stock_quantity: 0, base_price: '' }
                ],
                images: [{ image_url: '', display_order: 1, is_primary: true }]
            }
        ]
    })

    const addColor = () => {
        setFormData(prev => ({
            ...prev,
            colors: [
                ...prev.colors,
                {
                    color_name: '',
                    hex_code: '#000000',
                    sizes: [
                        { size_label: 'S', stock_quantity: 0, base_price: prev.colors[0]?.sizes[0]?.base_price || '' },
                        { size_label: 'M', stock_quantity: 0, base_price: prev.colors[0]?.sizes[0]?.base_price || '' },
                        { size_label: 'L', stock_quantity: 0, base_price: prev.colors[0]?.sizes[0]?.base_price || '' }
                    ],
                    images: [{ image_url: '', display_order: 1, is_primary: true }]
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

    const updateColor = (colorIndex: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, i) =>
                i === colorIndex ? { ...color, [field]: value } : color
            )
        }))
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

    const updateImage = (colorIndex: number, imageIndex: number, url: string) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.map((color, ci) =>
                ci === colorIndex
                    ? {
                        ...color,
                        images: color.images.map((img, ii) =>
                            ii === imageIndex ? { ...img, image_url: url } : img
                        )
                    }
                    : color
            )
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) {
            setError('Brand ID not found. Please register first.')
            setLoading(false)
            return
        }

        try {
            // Filter out empty images - if none provided, use placeholder
            const cleanedData = {
                ...formData,
                colors: formData.colors.map(color => {
                    const validImages = color.images.filter(img => img.image_url.trim() !== '')

                    // If no images provided, use selected placeholder
                    const finalImages = validImages.length > 0
                        ? validImages
                        : [{
                            image_url: placeholder,
                            display_order: 1,
                            is_primary: true
                        }]

                    return {
                        ...color,
                        images: finalImages
                    }
                })
            }

            console.log('Sending product data:', JSON.stringify(cleanedData, null, 2))

            const response = await fetch(`${API_BASE}/api/brands/${brandId}/products/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedData)
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Server response:', errorText)
                let errorData
                try {
                    errorData = JSON.parse(errorText)
                } catch {
                    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`)
                }
                throw new Error(errorData.message || `HTTP ${response.status}: Failed to create product`)
            }

            setSuccess(true)
            setTimeout(() => {
                window.location.href = '/partner-onboarding/dashboard'
            }, 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md text-center"
                >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Product Created!</h2>
                    <p className="text-slate-600">Redirecting to dashboard...</p>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <a
                        href="/partner-onboarding/dashboard"
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </a>
                    <h1 className="text-3xl font-semibold text-slate-900 mb-2">Add New Product</h1>
                    <p className="text-slate-600">Fill in the details below to add a product to your catalog</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Product Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.product_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                    placeholder="e.g., Premium Cotton T-Shirt"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Product Type *
                                </label>
                                <select
                                    required
                                    value={formData.product_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, product_type: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                >
                                    {PRODUCT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Gender *
                                </label>
                                <select
                                    required
                                    value={formData.gender}
                                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                >
                                    <option value="men">Men</option>
                                    <option value="women">Women</option>
                                    <option value="unisex">Unisex</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none text-slate-900"
                                    placeholder="Describe your product..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Color Variants */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                    <Palette className="w-5 h-5 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-900">Color Variants</h2>
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

                        <div className="space-y-6">
                            {formData.colors.map((color, colorIndex) => (
                                <div key={colorIndex} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-medium text-slate-900">Color {colorIndex + 1}</h3>
                                        {formData.colors.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeColor(colorIndex)}
                                                className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Color Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={color.color_name}
                                                onChange={(e) => updateColor(colorIndex, 'color_name', e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                                placeholder="e.g., Black"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Hex Code *
                                            </label>
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
                                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                                    placeholder="#000000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sizes for this color */}
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
                                                            required
                                                            value={size.size_label}
                                                            onChange={(e) => updateSize(colorIndex, sizeIndex, 'size_label', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-900"
                                                            placeholder="Size"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            required
                                                            min="0"
                                                            value={size.stock_quantity}
                                                            onChange={(e) => updateSize(colorIndex, sizeIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-900"
                                                            placeholder="Stock"
                                                        />
                                                    </div>
                                                    <div className="col-span-5">
                                                        <input
                                                            type="text"
                                                            required
                                                            value={size.base_price}
                                                            onChange={(e) => updateSize(colorIndex, sizeIndex, 'base_price', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-900"
                                                            placeholder="Price (€)"
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

                                    {/* Placeholder Thumbnails */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-3">
                                            Choose Placeholder (or add your own URL below)
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {PLACEHOLDER_OPTIONS.map((option, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setPlaceholder(option.url)}
                                                    className={`relative aspect-[4/5] rounded-lg border-2 transition-all overflow-hidden group ${placeholder === option.url
                                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                                            : 'border-slate-300 hover:border-blue-300'
                                                        }`}
                                                >
                                                    <img
                                                        src={option.url}
                                                        alt={option.label}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {placeholder === option.url && (
                                                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                                            <Check className="w-6 h-6 text-white drop-shadow-lg" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                                        <p className="text-xs text-white font-medium">{option.label}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Image URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" />
                                            Or Add Custom Image URL
                                        </label>
                                        <input
                                            type="url"
                                            value={color.images[0]?.image_url || ''}
                                            onChange={(e) => updateImage(colorIndex, 0, e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                            placeholder="https://example.com/image.jpg (overrides placeholder)"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">💡 Leave empty to use selected placeholder above</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex items-center justify-between">
                        <a
                            href="/partner-onboarding/dashboard"
                            className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </a>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/30"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Product...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Create Product
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
