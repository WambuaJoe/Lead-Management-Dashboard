/**
 * Security utilities for CSRF protection and origin validation
 */

/**
 * Validates that the request is coming from the same origin
 * This is a client-side check - true CSRF protection requires backend support
 */
export function validateOrigin(expectedOrigin: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const currentOrigin = window.location.origin;
  return currentOrigin === expectedOrigin;
}

/**
 * Adds security headers to fetch requests
 */
export function createSecureHeaders(isGetRequest = false): HeadersInit {
  const headers: HeadersInit = {};

  // Only add Content-Type for non-GET requests
  // GET requests shouldn't have Content-Type as they have no body
  if (!isGetRequest) {
    headers['Content-Type'] = 'application/json';
  }

  // Add custom header that backend can validate
  // Backend should reject requests without this header
  headers['X-Requested-With'] = 'XMLHttpRequest';
  
  // Add Accept header to request JSON
  headers['Accept'] = 'application/json';

  // ngrok free tier often returns an HTML "browser warning" interstitial unless this header is set.
  // This header is safe to send generally, and fixes "text/html" responses from ngrok tunnels.
  headers['ngrok-skip-browser-warning'] = 'true';
  
  return headers;
}

/**
 * Validates webhook URL is from expected domain (if configured)
 */
export function validateWebhookOrigin(url: string, allowedOrigins?: string[]): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) return true;
  
  try {
    const parsed = new URL(url);
    return allowedOrigins.some(origin => parsed.origin === origin);
  } catch {
    return false;
  }
}

