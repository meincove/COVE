// /types/orders.ts

export type OrderItem = {
  id: number;
  product_id: string;
  variant_id: string;
  size: string;
  color: string;
  quantity: number;
  price: number | string; // per-unit
  user_email?: string | null;
};

export type Order = {
  id: number | string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | string;
  payment_intent_id: string;
  created_at: string;

  // identity
  clerk_user_id?: string | null;
  guest_session_id?: string | null;
  user_email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_guest?: boolean;

  // flags
  inventory_decremented: boolean;
  receipt_emailed: boolean;

  // pricing
  currency?: string;                 // e.g. "EUR"
  total_price: number | string;      // items subtotal from backend
  shipping_cost?: number | string;   // may be 0 or undefined
  tax_amount?: number | string;      // may be 0 or undefined
  total_with_shipping_and_tax?: number | string;

  // shipping address
  shipping_name?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;

  // items
  items: OrderItem[];
};
