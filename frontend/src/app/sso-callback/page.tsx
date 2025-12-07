'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SSOCallback() {
    const router = useRouter()

    useEffect(() => {
        // Clerk handles the OAuth callback automatically
        // This page just provides a loading state while redirecting
        const selectedPath = localStorage.getItem('cove_selected_path')

        setTimeout(() => {
            if (selectedPath === 'platform') {
                router.push('/partner-onboarding')
            } else {
                router.push('/')
            }
        }, 1000)
    }, [router])

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
