import { createBrowserClient } from '@supabase/ssr'

// NOTE: Do NOT pass a custom `auth` options object here. @supabase/ssr's
// createBrowserClient sets up COOKIE-based session storage internally so the
// server (middleware / server components) can read the session. Overriding
// `auth` can switch it back to localStorage, which the server can't see —
// that breaks login (the session never reaches the middleware). Cookie storage
// already persists the session across reloads and auto-refreshes the token.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
