export type AgentItem = {
  title: string;
  url: string;
  slug: string;
  score?: number;
  reason?: string;
  type?: string;
  tier?: string;
  color?: string;
  size?: string;
  variantId?: string;
  price?: number;  // NEW: for real pricing
};

export type AgentCartPayload = {
  variantId: string;
  size: string;
  quantity: number;
  cartId: string | null;
  clerkUserId: string | null;
  guestSessionId: string | null;
  email: string | null;
};

// Week 4: Extended response kinds
export type AgentResponseKind =
  | "answer"
  | "recommendations"
  | "cart_proposal"
  | "checkout_ready"      // NEW - Week 4
  | "order_history"       // NEW - Week 4
  | "email_confirmed";    // NEW - Week 4

// Week 4: Checkout metadata
export type CheckoutData = {
  paymentUrl: string;
  total: number;
  currency: string;
  checkoutId?: string;
};

// Week 4: Order metadata
export type Order = {
  orderId: number;
  status: string;
  total: string;
  currency: string;
  itemCount: number;
  createdAt: string;
  items?: Array<{
    productName: string;
    size: string;
    quantity: number;
    price: string;
  }>;
};

export type OrderHistoryData = {
  orders: Order[];
};

// Week 4: Email confirmation metadata
export type EmailConfirmationData = {
  orderId: number;
  sentTo: string;
  alreadySent?: boolean;
};

export type AgentResponse = {
  kind: AgentResponseKind;
  answer: string;
  items?: AgentItem[];
  citations?: any[];
  cart_payload?: AgentCartPayload;
  checkout?: {  // Week 4
    paymentUrl: string;
    checkoutPageUrl?: string;
    total?: number;
    currency?: string;
    checkoutId?: string;
  };
  thinking_steps?: Array<{  // Week 4: Agentic - visible reasoning
    icon: string;
    status: string;
    detail?: string;
  }>;
  debug_plan?: Record<string, any>;
  orders?: Order[];  // Week 4
  emailConfirmation?: EmailConfirmationData;
};