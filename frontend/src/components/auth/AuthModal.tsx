'use client'

import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useSignIn, useSignUp, useAuth } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthModal } from '@/src/context/AuthModalContext'
import OwlCharacterModal from './OwlCharacterModal'
import ValidatedInput from './ValidatedInput'

export default function AuthModal() {
    const { isOpen, mode, redirectUrl, closeAuthModal, switchMode } = useAuthModal()
    const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn()
    const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp()
    const { isSignedIn } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    // Form state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [validationState, setValidationState] = useState<'correct' | 'wrong' | 'idle'>('idle')

    // Track mouse for owl
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Close modal if user becomes signed in
    useEffect(() => {
        if (isSignedIn && isOpen) {
            closeAuthModal()
            // Navigate to redirect URL
            const storedUrl = localStorage.getItem('cove_redirect_url')
            if (storedUrl) {
                localStorage.removeItem('cove_redirect_url')
                router.push(storedUrl)
            }
        }
    }, [isSignedIn, isOpen, closeAuthModal, router])

    // Reset form when modal opens/closes or mode changes
    useEffect(() => {
        if (isOpen) {
            setEmail('')
            setPassword('')
            setFirstName('')
            setLastName('')
            setError('')
            setValidationState('idle')
        }
    }, [isOpen, mode])

    // Get redirect URL for after auth
    const getRedirectUrl = () => {
        return redirectUrl || localStorage.getItem('cove_redirect_url') || pathname || '/'
    }

    // Sign In Handler
    const handleSignIn = async (e: FormEvent) => {
        e.preventDefault()
        if (!signInLoaded) return

        setLoading(true)
        setError('')
        setValidationState('idle')

        try {
            const result = await signIn.create({
                identifier: email,
                password: password,
            })

            if (result.status === 'complete') {
                await setSignInActive({ session: result.createdSessionId })
                setValidationState('correct')

                setTimeout(() => {
                    closeAuthModal()
                    const url = getRedirectUrl()
                    localStorage.removeItem('cove_redirect_url')
                    if (url !== pathname) router.push(url)
                }, 1500)
            }
        } catch (err: any) {
            console.error('Sign in error:', err)
            setValidationState('wrong')
            const errorMessage = err.errors?.[0]?.message || 'Sign in failed. Please try again.'

            if (errorMessage.toLowerCase().includes('not found') ||
                errorMessage.toLowerCase().includes("doesn't exist")) {
                setError('No account found. Try signing up instead.')
            } else if (errorMessage.toLowerCase().includes('oauth') ||
                errorMessage.toLowerCase().includes('google')) {
                setError('This account uses Google/Apple sign-in.')
            } else {
                setError(errorMessage)
            }
        } finally {
            setLoading(false)
        }
    }

    // Sign Up Handler
    const handleSignUp = async (e: FormEvent) => {
        e.preventDefault()
        if (!signUpLoaded) return

        setLoading(true)
        setError('')
        setValidationState('idle')

        try {
            const result = await signUp.create({
                emailAddress: email,
                password: password,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
            })

            if (result.status === 'complete') {
                await setSignUpActive({ session: result.createdSessionId })
                setValidationState('correct')

                setTimeout(() => {
                    closeAuthModal()
                    const url = getRedirectUrl()
                    localStorage.removeItem('cove_redirect_url')
                    if (url !== pathname) router.push(url)
                }, 1500)
            } else {
                // Email verification needed
                setError('Please check your email to verify your account.')
            }
        } catch (err: any) {
            console.error('Sign up error:', err)
            setValidationState('wrong')
            const errorMessage = err.errors?.[0]?.message || 'Sign up failed. Please try again.'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    // OAuth Handlers
    const handleGoogleAuth = async () => {
        const authHandler = mode === 'sign-in' ? signIn : signUp
        if (!authHandler) return

        try {
            const returnUrl = getRedirectUrl()
            localStorage.setItem('cove_redirect_url', returnUrl)
            await authHandler.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: returnUrl,
            })
        } catch (err) {
            console.error('Google auth error:', err)
            setError('Google sign-in failed. Please try again.')
        }
    }

    const handleAppleAuth = async () => {
        const authHandler = mode === 'sign-in' ? signIn : signUp
        if (!authHandler) return

        try {
            const returnUrl = getRedirectUrl()
            localStorage.setItem('cove_redirect_url', returnUrl)
            await authHandler.authenticateWithRedirect({
                strategy: 'oauth_apple',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: returnUrl,
            })
        } catch (err) {
            console.error('Apple auth error:', err)
            setError('Apple sign-in failed. Please try again.')
        }
    }

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            closeAuthModal()
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={handleBackdropClick}
                >
                    {/* Modal Container with Owl */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Owl perched on top */}
                        <div className="absolute left-1/2 -translate-x-1/2 -top-20 z-10">
                            <OwlCharacterModal
                                mousePosition={mousePosition}
                                validationState={validationState}
                            />
                        </div>

                        {/* Modal Content */}
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden pt-16">
                            {/* Close Button */}
                            <button
                                onClick={closeAuthModal}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-black z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="p-8 pt-4">
                                {/* Header */}
                                <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
                                    {mode === 'sign-in' ? 'Welcome Back!' : 'Create Account'}
                                </h1>
                                <p className="text-center text-gray-500 mb-6 text-sm">
                                    {mode === 'sign-in'
                                        ? 'Sign in to continue your journey'
                                        : 'Join COVE to get started'}
                                </p>

                                {/* OAuth Buttons */}
                                <div className="space-y-2 mb-5">
                                    <button
                                        onClick={handleGoogleAuth}
                                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 text-sm"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </button>

                                    <button
                                        onClick={handleAppleAuth}
                                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700 text-sm"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                        </svg>
                                        Continue with Apple
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-3 bg-white text-gray-400">or continue with email</span>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={mode === 'sign-in' ? handleSignIn : handleSignUp} className="space-y-3">
                                    {mode === 'sign-up' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <ValidatedInput
                                                label="First Name"
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="John"
                                            />
                                            <ValidatedInput
                                                label="Last Name"
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Doe"
                                            />
                                        </div>
                                    )}

                                    <ValidatedInput
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            if (e.target.value.length > 3) {
                                                const isValid = e.target.value.includes('@') && e.target.value.includes('.')
                                                setValidationState(isValid ? 'correct' : 'wrong')
                                                setTimeout(() => setValidationState('idle'), 2000)
                                            }
                                        }}
                                        placeholder="your@email.com"
                                        required
                                        isValid={email.includes('@') && email.includes('.')}
                                    />

                                    <ValidatedInput
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            if (e.target.value.length > 0) {
                                                const isValid = e.target.value.length >= 8
                                                setValidationState(isValid ? 'correct' : 'wrong')
                                                setTimeout(() => setValidationState('idle'), 2000)
                                            }
                                        }}
                                        placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Enter your password'}
                                        required
                                        isValid={password.length >= 8}
                                        showToggle
                                    />

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading || !email || !password}
                                        className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                {mode === 'sign-in' ? 'Signing in...' : 'Creating account...'}
                                            </span>
                                        ) : (
                                            mode === 'sign-in' ? 'Sign In' : 'Create Account'
                                        )}
                                    </button>
                                </form>

                                {/* Toggle Mode */}
                                <p className="text-center mt-5 text-sm text-gray-600">
                                    {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
                                    <button
                                        onClick={switchMode}
                                        className="text-black font-semibold hover:underline"
                                    >
                                        {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
