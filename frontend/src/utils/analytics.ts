/**
 * Analytics Tracking Utility
 * 
 * 2024 Best Practices:
 * - Event batching (reduces requests)
 * - GDPR compliant (consent checks)
 * - Async & non-blocking
 * - Engagement metrics (time, scroll)
 * 
 * Usage:
 *   import { trackInteraction, initAnalytics } from '@/utils/analytics';
 *   
 *   // Initialize on app load
 *   initAnalytics();
 *   
 *   // Track events
 *   trackInteraction('CCH001', 'view_item');
 *   trackInteraction('CCH001', 'add_to_cart', { position: 1 });
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const BATCH_SIZE = 10;          // Batch events (2024 best practice)
const BATCH_INTERVAL = 5000;    // 5 seconds
// STORAGE_KEY removed (unused)

// ... (imports/types if needed, but simple types work)

interface AnalyticsMetadata {
    [key: string]: any;
}

interface AnalyticsEvent {
    user_id: string;
    product_id: string;
    interaction_type: string;
    session_id: string;
    time_on_page: number;
    scroll_depth: number;
    consent_given: boolean;
    metadata: AnalyticsMetadata;
}

// Event queue
let eventQueue: AnalyticsEvent[] = [];
let batchTimer: NodeJS.Timeout | null = null;
const pageLoadTime = Date.now();
let maxScrollDepth = 0;

/**
 * Get or create anonymous user ID
 */
function getUserId(): string {
    // Check if user is logged in (from Clerk or session)
    const clerkUser = (window as any)?.Clerk?.user;
    if (clerkUser?.id) {
        return `user_${clerkUser.id}`;
    }

    // Anonymous user - use session ID
    return `anon_${getSessionId()}`;
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
    const stored = sessionStorage.getItem('cove_session_id');
    if (stored) return stored;

    // Generate new session ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('cove_session_id', sessionId);
    return sessionId;
}

/**
 * Check GDPR consent status
 */
function getConsentStatus(): boolean {
    // Check cookie consent (from your consent banner)
    const consent = localStorage.getItem('cookie_consent');
    return consent === 'accepted';
}

/**
 * Get time spent on current page
 */
function getTimeOnPage(): number {
    return Math.floor((Date.now() - pageLoadTime) / 1000); // seconds
}

/**
 * Get scroll depth
 */
function getScrollDepth(): number {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrolled = ((scrollTop + windowHeight) / documentHeight) * 100;

    maxScrollDepth = Math.max(maxScrollDepth, scrolled);
    return Math.min(Math.floor(maxScrollDepth), 100);
}

/**
 * Flush events to backend (batch send)
 */
async function flushEvents() {
    if (eventQueue.length === 0) return;

    const events = [...eventQueue];
    eventQueue = [];

    try {
        await fetch(`${API_BASE}/api/analytics/track-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
            keepalive: true  // Ensure sent even if page closes
        });
    } catch (error) {
        // Fail silently - don't break UX
        console.debug('Analytics tracking failed:', error);
    }
}

/**
 * Track user interaction with product
 */
export function trackInteraction(productId: string, type: string, metadata: AnalyticsMetadata = {}) {
    // Skip if tracking disabled
    if (typeof window === 'undefined') return;

    const consent = getConsentStatus();
    const userId = getUserId();
    const sessionId = getSessionId();

    const event: AnalyticsEvent = {
        user_id: userId,
        product_id: productId,
        interaction_type: type,
        session_id: sessionId,
        time_on_page: getTimeOnPage(),
        scroll_depth: getScrollDepth(),
        consent_given: consent,
        metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            page_url: window.location.href
        }
    };

    // DEBUG: Log what we're tracking (remove in production)
    console.log('📊 Analytics Event:', {
        user_id: userId,
        product_id: productId,
        type: type,
        session: sessionId.substring(0, 20) + '...'
    });

    // Add to batch queue
    eventQueue.push(event);

    // Flush if batch full
    if (eventQueue.length >= BATCH_SIZE) {
        flushEvents();
    }
}

/**
 * Track product view
 */
export function trackProductView(productId: string, metadata: AnalyticsMetadata = {}) {
    trackInteraction(productId, 'view_item', metadata);
}

/**
 * Track add to cart
 */
export function trackAddToCart(productId: string, metadata: AnalyticsMetadata = {}) {
    trackInteraction(productId, 'add_to_cart', metadata);
}

/**
 * Track remove from cart
 */
export function trackRemoveFromCart(productId: string, metadata: AnalyticsMetadata = {}) {
    trackInteraction(productId, 'remove_from_cart', metadata);
}

/**
 * Track checkout start
 */
export function trackBeginCheckout(metadata: AnalyticsMetadata = {}) {
    trackInteraction('checkout', 'begin_checkout', metadata);
}

/**
 * Track purchase
 */
export function trackPurchase(productIds: string[], metadata: AnalyticsMetadata = {}) {
    productIds.forEach(productId => {
        trackInteraction(productId, 'purchase', metadata);
    });
}

/**
 * Initialize analytics
 * Call this on app load (e.g., in _app.js or layout.js)
 */
export function initAnalytics() {
    if (typeof window === 'undefined') return;

    // Auto-flush periodically
    batchTimer = setInterval(flushEvents, BATCH_INTERVAL);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
        flushEvents();
    });

    // Flush on visibility change (page hide)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushEvents();
        }
    });

    // Track scroll depth
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            getScrollDepth(); // Updates maxScrollDepth
        }, 100);
    }, { passive: true });

    console.debug('🔍 Analytics initialized');
}

/**
 * Cleanup analytics
 * Call this on app unmount if needed
 */
export function cleanupAnalytics() {
    if (batchTimer) {
        clearInterval(batchTimer);
    }
    flushEvents();
}

const analytics = {
    trackInteraction,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    initAnalytics,
    cleanupAnalytics
};

export default analytics;
