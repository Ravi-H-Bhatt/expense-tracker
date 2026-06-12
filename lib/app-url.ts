import { NextRequest } from 'next/server';

// Production fallback used only when nothing else is available.
const PRODUCTION_FALLBACK = 'https://expense-tracker-ravibhatt.vercel.app';

/**
 * Resolve the public base URL for building links in emails/notifications.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL env var (explicit, most reliable)
 *  2. Vercel's auto-provided VERCEL_URL (the live deployment host)
 *  3. The incoming request's origin / forwarded host headers
 *  4. A hard-coded production fallback (never localhost in prod)
 *
 * This guarantees emails point at the deployed site even if an env var
 * was forgotten.
 */
export function resolveAppUrl(request?: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes('localhost')) {
    return stripTrailingSlash(envUrl);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${stripTrailingSlash(vercelUrl)}`;
  }

  if (request) {
    // Prefer the forwarded headers set by the platform/proxy
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost && !forwardedHost.includes('localhost')) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    const origin = request.nextUrl?.origin;
    if (origin && !origin.includes('localhost')) {
      return stripTrailingSlash(origin);
    }
  }

  // Local development: honor explicit localhost env if set
  if (envUrl) return stripTrailingSlash(envUrl);

  return PRODUCTION_FALLBACK;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
