/**
 * Google Analytics 4 (GA4) Utility for Grid Sweeper
 * 
 * Note: The GA4 initialization script is included directly in index.html.
 * This file provides a typed helper for sending custom events.
 */

/**
 * Track a custom event
 * @param eventName Name of the event (e.g., 'game_won')
 * @param params Optional event parameters
 */
export function trackEvent(eventName: string, params?: object): void {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    } else {
        console.debug(`Analytics: gtag not initialized, skipping event: ${eventName}`, params);
    }
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        dataLayer: any[];
        gtag: (...args: any[]) => void;
    }
}

