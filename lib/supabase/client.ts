import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Keep the user signed in on this device across reloads/restarts.
        persistSession: true,
        // Silently refresh the access token before it expires so the
        // user never has to log in again while the refresh token is valid.
        autoRefreshToken: true,
        // Pick up the session from the URL after OAuth/email callbacks.
        detectSessionInUrl: true,
      },
    }
  )
}
