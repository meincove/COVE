'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user has a saved preference
    const savedPath = localStorage.getItem('cove_selected_path')
    const timestamp = localStorage.getItem('cove_path_timestamp')

    // Check if preference is still valid (within 30 days)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
    const isValid = timestamp && (Date.now() - parseInt(timestamp)) < thirtyDaysInMs

    if (savedPath && isValid) {
      // Returning user - redirect to last selected path
      if (savedPath === 'shop') {
        router.push('/catalog') // Using current catalog route for now
      } else if (savedPath === 'platform') {
        router.push('/partner-onboarding')
      }
    } else {
      // First-time visitor - go to choose-path
      router.push('/choose-path')
    }
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-900 mb-4"></div>
        <p className="text-slate-600 font-medium">Loading COVE...</p>
      </div>
    </div>
  )
}

