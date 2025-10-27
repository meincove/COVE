// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'

// export type CartItem = {
//   productId: string
//   variantId: string
//   name: string
//   type: string
//   tier: string
//   size: string
//   color: string
//   colorName: string
//   quantity: number
//   price: number
//   imageUrl: string
// }

// type CartState = {
//   items: CartItem[]
//   addItem: (item: CartItem) => void
//   removeItem: (variantId: string, size: string) => void
//   updateItemQuantity: (variantId: string, size: string, quantity: number) => void
//   clearCart: () => void
//   isInCart: (variantId: string, size: string) => boolean
// }

// const storageKey = 'guest_cart'

// export const useCartStore = create<CartState>()(
//   persist(
//     (set, get) => ({
//       items: [],

//       addItem: (item) => {
//         const existingIndex = get().items.findIndex(
//           (i) => i.variantId === item.variantId && i.size === item.size
//         )

//         let updatedItems: CartItem[]

//         if (existingIndex !== -1) {
//           updatedItems = [...get().items]
//           updatedItems[existingIndex].quantity += item.quantity
//         } else {
//           updatedItems = [...get().items, item]
//         }

//         set({ items: updatedItems })
//       },

//       removeItem: (variantId, size) => {
//         const updatedItems = get().items.filter(
//           (i) => !(i.variantId === variantId && i.size === size)
//         )
//         set({ items: updatedItems })
//       },

//       updateItemQuantity: (variantId, size, quantity) => {
//         const updatedItems = get().items.map((i) =>
//           i.variantId === variantId && i.size === size
//             ? { ...i, quantity }
//             : i
//         )
//         set({ items: updatedItems })
//       },

//       clearCart: () => {
//         set({ items: [] })
//       },

//       isInCart: (variantId, size) =>
//         !!get().items.find((i) => i.variantId === variantId && i.size === size),
//     }),
//     {
//       name: storageKey,
//       storage: {
//         getItem: (name) => {
//           if (typeof window === 'undefined') return null
//           const value = sessionStorage.getItem(name)
//           return value ? JSON.parse(value) : null
//         },
//         setItem: (name, value) => {
//           if (typeof window !== 'undefined') {
//             sessionStorage.setItem(name, JSON.stringify(value))
//           }
//         },
//         removeItem: (name) => {
//           if (typeof window !== 'undefined') {
//             sessionStorage.removeItem(name)
//           }
//         },
//       },
//     }
//   )
// )


import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, CartState } from '@/types/cart' 

const storageKey = 'guest_cart'

// 🧠 Runtime variable (not persisted) to track logged-in user
let currentUserId: string | null = null



export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      userId: null,

      // ✅ Called in _app or page to inject Clerk user ID
      setUserId: async (id) => {
  currentUserId = id
  set({ userId: id })

  if (!id) return

  // 1. Load guest cart from sessionStorage
  const guestCartRaw = sessionStorage.getItem(storageKey)
  const guestCart: CartItem[] = guestCartRaw ? JSON.parse(guestCartRaw).state?.items || [] : []

  // 2. Fetch backend cart
  const backendRes = await fetch(`/api/cart/${id}`)
  const backendData = await backendRes.json()
  const backendCart: CartItem[] = backendData?.items || []

  // 3. Merge both
  const mergedMap = new Map<string, CartItem>()
  const makeKey = (item: CartItem) => `${item.variantId}-${item.size}`

  for (const item of [...backendCart, ...guestCart]) {
    const key = makeKey(item)
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!
      mergedMap.set(key, { ...existing, quantity: existing.quantity + item.quantity })
    } else {
      mergedMap.set(key, item)
    }
  }

  const mergedItems = Array.from(mergedMap.values())

  // 4. Set merged cart in Zustand
  set({ items: mergedItems })

  // 5. Sync merged cart to backend
  await fetch('/api/cart/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clerkUserId: id,
      items: mergedItems,
    }),
  })

  // 6. Clear guest cart from sessionStorage
  sessionStorage.removeItem(storageKey)
},

      addItem: async (item) => {
        const existingIndex = get().items.findIndex(
          (i) => i.variantId === item.variantId && i.size === item.size
        )

        let updatedItems: CartItem[]

        if (existingIndex !== -1) {
          updatedItems = [...get().items]
          updatedItems[existingIndex].quantity += item.quantity
        } else {
          updatedItems = [...get().items, item]
        }

        set({ items: updatedItems })

        // 🗃️ Sync to backend if user is logged in
        if (currentUserId) {
          await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkUserId: currentUserId,
              items: updatedItems,
            }),
          })
        }
      },

      removeItem: async (variantId, size) => {
        const updatedItems = get().items.filter(
          (i) => !(i.variantId === variantId && i.size === size)
        )
        set({ items: updatedItems })

        if (currentUserId) {
          await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkUserId: currentUserId,
              items: updatedItems,
            }),
          })
        }
      },

      updateItemQuantity: async (variantId, size, quantity) => {
        const updatedItems = get().items.map((i) =>
          i.variantId === variantId && i.size === size
            ? { ...i, quantity }
            : i
        )
        set({ items: updatedItems })

        if (currentUserId) {
          await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkUserId: currentUserId,
              items: updatedItems,
            }),
          })
        }
      },

      clearCart: async () => {
        set({ items: [] })

        if (currentUserId) {
          await fetch(`/api/cart/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clerkUserId: currentUserId }),
          })
        }
      },

      isInCart: (variantId, size) =>
        !!get().items.find((i) => i.variantId === variantId && i.size === size),
    }),
    {
      name: storageKey,
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          if (currentUserId) return null // 🔁 Skip localStorage for logged-in users
          const value = sessionStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: (name, value) => {
          if (typeof window !== 'undefined' && !currentUserId) {
            sessionStorage.setItem(name, JSON.stringify(value))
          }
        },
        removeItem: (name) => {
          if (typeof window !== 'undefined' && !currentUserId) {
            sessionStorage.removeItem(name)
          }
        },
      },
    }
  )
)
