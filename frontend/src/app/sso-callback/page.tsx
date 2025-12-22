'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function SSOCallback() {
    const router = useRouter()
    const { isLoaded, isSignedIn } = useAuth()
    const [redirecting, setRedirecting] = useState(false)

    useEffect(() => {
        // Wait for Clerk to fully load
        if (!isLoaded) return

        // Once loaded, handle redirect
        const handleRedirect = async () => {
            if (redirecting) return
            setRedirecting(true)

            // Give Clerk a moment to complete sign-in
            await new Promise(resolve => setTimeout(resolve, 500))

            const selectedPath = localStorage.getItem('cove_selected_path')

            // Clean up
            localStorage.removeItem('cove_selected_path')

            // Redirect based on path or sign-in status
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                // Redirect to shop with refresh to ensure auth state is updated
                router.push('/shop')
                router.refresh()
            }
        }

        handleRedirect()
    }, [isLoaded, isSignedIn, router, redirecting])

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-neutral-900 to-black flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
                <h2 className="text-2xl font-bold text-white">Completing sign in...</h2>
                <p className="text-neutral-400 mt-2">
                    {isLoaded
                        ? (isSignedIn ? 'Welcome back! Redirecting...' : 'Setting up your session...')
                        : 'Please wait...'
                    }
                </p>
            </div>
        </div>
    )
}
