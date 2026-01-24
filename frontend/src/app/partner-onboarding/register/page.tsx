'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Building2,
    Mail,
    Phone,
    MapPin,
    FileText,
    Truck,
    CreditCard,
    Layers,
    ArrowRight,
    ArrowLeft,
    Check,
    Loader2
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001'

interface FormData {
    // Step 1: Basic Info
    brand_name: string
    contact_email: string
    country: string
    brand_type: 'direct' | 'affiliate'

    // Step 2: Business Details
    contact_name: string
    contact_phone: string
    company_registration: string
    description: string

    // Step 3: Shipping
    ships_from_country: string

    // Step 4: Integration
    integration_method: 'manual' | 'csv' | 'shopify' | 'woocommerce' | 'api'
}

export default function BrandRegistrationWizard() {
    const [currentStep, setCurrentStep] = useState(1)
    const [brandId, setBrandId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<FormData>({
        brand_name: '',
        contact_email: '',
        country: 'DE',
        brand_type: 'direct',
        contact_name: '',
        contact_phone: '',
        company_registration: '',
        description: '',
        ships_from_country: 'DE',
        integration_method: 'manual'
    })

    const totalSteps = 4

    const updateFormData = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
    }

    // Step 1: Register Brand
    const handleStep1 = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/api/brands/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand_name: formData.brand_name,
                    contact_email: formData.contact_email,
                    country: formData.country,
                    brand_type: formData.brand_type
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Registration failed')
            }

            const data = await response.json()
            setBrandId(data.brand_id)

            // Save brand_id to localStorage for dashboard access
            localStorage.setItem('cove_brand_id', data.brand_id)

            setCurrentStep(2)
        } catch (err: any) {
            setError(err.message || 'Failed to register brand')
        } finally {
            setLoading(false)
        }
    }

    // Step 2: Business Info
    const handleStep2 = async () => {
        if (!brandId) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/api/brands/${brandId}/business-info/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contact_name: formData.contact_name,
                    contact_phone: formData.contact_phone,
                    company_registration: formData.company_registration,
                    description: formData.description
                })
            })

            if (!response.ok) throw new Error('Failed to update business info')

            setCurrentStep(3)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Step 3: Shipping
    const handleStep3 = async () => {
        if (!brandId) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/api/brands/${brandId}/shipping/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ships_from_country: formData.ships_from_country
                })
            })

            if (!response.ok) throw new Error('Failed to update shipping settings')

            // Skip Stripe Connect for MVP
            const stripeResponse = await fetch(`${API_BASE}/api/brands/${brandId}/stripe-connect/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (!stripeResponse.ok) throw new Error('Payment setup failed')

            setCurrentStep(4)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Step 4: Integration Choice
    const handleStep4 = async () => {
        if (!brandId) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/api/brands/${brandId}/integration/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integration_method: formData.integration_method
                })
            })

            if (!response.ok) throw new Error('Failed to set integration method')

            const data = await response.json()

            // Redirect based on integration method
            if (formData.integration_method === 'manual') {
                window.location.href = '/partner-onboarding/dashboard'
            } else if (formData.integration_method === 'csv') {
                window.location.href = '/partner-onboarding/products/bulk'
            } else {
                window.location.href = '/partner-onboarding/dashboard'
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleNext = () => {
        if (currentStep === 1) handleStep1()
        else if (currentStep === 2) handleStep2()
        else if (currentStep === 3) handleStep3()
        else if (currentStep === 4) handleStep4()
    }

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-6 py-16">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <a href="/partner-onboarding" className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Partner Page</span>
                    </a>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
                        Join COVE AI Partners
                    </h1>
                    <p className="text-slate-500">Complete your brand registration in {totalSteps} simple steps</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step < currentStep
                                    ? 'bg-green-500 text-white'
                                    : step === currentStep
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-200 text-slate-400'
                                    }`}>
                                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                                </div>
                                {step < 4 && (
                                    <div className={`h-1 w-16 md:w-32 mx-2 rounded-full ${step < currentStep ? 'bg-green-500' : 'bg-slate-200'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>Brand Info</span>
                        <span>Business</span>
                        <span>Shipping</span>
                        <span>Integration</span>
                    </div>
                </div>

                {/* Form Card */}
                <motion.div
                    className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <AnimatePresence mode="wait">
                        {/* Step 1: Brand Information */}
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Brand Information</h2>
                                        <p className="text-sm text-slate-500">Tell us about your brand</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Brand Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.brand_name}
                                            onChange={(e) => updateFormData('brand_name', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                            placeholder="e.g., Awesome Fashion Co"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Contact Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.contact_email}
                                            onChange={(e) => updateFormData('contact_email', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                            placeholder="contact@yourbrand.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Country *
                                        </label>
                                        <select
                                            value={formData.country}
                                            onChange={(e) => updateFormData('country', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                        >
                                            <option value="DE">Germany (DE)</option>
                                            <option value="FR">France (FR)</option>
                                            <option value="IT">Italy (IT)</option>
                                            <option value="ES">Spain (ES)</option>
                                            <option value="NL">Netherlands (NL)</option>
                                            <option value="BE">Belgium (BE)</option>
                                            <option value="AT">Austria (AT)</option>
                                            <option value="PL">Poland (PL)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Brand Type *
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => updateFormData('brand_type', 'direct')}
                                                className={`p-4 rounded-lg border-2 transition-all ${formData.brand_type === 'direct'
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="font-medium text-slate-900">Direct Seller</div>
                                                <div className="text-xs text-slate-500 mt-1">I ship products myself</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateFormData('brand_type', 'affiliate')}
                                                className={`p-4 rounded-lg border-2 transition-all ${formData.brand_type === 'affiliate'
                                                    ? 'border-blue-600 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="font-medium text-slate-900">Affiliate</div>
                                                <div className="text-xs text-slate-500 mt-1">Redirect to my store</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Business Details */}
                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Business Details</h2>
                                        <p className="text-sm text-slate-500">Company information</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Contact Person *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contact_name}
                                            onChange={(e) => updateFormData('contact_name', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.contact_phone}
                                            onChange={(e) => updateFormData('contact_phone', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                            placeholder="+49 123 456 789"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            VAT / Business Registration
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company_registration}
                                            onChange={(e) => updateFormData('company_registration', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                            placeholder="DE123456789"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Brand Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => updateFormData('description', e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none text-slate-900"
                                            placeholder="Tell us about your brand, your style, and what makes you unique..."
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Shipping */}
                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Shipping Settings</h2>
                                        <p className="text-sm text-slate-500">Where do you ship from?</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Ships From Country *
                                        </label>
                                        <select
                                            value={formData.ships_from_country}
                                            onChange={(e) => updateFormData('ships_from_country', e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-900"
                                        >
                                            <option value="DE">Germany (DE)</option>
                                            <option value="FR">France (FR)</option>
                                            <option value="IT">Italy (IT)</option>
                                            <option value="ES">Spain (ES)</option>
                                            <option value="NL">Netherlands (NL)</option>
                                            <option value="BE">Belgium (BE)</option>
                                            <option value="AT">Austria (AT)</option>
                                            <option value="PL">Poland (PL)</option>
                                        </select>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div>
                                                <div className="font-medium text-blue-900 text-sm mb-1">Payment Setup (Skipped for MVP)</div>
                                                <p className="text-xs text-blue-700">
                                                    Stripe Connect will be configured later. You can start adding products now!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Integration */}
                        {currentStep === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Layers className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">How will you add products?</h2>
                                        <p className="text-sm text-slate-500">Choose your integration method</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { value: 'manual', label: 'Manual Entry', desc: 'Add products one by one via web form' },
                                        { value: 'csv', label: 'CSV Upload', desc: 'Bulk upload products from spreadsheet' },
                                        { value: 'shopify', label: 'Shopify Sync', desc: 'Connect your Shopify store (Coming Soon)', disabled: true },
                                        { value: 'woocommerce', label: 'WooCommerce Sync', desc: 'Connect your WooCommerce store (Coming Soon)', disabled: true },
                                    ].map((method) => (
                                        <button
                                            key={method.value}
                                            type="button"
                                            disabled={method.disabled}
                                            onClick={() => updateFormData('integration_method', method.value as any)}
                                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${formData.integration_method === method.value
                                                ? 'border-blue-600 bg-blue-50'
                                                : method.disabled
                                                    ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="font-medium text-slate-900">{method.label}</div>
                                            <div className="text-xs text-slate-500 mt-1">{method.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1 || loading}
                            className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={loading || !formData.brand_name || !formData.contact_email}
                            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-600/30"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : currentStep === 4 ? (
                                <>
                                    Complete
                                    <Check className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
