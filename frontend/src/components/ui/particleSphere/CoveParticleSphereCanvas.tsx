'use client'

import dynamic from 'next/dynamic'

// Dynamically load the sphere only on client side to prevent hydration issues
const CoveParticleSphere = dynamic(() => import('./CoveParticleSphere'), {
  ssr: false,
  loading: () => <div className="text-white text-center mt-10">Loading...</div>
})

export default CoveParticleSphere
