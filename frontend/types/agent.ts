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
  
  export type AgentResponseKind = "answer" | "recommendations" | "cart_proposal";
  
  export type AgentResponse = {
    kind: AgentResponseKind;
    answer: string;
    citations?: any[];
    items?: AgentItem[];
    cart_payload?: AgentCartPayload;
    debug_plan?: any;
  };
  