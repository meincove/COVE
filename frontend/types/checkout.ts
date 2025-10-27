// src/types/checkout.ts

export type ShippingAddress = {
  shipping_name: string;               // "First Last"
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_state?: string;
  shipping_postal_code: string;
  shipping_country: string;            // ISO-2, e.g. "DE", "US"
};

export type SaveOrderCartItem = {
  productId: string;
  variantId: string;
  size: string;
  color: string;
  colorName?: string;
  quantity: number;
  price: number;        // per-unit
  name?: string;
  type?: string;
  tier?: string;
};

export type SaveOrderPayload = {
  // identity (one of these is present)
  clerk_user_id?: string | null;
  guest_session_id?: string | null;

  // user meta
  user_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;

  // payment
  paymentIntentId: string;
  totalAmount: number;       // items subtotal (pre shipping/tax) — or your existing meaning
  currency?: string;         // defaults to "EUR" on backend

  // shipping & taxes
  shipping_cost?: number;    // e.g., 4.99
  tax_amount?: number;       // e.g., 2.39
  // spread the ShippingAddress fields here when sending
} & ShippingAddress & {
  cart: SaveOrderCartItem[];
};
