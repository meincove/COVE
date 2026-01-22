'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useMemo } from 'react'
import { useAuthModal } from '@/src/context/AuthModalContext'

interface AuthDialogProps {
    isOpen: boolean
    onClose: () => void
    destination: '/shopping' | '/partner-onboarding'
    pathType: 'shopping' | 'platform'
}

export default function AuthDialog({ isOpen, onClose, destination, pathType }: AuthDialogProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { isSignedIn } = useAuth()
    const { openAuthModal } = useAuthModal()

    const currentUrl = useMemo(() => {
        const qs = searchParams?.toString()
        return `${pathname}${qs ? `?${qs}` : ''}`
    }, [pathname, searchParams])

    useEffect(() => {
        if (isOpen && isSignedIn) {
            router.push(destination)
            onClose()
        }
    }, [isOpen, isSignedIn, destination, router, onClose])

    if (!isOpen) return null

    const handleSignUp = () => {
        localStorage.setItem('cove_selected_path', pathType)

        // ✅ remember where the auth was triggered from
        localStorage.setItem('cove_return_to', currentUrl)

        // ✅ optional: where you want them to land after auth
        localStorage.setItem('cove_destination', destination)

        openAuthModal('sign-up', destination)
        onClose()
    }

    const handleSignIn = () => {
        localStorage.setItem('cove_selected_path', pathType)
        localStorage.setItem('cove_return_to', currentUrl)
        localStorage.setItem('cove_destination', destination)

        openAuthModal('sign-in', destination)
        onClose()
    }

    const handleSkip = () => {
        router.push(destination)
        onClose()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close dialog"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {pathType === 'shopping' ? 'Start Shopping' : 'Join Our Platform'}
                    </h2>
                    <p className="text-center text-gray-600">
                        {pathType === 'shopping'
                            ? 'Sign in to unlock personalized recommendations and exclusive deals'
                            : 'Partner with us to grow your brand with AI-powered insights'}
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleSignUp}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>New user? Sign Up</span>
                        </div>
                    </button>

                    <button
                        onClick={handleSignIn}
                        className="w-full bg-white border-2 border-purple-600 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>Already our user? Sign In</span>
                        </div>
                    </button>

                    <button
                        onClick={handleSkip}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>Skip for now</span>
                        </div>
                    </button>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                    {pathType === 'shopping'
                        ? 'You can browse as a guest, but signing in unlocks AI-powered recommendations'
                        : 'Create an account to access our partner dashboard and analytics'}
                </p>
            </div>
        </div>
    )
}
