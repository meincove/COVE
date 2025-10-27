'use client'

import { useState } from 'react'
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement
} from '@stripe/react-stripe-js'
import {
  StripeCardNumberElementChangeEvent,
  StripeCardExpiryElementChangeEvent,
  StripeCardCvcElementChangeEvent
} from '@stripe/stripe-js'

type Props = {
  onInputChange: (field: string, value: string) => void
  onFocusChange: (field: 'number' | 'expiry' | 'cvc' | null) => void
  values: {
    cardName: string
    cardNumber: string
    expiry: string
    cvc: string
  }
}

export default function PaymentForm({
  onInputChange,
  onFocusChange,
  values
}: Props) {
  const [nameError, setNameError] = useState('')

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length > 20) {
      setNameError('Maximum character limit reached')
    } else {
      setNameError('')
      onInputChange('cardName', val)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cardholder Name
        </label>
        <input
          type="text"
          value={values.cardName}
          onChange={handleNameChange}
          className="mt-1 w-full p-3 border rounded-md"
          placeholder="Your Name"
        />
        {nameError && (
          <p className="text-red-500 text-sm mt-1">{nameError}</p>
        )}
      </div>

      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Card Number
        </label>
        <CardNumberElement
          className="p-3 border rounded-md"
          onChange={(e: StripeCardNumberElementChangeEvent) => {
            if (e.complete) {
              onInputChange('cardNumber', '•••• •••• •••• ••••') // masked display
            } else {
              onInputChange('cardNumber', 'XXXX XXXX XXXX XXXX')
            }
          }}
          onFocus={() => onFocusChange('number')}
          onBlur={() => onFocusChange(null)}
        />
      </div>

      {/* Expiry */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Expiry
        </label>
        <CardExpiryElement
          className="p-3 border rounded-md"
          onChange={(e: StripeCardExpiryElementChangeEvent) => {
            if (e.complete) {
              onInputChange('expiry', 'MM/YY') // fake display value
            } else {
              onInputChange('expiry', 'MM/YY')
            }
          }}
          onFocus={() => onFocusChange('expiry')}
          onBlur={() => onFocusChange(null)}
        />
      </div>

      {/* CVC */}
      <div>
        <label className="block text-sm font-medium text-gray-700">CVC</label>
        <CardCvcElement
          className="p-3 border rounded-md"
          onChange={(e: StripeCardCvcElementChangeEvent) => {
            if (e.complete) {
              onInputChange('cvc', '•••')
            } else {
              onInputChange('cvc', 'XXX')
            }
          }}
          onFocus={() => onFocusChange('cvc')}
          onBlur={() => onFocusChange(null)}
        />
      </div>
    </div>
  )
}
