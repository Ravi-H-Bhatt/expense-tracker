import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth callback error:', error.message);
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent('Could not sign you in. Please try again.')}`
      );
    }
  }

  // Only allow internal redirects to avoid open-redirect issues
  const safeNext = next.startsWith('/') ? next : '/dashboard';
  return NextResponse.redirect(`${origin}${safeNext}`);
}
