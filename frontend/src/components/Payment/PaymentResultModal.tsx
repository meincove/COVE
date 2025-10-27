'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CartItem } from '@/types/cart'
import InvoicePreviewModal from './InvoicePreviewModal'

type Props = {
  success: boolean
  onRetryPayment?: () => void
  onClose: () => void
  items: CartItem[]
  total: number
  userEmail: string | null
   firstName: string
}

export default function PaymentResultModal({
  success,
  onRetryPayment,
  onClose,
  items,
  total,
  userEmail,
  firstName
}: Props) {
  const router = useRouter()
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-6">
          <h2 className="text-xl font-bold">
            {success ? '🎉 Payment Successful' : '⚠️ Payment Failed'}
          </h2>

          {success ? (
            <div className="space-y-4">
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-full py-3 bg-black text-white rounded-full"
              >
                📄 Download Invoice
              </button>
              <button
                onClick={() => router.push('/catalog')}
                className="w-full py-3 border border-black text-black rounded-full"
              >
                🛍 Show More Products
              </button>
              <button
                onClick={() => {
                  router.back()
                  onClose()
                }}
                className="w-full py-2 text-sm text-gray-600 hover:underline"
              >
                ← Back
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={onRetryPayment}
                className="w-full py-3 bg-black text-white rounded-full"
              >
                🔁 Retry Payment
              </button>
              <button
                onClick={() => {
                  router.back()
                  onClose()
                }}
                className="w-full py-2 text-sm text-gray-600 hover:underline"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>

      {showInvoiceModal && (
        <InvoicePreviewModal
          items={items}
          total={total}
          userEmail={userEmail}
          firstName={firstName}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </>
  )
}
