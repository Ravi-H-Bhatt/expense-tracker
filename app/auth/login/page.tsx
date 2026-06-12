// SETUP REQUIRED IN SUPABASE DASHBOARD:
// 1. Go to Authentication → Providers → Google → Enable
// 2. Add your Google OAuth Client ID and Secret
//    (Get from: console.cloud.google.com → APIs & Services → Credentials)
// 3. In Google Console, add Authorized redirect URI:
//    https://<your-supabase-project>.supabase.co/auth/v1/callback
// 4. In Supabase Auth settings, add Site URL: https://expense-tracker-rk-5.netlify.app
// 5. Add redirect URL: https://expense-tracker-rk-5.netlify.app/auth/callback

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const supabase = createClient();

  // Surface OAuth callback errors (e.g. provider not enabled / cancelled)
  useEffect(() => {
    const oauthError = searchParams?.get('error');
    if (oauthError) {
      toast.error(decodeURIComponent(oauthError));
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Welcome back!');
      const returnTo = searchParams?.get('returnTo') || '/dashboard';
      // Hard navigation so the server-side middleware immediately sees the
      // freshly-set auth cookie (avoids bouncing back to the login page).
      window.location.assign(returnTo);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Must EXACTLY match a URL in Supabase's Redirect URLs allowlist.
          // Keep it clean (no query string) so Supabase doesn't fall back to Site URL.
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile gradient bar */}
      <div className="h-2 w-full bg-gradient-to-r from-[#065F46] via-[#047857] to-[#10B981] md:hidden" />

      {/* Left Panel - Brand Story */}
      <div className="hidden md:flex md:w-[45%] min-h-screen relative overflow-hidden">
        {/* Gradient Background */}
        <div 
          className="absolute inset-0" 
          style={{
            background: 'linear-gradient(145deg, #065F46 0%, #047857 40%, #10B981 100%)'
          }}
        />

        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px'
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-12 text-white w-full">
          {/* Logo & Wordmark */}
          <div className="mb-8 text-center">
            <svg width="56" height="56" viewBox="0 0 56 56" className="mx-auto mb-4" fill="white">
              <path d="M28 4 L32 20 L48 20 L35 29 L40 45 L28 36 L16 45 L21 29 L8 20 L24 20 Z" />
            </svg>
            <h1 className="text-[2rem] font-['var(--font-playfair)'] font-semibold">RFin</h1>
          </div>

          {/* Tagline */}
          <p className="text-lg italic text-white/80 mb-12 font-['var(--font-dm-sans)'] text-center max-w-md">
            Your money, finally understood.
          </p>

          {/* Feature Pills */}
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
              <span className="text-xl">✦</span>
              <span className="font-['var(--font-dm-sans)'] text-base">Smart expense splitting</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
              <span className="text-xl">✦</span>
              <span className="font-['var(--font-dm-sans)'] text-base">AI finance assistant</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
              <span className="text-xl">✦</span>
              <span className="font-['var(--font-dm-sans)'] text-base">Group fund tracking</span>
            </div>
          </div>

          {/* Decorative SVG at bottom */}
          <div className="absolute bottom-12">
            <svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="25" stroke="white" strokeWidth="1" opacity="0.06" fill="white" fillOpacity="0.02" />
              <circle cx="100" cy="30" r="28" stroke="white" strokeWidth="1" opacity="0.06" fill="white" fillOpacity="0.02" />
              <circle cx="170" cy="30" r="25" stroke="white" strokeWidth="1" opacity="0.06" fill="white" fillOpacity="0.02" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 md:w-[55%] min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center">
            <svg width="48" height="48" viewBox="0 0 56 56" className="mx-auto mb-2" fill="#047857">
              <path d="M28 4 L32 20 L48 20 L35 29 L40 45 L28 36 L16 45 L21 29 L8 20 L24 20 Z" />
            </svg>
            <h1 className="text-2xl font-['var(--font-playfair)'] font-semibold text-[#0F172A]">RFin</h1>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-[2rem] font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-2">
              Welcome back
            </h2>
            <p className="text-[#475569] font-['var(--font-dm-sans)'] text-sm">
              Sign in to your expense tracker
            </p>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="press w-full bg-white border border-[#E2E8F0] rounded-xl py-3 px-4 flex items-center justify-center gap-3 font-['var(--font-dm-sans)'] font-medium text-[#0F172A] hover:bg-[#F8FAFC] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-[#F8FAFC] text-[#94A3B8] text-xs font-['var(--font-dm-sans)']">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-['var(--font-dm-sans)'] text-[#475569] mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white placeholder:text-[#94A3B8] text-[#0F172A] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-['var(--font-dm-sans)'] text-[#475569] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white placeholder:text-[#94A3B8] text-[#0F172A] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
                disabled={isLoading}
              />
              <div className="text-right mt-1">
                <Link href="#" className="text-xs text-[#047857] font-['var(--font-dm-sans)'] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="press w-full bg-[#047857] text-white rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-medium hover:bg-[#065F46] hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm font-['var(--font-dm-sans)'] text-[#475569] mt-6">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-[#047857] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-[#475569]">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
