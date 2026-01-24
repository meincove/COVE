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
    Ruler,
    Trash2
} from 'lucide-react'
import ImageUpload from '../../../../components/partner/ImageUpload'

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
    view_type?: string
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
    material: string
    fit: string
    pattern: string
    style_tags: string[]
    season: string[]
    use_cases: string[]
    formality_score: number
    versatility: number
    statement_piece: boolean
    color_family: string
    colors: Color[]
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const PRODUCT_TYPES = ['T-Shirt', 'Dress', 'Pants', 'Jacket', 'Shoes', 'Accessories', 'Other']
const FITS = ['Slim', 'Regular', 'Oversized', 'Loose', 'Skinny', 'Relaxed']
const PATTERNS = ['Solid', 'Striped', 'Checked', 'Graphic', 'Floral', 'Polka Dot']
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter']
const USE_CASES = ['Casual', 'Work', 'Party', 'Sport', 'Formal', 'Travel']
const COLOR_FAMILIES = ['Neutral', 'Warm', 'Cool', 'Pastel', 'Bright', 'Dark']
const VIEW_TYPES = ['Front', 'Back', 'Side', 'Close-up', 'Model', 'Common']

export default function AddProductPage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Media logic
    const [mediaModalOpen, setMediaModalOpen] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [selectedColorIndexForMedia, setSelectedColorIndexForMedia] = useState<number>(0)
    const [selectedViewType, setSelectedViewType] = useState<string>('Front')

    const [formData, setFormData] = useState<ProductFormData>({
        product_name: '',
        product_type: 'T-Shirt',
        gender: 'unisex',
        description: '',
        material: '',
        fit: 'Regular',
        pattern: 'Solid',
        style_tags: [],
        season: [],
        use_cases: [],
        formality_score: 5,
        versatility: 5,
        statement_piece: false,
        color_family: 'Neutral',
        colors: [
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
        if (!hex || (hex.length !== 7 && hex.length !== 4)) return

        try {
            const res = await fetch(`${API_BASE}/api/tools/color-name/?hex=${encodeURIComponent(hex)}`)
            if (res.ok) {
                const data = await res.json()
                if (data.status === 'success') {
                    setFormData(prev => ({
                        ...prev,
                        colors: prev.colors.map((c, i) =>
                            i === colorIndex
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
                            view_type: selectedViewType
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
        setLoading(true)
        setError(null)

        const brandId = localStorage.getItem('cove_brand_id')
        if (!brandId) {
            setError('Brand ID not found. Please register first.')
            setLoading(false)
            return
        }

        try {
            console.log('Sending product data:', JSON.stringify(formData, null, 2))

            const response = await fetch(`${API_BASE}/api/brands/${brandId}/products/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
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

                    {/* --- MEDIA GALLERY (New) --- */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                                <h3 className="font-semibold text-slate-800">Media Gallery</h3>
                                <p className="text-xs text-slate-500 ml-2">(Upload images and link them to colors)</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMediaModalOpen(true)}
                                className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm"
                            >
                                + Add New Image
                            </button>
                        </div>
                        {/* Preview Strip of all images across all colors */}
                        <div className="flex gap-4 overflow-x-auto pb-2 min-h-[100px] items-center bg-slate-50/50 p-4 rounded-lg border border-slate-100 border-dashed">
                            {(formData.colors || []).flatMap((c, cIdx) => (c.images || []).map((img, iIdx) => (
                                <div key={`${cIdx}-${iIdx}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 group bg-white shadow-sm">
                                    <img src={img.image_url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white p-1">
                                        <span className="text-[10px] font-bold">{c.color_name}</span>
                                        {img.view_type && <span className="text-[9px] bg-blue-500 px-1 rounded mt-1">{img.view_type}</span>}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newColors = [...formData.colors]
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
                                <div className="text-sm text-slate-400 italic py-2 w-full text-center">
                                    No images uploaded yet. Click "Add New Image" above.
                                </div>
                            )}
                        </div>
                    </div>


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

                    {/* Advanced Details & AI Data */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">Style & AI Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Material & Fit */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Material</label>
                                <input
                                    type="text"
                                    value={formData.material}
                                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900"
                                    placeholder="e.g., 100% Cotton, Denim"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Fit</label>
                                <select
                                    value={formData.fit}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fit: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900"
                                >
                                    {FITS.map(f => <option key={f} value={f.toLowerCase()}>{f}</option>)}
                                </select>
                            </div>

                            {/* Pattern & Color Family */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Pattern</label>
                                <select
                                    value={formData.pattern}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900"
                                >
                                    {PATTERNS.map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Dominant Color Family</label>
                                <select
                                    value={formData.color_family}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color_family: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-slate-900"
                                >
                                    {COLOR_FAMILIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                                </select>
                            </div>

                            {/* Seasons (Multi-select) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Suitable Seasons</label>
                                <div className="flex flex-wrap gap-2">
                                    {SEASONS.map(season => (
                                        <button
                                            key={season}
                                            type="button"
                                            onClick={() => {
                                                const s = season.toLowerCase()
                                                setFormData(prev => ({
                                                    ...prev,
                                                    season: prev.season.includes(s)
                                                        ? prev.season.filter(i => i !== s)
                                                        : [...prev.season, s]
                                                }))
                                            }}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.season.includes(season.toLowerCase())
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {season}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Use Cases (Multi-select) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Occasions / Use Cases</label>
                                <div className="flex flex-wrap gap-2">
                                    {USE_CASES.map(useCase => (
                                        <button
                                            key={useCase}
                                            type="button"
                                            onClick={() => {
                                                const u = useCase.toLowerCase()
                                                setFormData(prev => ({
                                                    ...prev,
                                                    use_cases: prev.use_cases.includes(u)
                                                        ? prev.use_cases.filter(i => i !== u)
                                                        : [...prev.use_cases, u]
                                                }))
                                            }}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${formData.use_cases.includes(useCase.toLowerCase())
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {useCase}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sliders */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                                    <span>Formality Score (1-10)</span>
                                    <span className="font-bold text-blue-600">{formData.formality_score}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={formData.formality_score}
                                    onChange={(e) => setFormData(prev => ({ ...prev, formality_score: parseInt(e.target.value) }))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>Gym/Lounge</span>
                                    <span>Black Tie</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                                    <span>Versatility Score (1-10)</span>
                                    <span className="font-bold text-purple-600">{formData.versatility}</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={formData.versatility}
                                    onChange={(e) => setFormData(prev => ({ ...prev, versatility: parseInt(e.target.value) }))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>Niche</span>
                                    <span>Everyday Staple</span>
                                </div>
                            </div>

                            {/* Statement Piece Toggle */}
                            <div className="md:col-span-2 flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                                <div>
                                    <h4 className="font-medium text-yellow-900">Statement Piece?</h4>
                                    <p className="text-sm text-yellow-700">Is this a focal item that defines an outfit?</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.statement_piece}
                                        onChange={(e) => setFormData(prev => ({ ...prev, statement_piece: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                </label>
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

                {/* --- INNER MEDIA MODAL --- */}
                {mediaModalOpen && (
                    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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

            </div>
        </div>
    )
}
