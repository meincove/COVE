'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

interface AuthDialogProps {
    isOpen: boolean
    onClose: () => void
    destination: '/shopping' | '/partner-onboarding'
    pathType: 'shopping' | 'platform'
}

export default function AuthDialog({ isOpen, onClose, destination, pathType }: AuthDialogProps) {
    const router = useRouter()
    const { isSignedIn } = useAuth()

    // If already signed in, just redirect
    useEffect(() => {
        if (isOpen && isSignedIn) {
            router.push(destination)
            onClose()
        }
    }, [isOpen, isSignedIn, destination, router, onClose])

    if (!isOpen) return null

    const handleSignUp = () => {
        localStorage.setItem('cove_selected_path', pathType)
        router.push('/sign-up')
        onClose()
    }

    const handleSignIn = () => {
        localStorage.setItem('cove_selected_path', pathType)
        router.push('/sign-in')
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
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close dialog"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {pathType === 'shopping' ? 'Start Shopping' : 'Join Our Platform'}
                    </h2>
                    <p className="text-center text-gray-600">
                        {pathType === 'shopping'
                            ? 'Sign in to unlock personalized recommendations and exclusive deals'
                            : 'Partner with us to grow your brand with AI-powered insights'
                        }
                    </p>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                    {/* Sign Up Button */}
                    <button
                        onClick={handleSignUp}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <span>New user? Sign Up</span>
                        </div>
                    </button>

                    {/* Sign In Button */}
                    <button
                        onClick={handleSignIn}
                        className="w-full bg-white border-2 border-purple-600 text-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span>Already our user? Sign In</span>
                        </div>
                    </button>

                    {/* Skip Button */}
                    <button
                        onClick={handleSkip}
                        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Skip for now</span>
                        </div>
                    </button>
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    {pathType === 'shopping'
                        ? 'You can browse as a guest, but signing in unlocks AI-powered recommendations'
                        : 'Create an account to access our partner dashboard and analytics'
                    }
                </p>
            </div>
        </div>
    )
}
