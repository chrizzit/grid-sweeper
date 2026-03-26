/**
 * Google Analytics 4 (GA4) Utility for Grid Sweeper
 * 
 * To set up your own tracking:
 * 1. Go to https://analytics.google.com/
 * 2. Create a GA4 property and get your Measurement ID (e.g., G-XXXXXXXXXX)
 * 3. Replace the placeholder below with your actual ID.
 */

const GA_MEASUREMENT_ID = 'G-MX5T39HCKR'; // Updated with user's real ID

/**
 * Initialize Google Analytics
 */
export function initAnalytics(): void {
    // Check if script is already loaded
    if (document.getElementById('ga-script')) return;

    // Add GA4 gtag.js script
    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
        window.dataLayer.push(args);
    }
    
    // @ts-ignore
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: true,
        cookie_domain: 'auto',
        cookie_flags: 'SameSite=None;Secure'
    });
}

/**
 * Track a custom event
 * @param eventName Name of the event (e.g., 'game_won')
 * @param params Optional event parameters
 */
export function trackEvent(eventName: string, params?: object): void {
    // @ts-ignore
    if (typeof window.gtag === 'function') {
        // @ts-ignore
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
