'use client'

import { useState } from 'react'
import StripeProvider from '@/providers/StripeProvider'
import StripeCheckout from '@/components/Payment/StripeCheckout'
import ThreeDCard from '@/components/Payment/ThreeDCard'
import { useUser } from '@clerk/nextjs'

import { useRouter } from 'next/navigation'

export default function PaymentPage() {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [focusedField, setFocusedField] = useState<'number' | 'expiry' | 'cvc' | null>(null)
  const [tier, setTier] = useState<'casual' | 'originals' | 'designer'>('originals')

  const { user, isSignedIn } = useUser()

  const clerkUserId = user?.id || null
  const firstName = user?.firstName || 'Guest'
  const lastName = user?.lastName || ''

  const router = useRouter()


  return (
    <StripeProvider>
      <div className="flex flex-col md:flex-row lg:flex-row min-h-screen bg-zinc-950 text-white">
        <button
          onClick={() => router.back()}
          className="mb-4 mx-4 mt-4 sm:mx-6 md:mx-8 text-sm sm:text-base text-gray-400 hover:text-white hover:underline transition-colors"
        >
          ← Back
        </button>
        {/* LEFT: Stripe Form */}
        <div className="md:w-1/2 lg:w-1/2 xl:w-2/5 p-4 sm:p-5 md:p-6 lg:p-8">
          <StripeCheckout
            cardName={cardName}
            setCardName={setCardName}
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            expiry={expiry}
            setExpiry={setExpiry}
            cvc={cvc}
            setCvc={setCvc}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
            tier={tier}

            clerkUserId={clerkUserId}
            firstName={firstName}
            lastName={lastName}
          />
        </div>

        {/* RIGHT: 3D Card */}
        <div className="md:w-1/2 lg:w-1/2 xl:w-3/5 min-h-[400px] sm:min-h-[500px] md:h-auto">
          <ThreeDCard
            cardNumber={cardNumber}
            expiry={expiry}
            cvc={cvc}
            cardName={cardName}
            focusedField={focusedField}
            tier={tier}
          />
        </div>
      </div>
    </StripeProvider>
  )
}
