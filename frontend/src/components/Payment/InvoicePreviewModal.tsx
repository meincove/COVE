'use client'

import { CartItem } from '@/types/cart'
import Image from 'next/image'
import { generateInvoicePDF } from '@/utils/generateInvoice'

type Props = {
  items: CartItem[]
  total: number
  userEmail: string | null
  firstName: string
  onClose: () => void
  orderId: string
  visible: boolean
}

export default function InvoicePreviewModal({ items, total, userEmail, onClose, firstName, orderId, visible }: Props) {
  const handleDownload = async (attempt = 1) => {
  try {
    const res = await fetch(`http://localhost:8000/api/download-invoice/?order_id=${orderId}`)
    if (!res.ok) throw new Error('Not ready')
    window.open(`http://localhost:8000/api/download-invoice/?order_id=${orderId}`, '_blank')
  } catch (err) {
    if (attempt < 3) {
      setTimeout(() => handleDownload(attempt + 1), 1500)
    } else {
      alert('⚠️ Invoice not ready yet. Please try again in a few seconds.')
    }
  }
}

  console.log('🧾 Invoice Items Sent to PDF:', items)
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center">
      <div className="bg-white text-black rounded-xl p-6 w-full max-w-3xl relative overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-4">🧾 Invoice Preview</h2>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-4 border-b pb-3">
              <Image
                src={item.imageUrl}
                alt={item.name}
                width={80}
                height={80}
                className="rounded"
              />
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-700">
                  Type: {item.type} | Tier: {item.tier}
                </p>
                <p className="text-sm text-gray-600">
                  Size: {item.size} | Color: {item.colorName}
                </p>
                <p className="text-sm">Qty: {item.quantity} | € {(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-lg font-bold">
          Total: € {total.toFixed(2)}
        </div>
        


        {/* Actions */}
        <div className="flex justify-end mt-6 gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-400 rounded hover:bg-gray-100"
          >
            ❌ Close
          </button>
          
          {/* <button
  onClick={() => {
    if (!orderId) {
      console.error("Missing order ID for invoice download.")
      return
    }
    window.open(`http://localhost:8000/api/download-invoice/?order_id=${orderId}`, '_blank')
  }}
  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
>
  📥 Download PDF
</button> */}

<button onClick={() => handleDownload()}>
  📥 Download PDF
</button>



        </div>
      </div>
    </div>
  )
}
