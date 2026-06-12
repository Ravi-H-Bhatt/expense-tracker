import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  // Only allow internal redirects (avoid open-redirect)
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  // Build the redirect response first so the Supabase client can write the
  // auth cookies (and read the PKCE code-verifier cookie) onto the exact
  // response the browser receives. Use NextRequest cookies for correct decoding.
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('OAuth callback error:', error.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message || 'Could not sign you in. Please try again.')}`
    );
  }

  return response;
}
