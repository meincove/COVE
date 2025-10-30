export type CartItem = {
  productId: string
  variantId: string
  name: string
  type: string
  tier: string
  size: string
  color: string
  colorName: string
  quantity: number
  price: number
  imageUrl: string
  material: string
}

export type CartState = {
  items: CartItem[]
  userId: string | null
  setUserId: (id: string) => void
  addItem: (item: CartItem) => void
  removeItem: (variantId: string, size: string) => void
  updateItemQuantity: (variantId: string, size: string, quantity: number) => void
  clearCart: () => void
  isInCart: (variantId: string, size: string) => boolean
}
