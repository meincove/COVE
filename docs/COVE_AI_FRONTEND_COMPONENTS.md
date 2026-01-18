# COVE AI Frontend Component Documentation

> **For Developers**: Complete guide to understanding and modifying the Cove AI chatbot UI.

---

## 🏗 Architecture Overview

```
FloatingChatbot (Entry Point)
    ├── CoveChatWidget (Main Chat Logic)
    │   ├── PersonalizedGreeting
    │   ├── ChatProductCard (in ProductCarousel)
    │   ├── ThinkingSteps / EnhancedThinking
    │   ├── SuggestedQueries
    │   └── OutfitModal
    │
    └── OutfitCanvas (Drag-drop outfit panel)
        └── AgenticOutfitBuilder

Hooks:
    ├── useAgentStream (SSE streaming)
    ├── useChatHistory (conversation persistence)
    ├── useProactiveSignals (proactive AI offers)
    └── useOutfitStore (outfit builder state)

Stores:
    ├── layoutStore (canvas open/close, outfit items)
    └── cartStore (shopping cart state)
```

---

## 📂 Core Components

### 1. `FloatingChatbot.tsx` (308 lines)
**Location**: `frontend/src/components/cove-ai/FloatingChatbot.tsx`

**Purpose**: The floating chat bubble that appears on every page. Entry point for the entire chatbot experience.

**Features**:
- Floating button in bottom-right corner
- Quick action buttons (Discover, Build Outfit, Orders, Get Inspired)
- Tab navigation (Chat, Outfit Builder, Cart)
- Proactive offer bubbles (via `useProactiveSignals`)
- Outfit Modal trigger

**Key State**:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [activeTab, setActiveTab] = useState<'chat' | 'outfit' | 'cart'>('chat');
const [showOutfitModal, setShowOutfitModal] = useState(false);
```

**Key Functions**:
- `toggleChat()` - Opens/closes the chat panel
- `handleQuickAction(action)` - Handles quick action button clicks

**Dependencies**: 
- `useLayoutStore` (for canvas state)
- `useProactiveSignals` (for AI offers)
- `OutfitModal`, `ProactiveBubble`

---

### 2. `CoveChatWidget.tsx` (1163 lines) ⭐ MAIN COMPONENT
**Location**: `frontend/src/components/cove-ai/CoveChatWidget.tsx`

**Purpose**: The main chat interface. Handles all message sending, receiving, streaming, and response rendering.

**Features**:
- Message input and submission
- Streaming responses via SSE
- Cart proposals and confirmations
- Product recommendations display
- Thinking steps visualization
- Chat history loading
- Expand/collapse modes

**Key Props**:
```typescript
interface CoveChatWidgetProps {
    mode?: 'chat' | 'outfit_builder';  // Different modes for different workflows
}
```

**Key State**:
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isExpanded, setIsExpanded] = useState(false);
const [isLoading, setIsLoading] = useState(false);
```

**Key Functions**:
- `handleSubmit(e)` - Sends user message to backend
- `handleAgentResponse(data)` - Processes streaming response events
- `handleConfirmCartProposal(messageId)` - Confirms user wants to add to cart
- `handleCancelCartProposal(messageId)` - Cancels cart proposal
- `sendQuickMessage(message)` - Programmatically sends a message (for quick actions)

**Message Types** (via `AssistantMeta`):
```typescript
type AssistantMeta = 
    | CartProposalMeta      // "Add X to cart?"
    | RecommendationsMeta   // Product recommendations
    | CheckoutReadyMeta     // Checkout link
    | OrderHistoryMeta      // Order list
    | EmailConfirmationMeta // Email sent confirmation
```

**Type Guards**:
```typescript
isCartProposalMeta(meta)      // Check if cart proposal
isRecommendationsMeta(meta)   // Check if recommendations
isCheckoutMeta(meta)          // Check if checkout ready
isOrderHistoryMeta(meta)      // Check if order history
isEmailConfirmationMeta(meta) // Check if email confirmation
```

---

### 3. `ChatProductCard.tsx` (270 lines)
**Location**: `frontend/src/components/cove-ai/ChatProductCard.tsx`

**Purpose**: Displays a single product recommendation card inside the chat.

**Features**:
- Product image with fallback
- Title, subtitle, price display
- Color/tier badges
- Like button (wishlist)
- Add to cart button with loading state
- Click to navigate to product page
- Hover animations

**Key Props**:
```typescript
interface ChatProductCardProps {
    item: AgentItem;   // Product data from AI
    index?: number;    // For staggered animations
}
```

**Key State**:
```typescript
const [isHovered, setIsHovered] = useState(false);
const [isLiked, setIsLiked] = useState(false);
const [isAdding, setIsAdding] = useState(false);
const [isAdded, setIsAdded] = useState(false);
const [resolved, setResolved] = useState<ResolvedProductForChat>();
```

**Product Resolution**:
Cards start with `fallbackResolveAgentItemForChat` (fast, from AgentItem fields) then hydrate via `resolveAgentItemForChat` (fetches full product data from catalog API).

---

### 4. `ProductCarousel.tsx` (95 lines)
**Location**: `frontend/src/components/cove-ai/ProductCarousel.tsx`

**Purpose**: Horizontal scrolling container for product cards.

**Features**:
- Horizontal scroll with snap points
- Left/right arrow buttons
- Gradient fade edges
- Auto-hide arrows when no more content

**Key Props**:
```typescript
interface ProductCarouselProps {
    items: AgentItem[];  // Array of products to display
}
```

---

### 5. `ThinkingSteps.tsx` (101 lines)
**Location**: `frontend/src/components/cove-ai/ThinkingSteps.tsx`

**Purpose**: Displays AI thinking/processing steps while streaming.

**Features**:
- Shows step icon + status text
- Loading spinner for in-progress steps
- Checkmark for completed steps
- Compact mode for history view
- Animated slide-in

**Key Props**:
```typescript
interface ThinkingStepsProps {
    steps: ThinkingStep[];  // Array of thinking steps
    compact?: boolean;      // Compact view for message history
}
```

**Step Structure**:
```typescript
interface ThinkingStep {
    icon: string;      // Emoji icon (🧠, 🔍, etc.)
    status: string;    // Status text
    detail?: string;   // Optional detail
    done?: boolean;    // Is step complete?
}
```

---

### 6. `EnhancedThinking.tsx` (385 lines) ⭐ ADVANCED
**Location**: `frontend/src/components/cove-ai/EnhancedThinking.tsx`

**Purpose**: Advanced thinking visualization with agent identity and tools used.

**Features**:
- Agent-specific icons and colors (classifier, search, stylist, etc.)
- Confidence scores per step
- Tool usage cards with duration
- Expandable/collapsible sections
- Framer Motion animations

**Agent Configuration**:
```typescript
const AGENT_CONFIG = {
    classifier: { icon: "🧠", color: "#8B5CF6", label: "Understanding" },
    search:     { icon: "🔍", color: "#3B82F6", label: "Searching" },
    stylist:    { icon: "✨", color: "#EC4899", label: "Styling" },
    verifier:   { icon: "✅", color: "#10B981", label: "Verifying" },
    cart:       { icon: "🛒", color: "#F59E0B", label: "Cart" },
    checkout:   { icon: "💳", color: "#14B8A6", label: "Checkout" },
    fit:        { icon: "📏", color: "#F97316", label: "Sizing" },
};
```

**Key Props**:
```typescript
interface Props {
    thinking_events?: ThinkingEvent[];
    tools_used?: ToolUsage[];
    compact?: boolean;
    loading?: boolean;
}
```

---

### 7. `PersonalizedGreeting.tsx` (120 lines)
**Location**: `frontend/src/components/cove-ai/PersonalizedGreeting.tsx`

**Purpose**: Shows personalized welcome message based on auth state.

**Behavior**:
- **Loading**: Skeleton placeholder
- **Signed In**: "Welcome back, {firstName}! ✨" with personalized intro
- **Guest**: "Hey there! 👋" with sign-in prompt + quick suggestions

**Quick Suggestions** (for guests):
- "Show me trending styles"
- "I need a hoodie"
- "Looking for tees"
- "Surprise me!"

---

### 8. `SuggestedQueries.tsx` (105 lines)
**Location**: `frontend/src/components/cove-ai/SuggestedQueries.tsx`

**Purpose**: Displays context-aware follow-up action buttons after AI responses.

**Features**:
- Different button styles per type (action, question, discovery, etc.)
- Icons from iconMap
- Staggered animation on appearance
- Disabled state support

**Key Props**:
```typescript
interface SuggestedQueriesProps {
    suggestions: SuggestedAction[];
    onSelect: (query: string) => void;
    disabled?: boolean;
}

interface SuggestedAction {
    id: string;
    text: string;      // Display text
    query: string;     // What to send when clicked
    type: "action" | "question" | "navigation" | "discovery" | "account";
    icon?: string;
    priority: number;
}
```

---

### 9. `ProactiveBubble.tsx` (56 lines)
**Location**: `frontend/src/components/cove-ai/ProactiveBubble.tsx`

**Purpose**: Floating notification bubble for proactive AI offers.

**Features**:
- Animated pop-in with Framer Motion
- Dismiss (X) button
- Click to open chat
- Pointer triangle pointing to chat button
- Markdown bold (**text**) parsing

**Key Props**:
```typescript
interface ProactiveBubbleProps {
    message: string;       // The offer message
    isVisible: boolean;    // Show/hide
    onOpen: () => void;    // Click handler
    onDismiss: () => void; // Dismiss handler
}
```

---

## 👗 Outfit Builder Components

### 10. `OutfitModal.tsx` (456 lines)
**Location**: `frontend/src/components/cove-ai/OutfitModal.tsx`

**Purpose**: Full-screen modal displaying generated outfit(s).

**Features**:
- Multiple outfit navigation (prev/next)
- Individual item cards with images
- Price per item + total
- Add all to cart button
- Premium animations (spring physics)
- Budget indicator

**Key Props**:
```typescript
interface OutfitModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: OutfitItem[];
    budgetMax?: number;
}

interface OutfitItem {
    slug: string;
    title: string;
    price: number;
    imageUrl?: string;
    type?: string;
    reason?: string;
    outfit_id?: string;  // Groups items into outfits
    color?: string;
    size?: string;
}
```

**Key Functions**:
- `handlePrevOutfit()` / `handleNextOutfit()` - Navigate between outfits
- `handleAddToCart()` - Adds entire outfit to cart

---

### 11. `OutfitCanvas.tsx` (476 lines)
**Location**: `frontend/src/components/cove-ai/OutfitCanvas.tsx`

**Purpose**: Side panel showing selected outfit items with drag-and-drop reordering.

**Features**:
- Drag-and-drop reordering (dnd-kit)
- External drop zone (from AgenticOutfitBuilder)
- Live budget tracking
- "Shop All" button
- Responsive slide-in panel

**Key State**:
Managed via `useLayoutStore`:
```typescript
isCanvasOpen: boolean;
generatedOutfit: AgentItem[] | null;
```

**Key Functions**:
- `handleExternalDrop(e)` - Drop from AgenticOutfitBuilder
- `handleDragEnd(event)` - Reorder items
- `handleShopAll()` - Navigates to product pages

---

### 12. `AgenticOutfitBuilder.tsx` (324 lines) ⭐ LIVE EXPLORATION
**Location**: `frontend/src/components/cove-ai/AgenticOutfitBuilder.tsx`

**Purpose**: Live visualization of AI searching for outfit items category-by-category.

**Features**:
- Category tabs (Tops, Bottoms, Shoes, etc.)
- Real-time candidate appearance (fade-in cards)
- Status flow: Waiting → Searching → Found → Selected
- Candidate vetting indicators (analyzing, rejected, accepted)
- Drag support for adding to OutfitCanvas
- Budget bar

**Key Props**:
```typescript
interface AgenticOutfitBuilderProps {
    streamEvents: Array<{
        event_type: string;
        category?: string;
        candidates?: ProductCandidate[];
        selected_item?: ProductCandidate;
        total_found?: number;
        status?: string;
        slug?: string;
        message?: string;
        reason?: string;
        budget_max?: number;
        source?: string;
    }>;
    isActive: boolean;
}
```

**Event Types**:
- `category_start` - Start searching a category
- `category_candidates` - Found candidate products
- `item_selected` - Final item selected for outfit
- `category_vetting` - Product being analyzed/rejected/accepted
- `budget_set` - Budget from conversation flow

---

## 🧰 Utility Components

### 13. `TypingIndicator.tsx` (38 lines)
Three bouncing dots + "Thinking" text.

### 14. `StreamingCursor.tsx` (in same file)
Blinking cursor at end of streaming text.

### 15. `LoadingSkeleton.tsx` (14 lines)
Pulsing placeholder for loading messages.

### 16. `Toast.tsx` (49 lines)
Temporary notification popups (success, error, info).

### 17. `AgentThinkingSteps.tsx` (52 lines)
Simpler version of ThinkingSteps without animations.

---

## 🪝 Hooks

### `useAgentStream.ts` (240 lines)
**Purpose**: Handles Server-Sent Events (SSE) streaming from the AI backend.

**Key Exports**:
```typescript
export type ThinkingStep = {
    icon: string;
    status: string;
    detail?: string;
    done?: boolean;
};

export type StreamState = {
    thinkingSteps: ThinkingStep[];
    introText: string;
    items: any[];
    isStreaming: boolean;
    error: string | null;
    cartProposal: any | null;
    checkout: any | null;
    answer: string | null;
    kind: string | null;
    suggestedActions: any[] | null;
    thinking_events: any[] | null;
    tools_used: any[] | null;
    agenticEvents: any[];  // Live outfit exploration
};

export function useAgentStream(): StreamState & {
    sendQuery: (message, userId?, sessionId?, sessionType?) => Promise<void>;
    cancel: () => void;
}
```

**Event Handling**:
| Event | Action |
|-------|--------|
| `thinking:step` | Add to thinkingSteps |
| `intro` | Set introText |
| `items:batch` | Append to items |
| `done` | Mark streaming complete |
| `cart_proposal` | Show cart confirmation |
| `checkout` | Show checkout link |
| `answer` | Display text answer |
| `suggestions` | Show quick replies |
| `error` | Display error |
| `agentic:*` | Outfit builder exploration |

---

### `useChatHistory.ts` (75 lines)
**Purpose**: Load and save conversation history to Django backend.

**Exports**:
```typescript
export type HistoryMessage = {
    role: 'user' | 'assistant';
    content: string;
    kind?: string;
    meta?: any;
    created_at?: string;
};

export function useChatHistory(guestSessionId: string): {
    history: HistoryMessage[];
    isLoading: boolean;
    saveMessage: (message: HistoryMessage) => Promise<void>;
    loadHistory: () => Promise<void>;
}
```

---

### `useProactiveSignals.ts` (87 lines)
**Purpose**: Send user behavior signals to backend, receive proactive offers.

**Signals**:
- `VIEW_BRAND` - User viewing a brand page
- `VIEW_PRODUCT` - User viewing a product page

**Response Type**:
```typescript
interface ProactiveResponse {
    triggered: boolean;
    message?: string;
    action?: string;
    priority?: number;
}
```

---

### `useOutfitStore.ts` (76 lines)
**Purpose**: Zustand store for outfit builder state.

**State**:
```typescript
interface OutfitStore {
    categories: Record<string, CategoryState>;
    activeCategory: string | null;
    budgetMax: number;
    budgetUsed: number;
    
    setCategoryState: (category, state) => void;
    setActiveCategory: (category) => void;
    updateCandidate: (category, slug, updates) => void;
    setBudget: (max, used) => void;
    reset: () => void;
}
```

---

## 🗄 Stores

### `layoutStore.ts` (31 lines)
**Purpose**: Global layout state for outfit canvas.

```typescript
interface LayoutState {
    isCanvasOpen: boolean;
    generatedOutfit: AgentItem[] | null;
    
    openCanvas: () => void;
    closeCanvas: () => void;
    toggleCanvas: () => void;
    setGeneratedOutfit: (items) => void;
    reorderOutfit: (items) => void;
}
```

---

## 🔗 Data Flow

```
User types message
    ↓
CoveChatWidget.handleSubmit()
    ↓
useAgentStream.sendQuery()  →  POST /api/agent-dev/query-stream
    ↓
SSE Events stream back:
    thinking:step → ThinkingSteps renders
    intro → Message bubble starts
    items:batch → ProductCarousel renders
    done → Streaming stops
    ↓
User clicks suggestion
    ↓
sendQuickMessage() → Repeat flow
```

---

## 📝 Key Files Quick Reference

| Component | Lines | Purpose |
|-----------|-------|---------|
| `CoveChatWidget.tsx` | 1163 | Main chat logic |
| `FloatingChatbot.tsx` | 308 | Chat launcher |
| `OutfitCanvas.tsx` | 476 | Outfit drag-drop panel |
| `OutfitModal.tsx` | 456 | Outfit display modal |
| `EnhancedThinking.tsx` | 385 | Agent thinking UI |
| `AgenticOutfitBuilder.tsx` | 324 | Live outfit exploration |
| `ChatProductCard.tsx` | 270 | Product card |
| `PersonalizedGreeting.tsx` | 120 | Welcome message |
| `SuggestedQueries.tsx` | 105 | Quick action buttons |
| `ThinkingSteps.tsx` | 101 | Basic thinking steps |
| `ProductCarousel.tsx` | 95 | Product scroller |
| `useAgentStream.ts` | 240 | SSE streaming hook |
| `useChatHistory.ts` | 75 | History persistence |
| `useOutfitStore.ts` | 76 | Outfit builder state |

---

## 🎨 Styling Notes

- **Dark theme** by default (neutral-900, neutral-800 backgrounds)
- **Purple/pink gradients** for accents
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **lucide-react** for icons

---

## 🚀 Getting Started for UI Development

1. Start the frontend: `npm run dev` (in `/frontend`)
2. Open browser to `http://localhost:3000`
3. The chat bubble appears bottom-right
4. Check DevTools Network tab for SSE events

**Key files to modify for UI changes**:
- Layout/positioning: `FloatingChatbot.tsx`
- Chat bubble styling: `CoveChatWidget.tsx` (JSX at bottom)
- Product cards: `ChatProductCard.tsx`
- Animations: Any file using Framer Motion

---

*Last Updated: 2026-01-07*
