'use client'

import { useRouter } from 'next/navigation'

export default function CatalogButton() {
  const router = useRouter()

  return (
    <button
      className="px-6 py-2 border rounded-md bg-gray-800 text-white hover:bg-gray-700 transition cursor-pointer"
      onClick={() => router.push('/catalog')}
    >
      Catalog
    </button>
  )
}
