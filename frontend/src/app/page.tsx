'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TesterPage from "@/src/components/TestingLanding/TesterPage";

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('cove_has_visited')

    if (!hasVisited) {
      // First-time visitor - redirect to choose-path
      localStorage.setItem('cove_has_visited', 'true')
      router.push('/choose-path')
    }
    // If they've visited before, show TesterPage (they're here to shop)
  }, [router])

  // Show TesterPage for returning visitors or those who selected shop
  return <TesterPage />;
}

