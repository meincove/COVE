export interface SuggestedAction {
    id: string;
    text: string;
    query: string;
    type: "action" | "question" | "navigation" | "discovery" | "account";
    icon?: string;
    priority: number;
    label?: string; // Legacy support
    action?: string; // Legacy support
}

export interface AgentItem {
    id: string;
    title: string;
    price: number;
    image?: string;
    imageUrl?: string; // Handle legacy naming
    slug?: string;
    description?: string;
    category?: string;
    // Enhanced fields
    type?: string;
    tier?: string;
    color?: string;
}

export interface AgentCartPayload {
    variantId: string;
    size: string;
    quantity: number;
    cartId?: string;
    clerkUserId?: string | null;
    email?: string | null;
}

export interface ThinkingEvent {
    step: string;
    details?: string;
    status?: 'pending' | 'active' | 'success' | 'check' | 'failed';
    icon?: string;
}

export interface CheckoutData {
    paymentUrl: string;
    checkoutPageUrl?: string;
    total?: number;
    currency?: string;
    answer?: string; // Sometimes the answer is embedded
}

export interface EmailConfirmationData {
    orderId: number | string;
    sentTo: string;
}

export interface AgentResponse {
    kind: string; // 'answer' | 'cart_proposal' | 'recommendations' | 'checkout_ready' | etc.
    answer?: string;

    // Cart Proposal
    cart_payload?: AgentCartPayload;

    // Recommendations
    items?: AgentItem[];
    suggested_actions?: SuggestedAction[];

    // Week 4/Process tracking
    thinking_events?: ThinkingEvent[];
    thinking_steps?: Array<{ icon: string; status: string; detail?: string }>;
    tools_used?: string[];

    // Checkout
    checkout?: CheckoutData;

    // Email
    emailConfirmation?: EmailConfirmationData;

    // Legacy/Direct Checkout props (merging typings)
    paymentUrl?: string;
    checkoutPageUrl?: string;
    total?: number;
    currency?: string;

    // Orders
    orders?: Order[];
}

export interface Order {
    id: string; // mapped from orderId
    orderId?: string; // Direct property
    number?: string;
    date: string;
    createdAt?: string; // Alias for date
    total: number;
    currency?: string;
    status: string;
    itemCount?: number;
    items: Array<{ title: string; quantity: number; price: number; image?: string }>;
}
