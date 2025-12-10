// src/config/breakpoints.ts

/**
 * Responsive breakpoints configuration for COVE
 * Matches Tailwind CSS default breakpoints for consistency
 */

export const BREAKPOINTS = {
    // Mobile devices (portrait)
    xs: 320,
    // Mobile devices (landscape)
    sm: 640,
    // Tablets (portrait)
    md: 768,
    // Tablets (landscape) and small laptops
    lg: 1024,
    // Desktops and laptops
    xl: 1280,
    // Large desktops
    '2xl': 1536,
    // Extra large displays
    '3xl': 1920,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Get current breakpoint based on window width
 */
export const getCurrentBreakpoint = (): BreakpointKey => {
    if (typeof window === 'undefined') return 'md';

    const width = window.innerWidth;

    if (width >= BREAKPOINTS['3xl']) return '3xl';
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
};

/**
 * Check if current viewport matches a breakpoint
 */
export const useBreakpoint = (breakpoint: BreakpointKey): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= BREAKPOINTS[breakpoint];
};

/**
 * Media query strings for use in CSS-in-JS
 */
export const MEDIA_QUERIES = {
    xs: `(min-width: ${BREAKPOINTS.xs}px)`,
    sm: `(min-width: ${BREAKPOINTS.sm}px)`,
    md: `(min-width: ${BREAKPOINTS.md}px)`,
    lg: `(min-width: ${BREAKPOINTS.lg}px)`,
    xl: `(min-width: ${BREAKPOINTS.xl}px)`,
    '2xl': `(min-width: ${BREAKPOINTS['2xl']}px)`,
    '3xl': `(min-width: ${BREAKPOINTS['3xl']}px)`,
} as const;
