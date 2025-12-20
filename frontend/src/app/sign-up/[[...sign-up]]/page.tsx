'use client'

import { useSignUp, useAuth } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import OwlCharacter from '@/src/components/auth/OwlCharacter'
import ValidatedInput from '@/src/components/auth/ValidatedInput'
import PasswordStrength from '@/src/components/auth/PasswordStrength'

export default function CustomSignUpPage() {
    const { signUp, setActive, isLoaded } = useSignUp()
    const { isSignedIn } = useAuth()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [validationState, setValidationState] = useState<'correct' | 'wrong' | 'idle'>('idle')
    const router = useRouter()

    // ✅ Redirect if already signed in
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            const selectedPath = localStorage.getItem('cove_selected_path')
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/shop')
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

    // Calculate password strength
    const getPasswordStrength = (pwd: string): number => {
        let strength = 0
        if (pwd.length >= 8) strength += 25
        if (pwd.length >= 12) strength += 25
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25
        if (/[0-9]/.test(pwd)) strength += 15
        if (/[^a-zA-Z0-9]/.test(pwd)) strength += 10
        return Math.min(strength, 100)
    }

    // Email/Password Sign Up
    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError('')

        try {
            await signUp.create({
                firstName,
                lastName,
                emailAddress: email,
                password,
            })

            // Send verification email
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
            setVerifying(true)
        } catch (err: any) {
            setError(err.errors?.[0]?.message || 'Sign up failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Verify Email Code
    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError('')

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            })

            if (completeSignUp.status === 'complete') {
                await setActive({ session: completeSignUp.createdSessionId })

                // Sync to backend
                const selectedPath = localStorage.getItem('cove_selected_path') || 'shop'
                try {
                    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/sync-user/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await completeSignUp.createdSessionId}`
                        },
                    })
                } catch (syncErr) {
                    console.error('Backend sync failed:', syncErr)
                }

                // Redirect based on selected path
                if (selectedPath === 'platform') {
                    router.push('/partner-onboarding')
                } else {
                    router.push('/shop')
                }
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || 'Verification failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Google OAuth
    const handleGoogleSignUp = async () => {
        if (!isLoaded) return

        // ✅ Check if already signed in
        if (isSignedIn) {
            const selectedPath = localStorage.getItem('cove_selected_path')
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/shop')
            }
            return
        }

        try {
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/'
            })
        } catch (err) {
            console.error('OAuth error:', err)
            setError('Google sign-up failed. Please try again.')
        }
    }

    // Apple OAuth
    const handleAppleSignUp = async () => {
        if (!isLoaded) return

        // ✅ Check if already signed in
        if (isSignedIn) {
            const selectedPath = localStorage.getItem('cove_selected_path')
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/shop')
            }
            return
        }

        try {
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_apple',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/'
            })
        } catch (err) {
            console.error('OAuth error:', err)
            setError('Apple sign-up failed. Please try again.')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl flex gap-8 items-center">
                {/* Owl Character - Left Side */}
                <div className="hidden lg:flex lg:w-1/3 items-center justify-center">
                    <OwlCharacter
                        mousePosition={mousePosition}
                        validationState={validationState}
                    />
                </div>

                {/* Sign Up Form - Right Side */}
                <div className="w-full lg:w-2/3 bg-white rounded-3xl shadow-2xl p-8">
                    {!verifying ? (
                        <>
                            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                                Join COVE
                            </h1>
                            <p className="text-center text-gray-600 mb-6">
                                Create your account to get started
                            </p>

                            {/* OAuth Buttons */}
                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={handleGoogleSignUp}
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
                                    onClick={handleAppleSignUp}
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
                                    <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                                </div>
                            </div>

                            {/* Sign Up Form */}
                            <form onSubmit={handleEmailSignUp} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <ValidatedInput
                                        label="First Name"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="John"
                                        required
                                        isValid={firstName.length >= 2}
                                    />
                                    <ValidatedInput
                                        label="Last Name"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Doe"
                                        required
                                        isValid={lastName.length >= 2}
                                    />
                                </div>

                                <ValidatedInput
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    isValid={email.includes('@') && email.includes('.')}
                                />

                                <div>
                                    <ValidatedInput
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a strong password"
                                        required
                                        isValid={password.length >= 8}
                                        showToggle
                                    />
                                    {password && (
                                        <PasswordStrength strength={getPasswordStrength(password)} />
                                    )}
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-shake">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !firstName || !lastName || !email || !password || getPasswordStrength(password) < 50}
                                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </button>
                            </form>

                            <p className="text-center mt-6 text-sm text-gray-600">
                                Already have an account?{' '}
                                <a href="/sign-in" className="text-purple-600 font-semibold hover:text-purple-700">
                                    Sign in
                                </a>
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                                Verify Your Email
                            </h1>
                            <p className="text-center text-gray-600 mb-6">
                                We sent a code to <strong>{email}</strong>
                            </p>

                            <form onSubmit={handleVerifyEmail} className="space-y-4">
                                <ValidatedInput
                                    label="Verification Code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    required
                                    isValid={code.length === 6}
                                />

                                {error && (
                                    <div className="bg-red-50 border-2 border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-shake">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || code.length !== 6}
                                    className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Verifying...' : 'Verify Email'}
                                </button>
                            </form>

                            <button
                                onClick={() => setVerifying(false)}
                                className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800"
                            >
                                ← Back to sign up
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
