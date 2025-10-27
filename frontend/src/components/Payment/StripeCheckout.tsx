'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js'
import axios from 'axios'
import PaymentForm from './PaymentForm'
import { useCartStore } from '@/src/store/cartStore'
import { useUser } from '@clerk/nextjs'
import PaymentResultModal from './PaymentResultModal'
import { CartItem } from '@/types/cart'
import { generateInvoicePDF } from '@/utils/generateInvoice'
import InvoicePreviewModal from './InvoicePreviewModal'
import { saveOrder } from '@/src/services/orders'
import type { SaveOrderPayload, ShippingAddress } from '@/types/checkout'
import { getOrCreateGuestId } from '@/utils/guest'
import ShippingForm from '@/src/components/checkout/ShippingForm'

type Props = {
  cardNumber: string
  setCardNumber: (val: string) => void
  expiry: string
  setExpiry: (val: string) => void
  cvc: string
  setCvc: (val: string) => void
  cardName: string
  setCardName: (val: string) => void
  focusedField: 'number' | 'expiry' | 'cvc' | null
  setFocusedField: (val: 'number' | 'expiry' | 'cvc' | null) => void
  tier: 'casual' | 'originals' | 'designer'
  clerkUserId: string | null
  firstName: string
  lastName: string
}

export default function StripeCheckout(props: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [clientSecret, setClientSecret] = useState('')
  const [status, setStatus] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [invoiceCart, setInvoiceCart] = useState<CartItem[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0)
  const [invoiceEmail, setInvoiceEmail] = useState<string | null>(null)

  // Shipping form state
  const [shipping, setShipping] = useState<Partial<ShippingAddress>>({})

  const { user } = useUser()
  const userEmail = useMemo(() => {
    return user?.primaryEmailAddress?.emailAddress ?? null
  }, [user])

  const { items: cartItems, clearCart } = useCartStore()

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [cartItems])

//   useEffect(() => {
//   // simple rules (align with what you saved in the payload)
//   const SHIPPING_FLAT = 5;      // €
//   const TAX_RATE = 0.19;        // 19% VAT

//   const subtotal = totalAmount; // already computed from cart
//   const shipping = SHIPPING_FLAT;
//   const tax = subtotal * TAX_RATE;
//   const grandTotal = subtotal + shipping + tax;

//   axios
//     .post("http://localhost:8000/api/create-payment-intent/", {
//       amount: Math.round(grandTotal * 100), // cents
//       currency: "eur",
//     })
//     .then((res) => setClientSecret(res.data.clientSecret))
//     .catch((err) => {
//       console.error("Failed to create payment intent", err);
//       setStatus("❌ Could not create payment intent.");
//     });
//   // when cart or shipping form changes, refresh the PI
//   // (if you prefer, you can debounce this)
// }, [totalAmount, shipping]);

useEffect(() => {
  // Keep frontend + backend math in sync
  const SHIPPING_FLAT = 5;   // €
  const TAX_RATE = 0.19;     // 19% VAT

  const subtotal = totalAmount;               // from cart
  const shipping = SHIPPING_FLAT;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + shipping + tax; // in EUR (decimal)

  // Identity to attach to the PaymentIntent metadata
  const isLoggedIn = !!props.clerkUserId;
  const guestSessionId = !isLoggedIn ? getOrCreateGuestId() : null;

  axios
    .post("http://localhost:8000/api/payments/create-payment-intent/", {
      // 🚨 Backend now expects EUR as a decimal; it converts to cents
      amount: Number(grandTotal.toFixed(2)),
      currency: "eur",

      // optional metadata (useful for reconciliation)
      order_id: null, // you can pass a temp id if you generate one
      clerk_user_id: isLoggedIn ? props.clerkUserId : null,
      guest_session_id: guestSessionId,
      user_email: userEmail,
    })
    .then((res) => setClientSecret(res.data.clientSecret))
    .catch((err) => {
      console.error("Failed to create payment intent", err);
      setStatus("❌ Could not create payment intent.");
    });

  // Recreate PI when cart or identity changes
  // (No need to include `shipping` const in deps — it's derived here)
}, [totalAmount, userEmail, props.clerkUserId]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardNumberElement)
    if (!cardElement) {
      setStatus('❌ Card element not found.')
      return
    }

    setProcessing(true)

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: { name: props.cardName || 'Test User' },
      },
    })

    if (result.error) {
      setStatus(`❌ ${result.error.message}`)
    } else if (result.paymentIntent?.status === 'succeeded') {
      const cart = cartItems

      // use unified guest id (not a random uuid)
      const isLoggedIn = !!props.clerkUserId
      const guestSessionId = !isLoggedIn ? getOrCreateGuestId() : null

      // 🧾 Save cart and total for modal display before clearing
      setInvoiceCart(cart)
      setInvoiceTotal(totalAmount)
      setInvoiceEmail(userEmail)

      try {
        // 1️⃣ Build payload for backend
        const identity =
          isLoggedIn && props.clerkUserId
            ? { clerk_user_id: props.clerkUserId }
            : { guest_session_id: guestSessionId }

        const payload: SaveOrderPayload = {
          ...identity,
          user_email: userEmail || null,
          first_name: isLoggedIn ? props.firstName : 'Guest',
          last_name: isLoggedIn ? props.lastName : '',
          paymentIntentId: result.paymentIntent.id,
          totalAmount,
          currency: 'EUR',

          // ✅ shipping form values
          shipping_name:
            shipping.shipping_name || (isLoggedIn ? `${props.firstName} ${props.lastName}` : 'Guest'),
          shipping_address_line1: shipping.shipping_address_line1 || '',
          shipping_address_line2: shipping.shipping_address_line2 || '',
          shipping_city: shipping.shipping_city || '',
          shipping_state: shipping.shipping_state || '',
          shipping_postal_code: shipping.shipping_postal_code || '',
          shipping_country: shipping.shipping_country || 'DE',

          // ✅ basic calculation (improve later)
          shipping_cost: 5,
          tax_amount: totalAmount * 0.19,

          cart: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            size: item.size,
            color: item.color,
            colorName: item.colorName,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            type: item.type,
            tier: item.tier,
          })),
        }

        console.log("[checkout] saveOrder payload:", payload);

        // 2️⃣ Save Order to Django (returns { message, order_id })
        const { order_id } = await saveOrder(payload)

        // 3️⃣ Generate invoice PDF (unchanged)
        const pdfBlob = await generateInvoicePDF(cart, totalAmount, userEmail, props.firstName)

        // 4️⃣ Send invoice via email (keep your existing code)
        const formData = new FormData()
        formData.append('invoice', pdfBlob, `invoice_${Date.now()}.pdf`)
        formData.append('email', userEmail || '')
        formData.append('name', props.firstName)
        try {
          await axios.post('http://localhost:8000/api/send-invoice-email/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          console.log('✅ Invoice sent to user email')
        } catch (error) {
          console.error('❌ Failed to send invoice to user email:', error)
        }

        // 5️⃣ Save invoice in backend for download fallback (keep your existing code)
        const saveDownloadForm = new FormData()
        saveDownloadForm.append('invoice', pdfBlob, `invoice_${Date.now()}.pdf`)
        // use the DB order id for consistency
        saveDownloadForm.append('order_id', String(order_id))
        try {
          await axios.post('http://localhost:8000/api/save-invoice-file/', saveDownloadForm, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          console.log('📄 Invoice file saved for backend download.')
        } catch (err) {
          console.error('❌ Failed to save invoice to backend:', err)
        }

        clearCart()
        // store the real DB order id from backend (better than PI)
        setOrderId(String(order_id))
        setPaymentSuccess(true)
        setShowResultModal(true)
      } catch (err) {
        console.error('❌ Order or email save failed', err)
        setPaymentSuccess(true)
        setStatus('✅ Payment succeeded, but backend save/email failed.')
      }
    }

    setProcessing(false)
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white text-black p-6 rounded shadow"
      >
        <ShippingForm
          value={shipping}
          onChange={(patch) => setShipping((prev) => ({ ...prev, ...patch }))}
          disabled={processing}
        />

        <PaymentForm
          onInputChange={(field, value) => {
            switch (field) {
              case 'cardName':
                props.setCardName(value)
                break
              case 'cardNumber':
                props.setCardNumber(value)
                break
              case 'expiry':
                props.setExpiry(value)
                break
              case 'cvc':
                props.setCvc(value)
                break
            }
          }}
          onFocusChange={props.setFocusedField}
          values={{
            cardName: props.cardName,
            cardNumber: props.cardNumber,
            expiry: props.expiry,
            cvc: props.cvc,
          }}
        />

        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800"
        >
          {processing ? 'Processing…' : 'Pay'}
        </button>

        {status && <p className="text-center text-md mt-4">{status}</p>}
      </form>

      {showResultModal && (
        <PaymentResultModal
          success={paymentSuccess}
          onRetryPayment={() => {
            setShowResultModal(false)
            setStatus('')
          }}
          onClose={() => setShowResultModal(false)}
          items={invoiceCart}
          total={invoiceTotal}
          userEmail={invoiceEmail}
          firstName={props.firstName}
        />
      )}

      {showResultModal && orderId && (
        <InvoicePreviewModal
          visible={showResultModal}
          items={invoiceCart}
          total={invoiceTotal}
          userEmail={invoiceEmail}
          firstName={props.firstName}
          orderId={orderId}
          onClose={() => setShowResultModal(false)}
        />
      )}
    </>
  )
}





// 'use client'

// import { useEffect, useState, useMemo } from 'react'
// import {
//   useStripe,
//   useElements,
//   CardNumberElement,
//   CardExpiryElement,
//   CardCvcElement,
// } from '@stripe/react-stripe-js'
// import axios from 'axios'
// import PaymentForm from './PaymentForm'
// import { useCartStore } from '@/src/store/cartStore'
// import { useUser } from '@clerk/nextjs'
// import PaymentResultModal from './PaymentResultModal'
// import { CartItem } from '@/types/cart'
// import { generateInvoicePDF } from '@/utils/generateInvoice'
// import InvoicePreviewModal from './InvoicePreviewModal'
// import { saveOrder } from "@/src/services/orders";
// import type { SaveOrderPayload } from "@/types/checkout";
// import { getOrCreateGuestId } from "@/utils/guest";



// type Props = {
//   cardNumber: string
//   setCardNumber: (val: string) => void
//   expiry: string
//   setExpiry: (val: string) => void
//   cvc: string
//   setCvc: (val: string) => void
//   cardName: string
//   setCardName: (val: string) => void
//   focusedField: 'number' | 'expiry' | 'cvc' | null
//   setFocusedField: (val: 'number' | 'expiry' | 'cvc' | null) => void
//   tier: 'casual' | 'originals' | 'designer'
//   clerkUserId: string | null
//   firstName: string
//   lastName: string
// }

// export default function StripeCheckout(props: Props) {
//   const stripe = useStripe()
//   const elements = useElements()
//   const [clientSecret, setClientSecret] = useState('')
//   const [status, setStatus] = useState('')
//   const [processing, setProcessing] = useState(false)
//   const [showResultModal, setShowResultModal] = useState(false)
//   const [paymentSuccess, setPaymentSuccess] = useState(false)
//   const [orderId, setOrderId] = useState<string | null>(null)


//   const [invoiceCart, setInvoiceCart] = useState<CartItem[]>([])
//   const [invoiceTotal, setInvoiceTotal] = useState<number>(0)
//   const [invoiceEmail, setInvoiceEmail] = useState<string | null>(null)

//   const { user } = useUser()
//   const userEmail = useMemo(() => {
//     return user?.primaryEmailAddress?.emailAddress ?? null
//   }, [user])

//   const { items: cartItems, clearCart } = useCartStore()

//   const totalAmount = useMemo(() => {
//     return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
//   }, [cartItems])

//   useEffect(() => {
//     axios
//       .post('http://localhost:8000/api/create-payment-intent/', {
//         amount: 4999,
//         currency: 'eur',
//       })
//       .then((res) => setClientSecret(res.data.clientSecret))
//   }, [])

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!stripe || !elements) return

//     const cardElement = elements.getElement(CardNumberElement)
//     if (!cardElement) {
//       setStatus('❌ Card element not found.')
//       return
//     }

//     setProcessing(true)

//     const result = await stripe.confirmCardPayment(clientSecret, {
//       payment_method: {
//         card: cardElement,
//         billing_details: { name: props.cardName || 'Test User' },
//       },
//     })

//     if (result.error) {
//       setStatus(`❌ ${result.error.message}`)
//     } else if (result.paymentIntent?.status === 'succeeded') {
//       const cart = cartItems;

// // use unified guest id (not a random uuid)
// const isLoggedIn = !!props.clerkUserId;
// const guestSessionId = !isLoggedIn ? getOrCreateGuestId() : null;

// // 🧾 Save cart and total for modal display before clearing
// setInvoiceCart(cart);
// setInvoiceTotal(totalAmount);
// setInvoiceEmail(userEmail);

// try {
//   // 1️⃣ Build payload for backend
//   const identity =
//     isLoggedIn && props.clerkUserId
//       ? { clerk_user_id: props.clerkUserId }
//       : { guest_session_id: guestSessionId };

//   const payload: SaveOrderPayload = {
//     ...identity,
//     user_email: userEmail || null,
//     first_name: isLoggedIn ? props.firstName : "Guest",
//     last_name: isLoggedIn ? props.lastName : "",
//     paymentIntentId: result.paymentIntent.id,
//     totalAmount,
//     currency: "EUR",

//     // TEMP placeholders until we add the shipping form UI
//     shipping_name: isLoggedIn ? `${props.firstName} ${props.lastName}` : "Guest",
//     shipping_address_line1: "TBD",
//     shipping_address_line2: "",
//     shipping_city: "TBD",
//     shipping_state: "",
//     shipping_postal_code: "00000",
//     shipping_country: "DE",
//     shipping_cost: 0,
//     tax_amount: 0,

//     cart: cart.map((item) => ({
//       productId: item.productId,
//       variantId: item.variantId,
//       size: item.size,
//       color: item.color,
//       colorName: item.colorName,
//       quantity: item.quantity,
//       price: item.price,
//       name: item.name,
//       type: item.type,
//       tier: item.tier,
//     })),
//   };

//   // 2️⃣ Save Order to Django (returns { message, order_id })
//   const { order_id } = await saveOrder(payload);

//   // 3️⃣ Generate invoice PDF (unchanged)
//   const pdfBlob = await generateInvoicePDF(cart, totalAmount, userEmail, props.firstName);

//   // 4️⃣ Send invoice via email (keep your existing code)
//   const formData = new FormData();
//   formData.append("invoice", pdfBlob, `invoice_${Date.now()}.pdf`);
//   formData.append("email", userEmail || "");
//   formData.append("name", props.firstName);
//   try {
//     await axios.post("http://localhost:8000/api/send-invoice-email/", formData, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });
//     console.log("✅ Invoice sent to user email");
//   } catch (error) {
//     console.error("❌ Failed to send invoice to user email:", error);
//   }

//   // 5️⃣ Save invoice in backend for download fallback (keep your existing code)
//   const saveDownloadForm = new FormData();
//   saveDownloadForm.append("invoice", pdfBlob, `invoice_${Date.now()}.pdf`);
//   saveDownloadForm.append("order_id", String(order_id)); // if you prefer DB id, switch to String(order_id)
//   try {
//     await axios.post("http://localhost:8000/api/save-invoice-file/", saveDownloadForm, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });
//     console.log("📄 Invoice file saved for backend download.");
//   } catch (err) {
//     console.error("❌ Failed to save invoice to backend:", err);
//   }

//   clearCart();
//   // store the real DB order id from backend (better than PI)
//   setOrderId(String(order_id));
//   setPaymentSuccess(true);
//   setShowResultModal(true);
// } catch (err) {
//   console.error("❌ Order or email save failed", err);
//   setPaymentSuccess(true);
//   setStatus("✅ Payment succeeded, but backend save/email failed.");
// }

//     }

//     setProcessing(false)
//   }

 

//   return (
//     <>
//       <form
//         onSubmit={handleSubmit}
//         className="space-y-6 bg-white text-black p-6 rounded shadow"
//       >
//         <PaymentForm
//           onInputChange={(field, value) => {
//             switch (field) {
//               case 'cardName':
//                 props.setCardName(value)
//                 break
//               case 'cardNumber':
//                 props.setCardNumber(value)
//                 break
//               case 'expiry':
//                 props.setExpiry(value)
//                 break
//               case 'cvc':
//                 props.setCvc(value)
//                 break
//             }
//           }}
//           onFocusChange={props.setFocusedField}
//           values={{
//             cardName: props.cardName,
//             cardNumber: props.cardNumber,
//             expiry: props.expiry,
//             cvc: props.cvc,
//           }}
//         />

//         <button
//           type="submit"
//           disabled={!stripe || processing}
//           className="w-full bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800"
//         >
//           {processing ? 'Processing…' : 'Pay'}
//         </button>

//         {status && <p className="text-center text-md mt-4">{status}</p>}
//       </form>

//       {showResultModal  && (
//         <PaymentResultModal
//           success={paymentSuccess}
//           onRetryPayment={() => {
//             setShowResultModal(false)
//             setStatus('')
//           }}
//           onClose={() => setShowResultModal(false)}
//           items={invoiceCart}
//           total={invoiceTotal}
//           userEmail={invoiceEmail}
//           firstName={props.firstName}
//         />

        
//       )}

//       {showResultModal && orderId && (
//   <InvoicePreviewModal
//     visible={showResultModal}
//     items={invoiceCart}
//     total={invoiceTotal}
//     userEmail={invoiceEmail}
//     firstName={props.firstName}
//     orderId={orderId}
//     onClose={() => setShowResultModal(false)}
//   />
// )}

//     </>
//   )
// }


