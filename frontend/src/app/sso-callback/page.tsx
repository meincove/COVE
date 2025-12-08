'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function SSOCallback() {
    const router = useRouter()
    const { isLoaded, isSignedIn, user } = useUser()

    useEffect(() => {
        // Wait for Clerk to load
        if (!isLoaded) return

        // If user is signed in, redirect
        if (isSignedIn && user) {
            const selectedPath = localStorage.getItem('cove_selected_path')

            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/')
            }
        } else {
            // If not signed in after loading, redirect to sign-in
            router.push('/sign-in')
        }
    }, [isLoaded, isSignedIn, user, router])

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-800">Completing sign in...</h2>
                <p className="text-gray-600 mt-2">Please wait while we redirect you</p>
            </div>
        </div>
    )
}
