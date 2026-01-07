import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useCartStore } from '@/src/store/cartStore';

// Type for the signal response
export interface ProactiveResponse {
    triggered: boolean;
    message?: string;
    action?: string;
    priority?: number;
}

export function useProactiveSignals(onOffer: (offer: ProactiveResponse) => void) {
    const pathname = usePathname();
    const { user } = useUser();
    const cartItems = useCartStore((state) => state.items);
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Ref to track visit counts in session (simple version)
    const visitsRef = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!pathname) return;

        const handleSignal = async () => {
            let signal = '';
            let context: any = {};

            // 1. Detect Views
            if (pathname.startsWith('/brand/')) {
                signal = 'VIEW_BRAND';
                const brand = pathname.split('/').pop();
                // Track visits
                visitsRef.current[brand!] = (visitsRef.current[brand!] || 0) + 1;

                context = {
                    brand: brand,
                    visit_count: visitsRef.current[brand!],
                    url: pathname
                };
            } else if (pathname.startsWith('/product/')) {
                signal = 'VIEW_PRODUCT';
                // Mock brand extraction (would need product data context in real app)
                // For now context relies on backend looking up product or just generic rules
                context = {
                    url: pathname,
                    // time_on_page handled by separate timer? simplified for now
                    time_on_page: 15 // Mocking user dwelling
                };
            } else {
                return; // No signal for other pages yet
            }

            // 2. Send Signal
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_AI_CORE_URL}/ai/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        signal,
                        context,
                        user_id: user?.id || 'guest',
                        session_id: 'current-session' // simplified
                    })
                });

                const data: ProactiveResponse = await res.json();

                if (data.triggered && data.message) {
                    onOffer(data);
                }

            } catch (err) {
                console.error('Proactive signal failed:', err);
            }
        };

        // Debounce or immediate? Immediate for page view.
        handleSignal();

    }, [pathname, user?.id]);

    // separate effect for cart updates?
    // skipping for MVP simplicity - relying on view signals mostly
}
