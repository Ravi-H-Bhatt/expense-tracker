import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  // Only allow internal redirects to avoid open-redirect issues
  const safeNext = next.startsWith('/') ? next : '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  // Build the redirect response up front so the Supabase client can write
  // the auth cookies DIRECTLY onto the response that the browser receives.
  // (Using next/headers cookies() here does NOT reliably attach cookies to a
  // NextResponse.redirect, which is what caused the bounce back to sign-in.)
  const response = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split(';')
            .map((c) => {
              const [name, ...rest] = c.trim().split('=');
              return { name, value: rest.join('=') };
            }) ?? [];
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
      `${origin}/auth/login?error=${encodeURIComponent('Could not sign you in. Please try again.')}`
    );
  }

  return response;
}
