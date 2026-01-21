'use client'

import { useSignIn, useAuth } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import OwlCharacter from '@/src/components/auth/OwlCharacter'
import ValidatedInput from '@/src/components/auth/ValidatedInput'

export default function CustomSignInPage() {
    const { signIn, setActive, isLoaded } = useSignIn()
    const { isSignedIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [validationState, setValidationState] = useState<'correct' | 'wrong' | 'idle'>('idle')
    const router = useRouter()

    // ✅ Redirect if already signed in
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            // 1. Check for specific return URL (from Chatbot/Deep Link)
            const returnUrl = localStorage.getItem('cove_redirect_url')
            if (returnUrl) {
                localStorage.removeItem('cove_redirect_url') // Clear after use
                router.push(returnUrl)
                return
            }

            // 2. Fallback to general path selection
            const selectedPath = localStorage.getItem('cove_selected_path')
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/shopping')
            }
        }
    }, [isLoaded, isSignedIn, router])

    // Track mouse for owl
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // Email/Password Sign In
    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError('')
        setValidationState('idle')

        try {
            const result = await signIn.create({
                identifier: email,
                password: password,
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })

                // Trigger success animation
                setValidationState('correct')

                // Smart redirect based on selected path
                setTimeout(() => {
                    // 1. Check for specific return URL
                    const returnUrl = localStorage.getItem('cove_redirect_url')
                    if (returnUrl) {
                        localStorage.removeItem('cove_redirect_url')
                        router.push(returnUrl)
                        return
                    }

                    // 2. Fallback to general path selection
                    const selectedPath = localStorage.getItem('cove_selected_path')
                    if (selectedPath === 'platform') {
                        router.push('/partner-onboarding')
                    } else {
                        router.push('/shopping')
                    }
                }, 2000)
            }
        } catch (err: any) {
            console.error('Sign in error:', err)
            const errorMessage = err.errors?.[0]?.message || ''

            // Trigger error animation
            setValidationState('wrong')

            // Check if it's a "user not found" error
            if (errorMessage.toLowerCase().includes('not found') ||
                errorMessage.toLowerCase().includes('doesn\'t exist') ||
                errorMessage.toLowerCase().includes('no account')) {
                setError('new_user')
            } else if (errorMessage.toLowerCase().includes('verification strategy') ||
                errorMessage.toLowerCase().includes('oauth') ||
                errorMessage.toLowerCase().includes('google') ||
                errorMessage.toLowerCase().includes('apple')) {
                // User signed up with OAuth but trying to use password
                setError('oauth_user')
            } else {
                setError(errorMessage || 'Sign in failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    // Google OAuth
    const handleGoogleSignIn = async () => {
        if (!isLoaded) return

        // ✅ Check if already signed in
        if (isSignedIn) {
            // 1. Check for specific return URL
            const returnUrl = localStorage.getItem('cove_redirect_url')
            if (returnUrl) {
                localStorage.removeItem('cove_redirect_url')
                router.push(returnUrl)
                return
            }

            const selectedPath = localStorage.getItem('cove_selected_path')
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/shopping')
            }
            return
        }

        try {
            const returnUrl = localStorage.getItem('cove_redirect_url') || '/'
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: returnUrl
            })
        } catch (err) {
            console.error('OAuth error:', err)
            setError('Google sign-in failed. Please try again.')
        }
    }

    // Apple OAuth
    const handleAppleSignIn = async () => {
        if (!isLoaded) return

        // ✅ Check if already signed in
        if (isSignedIn) {
            // 1. Check for specific return URL
            const returnUrl = localStorage.getItem('cove_redirect_url')
            if (returnUrl) {
                localStorage.removeItem('cove_redirect_url')
                router.push(returnUrl)
                return
            }

            const selectedPath = localStorage.getItem('cove_selected_path')
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/shopping')
            }
            return
        }

        try {
            const returnUrl = localStorage.getItem('cove_redirect_url') || '/'
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_apple',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: returnUrl
            })
        } catch (err) {
            console.error('OAuth error:', err)
            setError('Apple sign-in failed. Please try again.')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl flex gap-8 items-center">
                {/* Owl Character - Left Side */}
                <div className="hidden lg:flex lg:w-1/3 items-center justify-center">
                    <OwlCharacter
                        mousePosition={mousePosition}
                        validationState={validationState}
                    />
                </div>

                {/* Sign In Form - Right Side */}
                <div className="w-full lg:w-2/3 bg-white rounded-3xl shadow-2xl p-8">
                    <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Welcome Back!
                    </h1>
                    <p className="text-center text-gray-600 mb-6">
                        Sign in to continue your journey
                    </p>

                    {/* OAuth Buttons */}
                    <div className="space-y-3 mb-6">
                        <button
                            onClick={handleGoogleSignIn}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-800"
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
                            onClick={handleAppleSignIn}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-800"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            Continue with Apple
                        </button>
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailSignIn} className="space-y-4">
                        <ValidatedInput
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                // Trigger validation after user types
                                const isValid = e.target.value.includes('@') && e.target.value.includes('.')
                                if (e.target.value.length > 3) {
                                    setValidationState(isValid ? 'correct' : 'wrong')
                                    // Reset after 3 seconds
                                    setTimeout(() => setValidationState('idle'), 3000)
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
                                // Trigger validation after user types
                                const isValid = e.target.value.length >= 8
                                if (e.target.value.length > 0) {
                                    setValidationState(isValid ? 'correct' : 'wrong')
                                    // Reset after 3 seconds
                                    setTimeout(() => setValidationState('idle'), 3000)
                                }
                            }}
                            placeholder="Enter your password"
                            required
                            isValid={password.length >= 8}
                            showToggle
                        />

                        {error && (
                            error === 'new_user' ? (
                                <div className="bg-blue-50 border-2 border-blue-200 px-4 py-4 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-blue-900 mb-1">
                                                New user? You need to sign up first!
                                            </p>
                                            <p className="text-sm text-blue-700 mb-3">
                                                We couldn't find an account with this email. Please create an account to continue.
                                            </p>
                                            <a
                                                href="/sign-up"
                                                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                                            >
                                                Create an account
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ) : error === 'oauth_user' ? (
                                <div className="bg-amber-50 border-2 border-amber-200 px-4 py-4 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-amber-900 mb-1">
                                                You signed up with Google or Apple
                                            </p>
                                            <p className="text-sm text-amber-700 mb-3">
                                                This account was created using social login. Please use the Google or Apple button above to sign in.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-shake">
                                    {error}
                                </div>
                            )
                        )}


                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="#" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                            Forgot password?
                        </a>
                    </div>

                    <p className="text-center mt-6 text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a href="/sign-up" className="text-purple-600 font-semibold hover:text-purple-700">
                            Sign up
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
