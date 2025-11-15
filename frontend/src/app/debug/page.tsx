// cove-frontend/src/app/debug/page.tsx
'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

export default function DebugToken() {
  const { getToken } = useAuth()

  useEffect(() => {
    getToken().then((token) => {
      console.log('JWT:', token)
    })
  }, [])

  return <div className="text-center mt-10 text-xl">✅ Check console for your JWT token.</div>
}
