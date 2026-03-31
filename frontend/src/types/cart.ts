export interface CartItem {
    id?: string; // unique line item id (optional for creation)
    variantId: string;
    productId: string;
    title?: string;
    name?: string;
    price: number;
    image?: string;
    imageUrl?: string; // Enhanced field
    quantity: number;
    size?: string;
    color?: string;
    colorName?: string; // Enhanced field
    slug?: string;
    // Enhanced fields for chat compatibility
    type?: string;
    tier?: string;
    material?: string;
}

export interface Cart {
    id: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    currency: string;
}
