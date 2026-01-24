/**
 * Analytics Initialization Component
 * 
 * Client-side component to initialize analytics tracking
 * Must be a client component because it uses useEffect
 */
'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/utils/analytics';

export default function AnalyticsInit() {
    useEffect(() => {
        // Initialize analytics on mount
        initAnalytics();
        console.log('✅ Analytics initialized');
    }, []);

    // Render nothing
    return null;
}
