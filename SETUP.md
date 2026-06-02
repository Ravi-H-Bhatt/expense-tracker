# 🚀 RFin - Complete Setup Guide

This guide will walk you through setting up RFin from scratch to deployment.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed (tested on v25.9.0)
- **npm** or **yarn** package manager
- A **Supabase** account (free tier works fine)
- A **Groq API** key (free tier available)
- **Git** for version control
- A **Vercel** account for deployment (optional but recommended)

## 🗄️ Step 1: Supabase Database Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Fill in:
   - **Project Name**: rfin (or your choice)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient
5. Click "Create new project" and wait 1-2 minutes

### 1.2 Run the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Open `supabase-schema.sql` from your project root
4. Copy the entire content
5. Paste into the SQL Editor
6. Click "Run" (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

This creates:
- 7 tables (profiles, expenses, budgets, ai_summaries, split_expenses, chat_history)
- Row Level Security policies
- Indexes for performance
- Triggers for auto-updating timestamps
- Useful views for analytics

### 1.3 Verify Tables Created

1. Go to **Table Editor** (left sidebar)
2. You should see all tables listed:
   - `profiles`
   - `expenses`
   - `budgets`
   - `ai_summaries`
   - `split_expenses`
   - `chat_history`

### 1.4 Get Your Supabase Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: Long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this SECRET!)

## 🔐 Step 2: Configure OAuth Providers

### 2.1 Google OAuth

1. In Supabase, go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Enable Google provider
4. Go to [Google Cloud Console](https://console.cloud.google.com)
5. Create a new project or select existing
6. Enable **Google+ API**
7. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
8. Application type: **Web application**
9. Authorized redirect URIs: Add
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
10. Copy **Client ID** and **Client Secret**
11. Paste into Supabase Google provider settings
12. Save

### 2.2 GitHub OAuth

1. In Supabase, go to **Authentication** → **Providers**
2. Find **GitHub** and click to expand
3. Enable GitHub provider
4. Go to [GitHub Settings](https://github.com/settings/developers)
5. Click **OAuth Apps** → **New OAuth App**
6. Fill in:
   - **Application name**: RFin
   - **Homepage URL**: `http://localhost:3000` (for dev)
   - **Authorization callback URL**: 
     ```
     https://YOUR_PROJECT.supabase.co/auth/v1/callback
     ```
7. Click **Register application**
8. Copy **Client ID**
9. Generate a new **Client Secret** and copy it
10. Paste both into Supabase GitHub provider settings
11. Save

## 🤖 Step 3: Get Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up or sign in
3. Click on your profile → **API Keys**
4. Click **Create API Key**
5. Give it a name: "RFin Development"
6. Copy the API key (you won't see it again!)
7. Save it securely

Groq provides:
- **Free tier**: 14,400 requests/day
- **Model**: Llama 3.3 70B (ultra-fast inference)
- **Perfect for**: Natural language processing

## ⚙️ Step 4: Environment Variables

1. In your project root, create `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key

# Groq API Configuration  
GROQ_API_KEY=gsk_...your_groq_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Replace all placeholder values with your actual credentials

⚠️ **IMPORTANT**: Never commit `.env.local` to Git! It's already in `.gitignore`.

## 📦 Step 5: Install Dependencies

```bash
npm install
```

This installs:
- Next.js 15
- TypeScript
- Tailwind CSS v4
- Supabase client libraries
- Groq SDK
- shadcn/ui components
- Framer Motion
- Recharts
- And all other dependencies

## 🧪 Step 6: Test Locally

### 6.1 Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 6.2 Test Authentication

1. Visit `http://localhost:3000`
2. Click "Sign Up"
3. Create an account with:
   - Full Name
   - Email
   - Mobile Number (required)
   - Password
4. Check your email for verification link
5. Click verification link
6. Sign in

### 6.3 Test AI Assistant

1. After signing in, go to Dashboard
2. Click "AI Assistant" in sidebar
3. Try these commands:
   - "Spent ₹500 on petrol"
   - "How much did I spend this month?"
   - "Set food budget to ₹8000"
4. Verify expenses are created in dashboard

### 6.4 Test OAuth (Optional)

1. Go to Sign In page
2. Click "Google" or "GitHub"
3. Authorize the app
4. Should redirect to dashboard

## 🌐 Step 7: Deploy to Vercel

### 7.1 Prepare for Deployment

1. Initialize Git (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a GitHub repository
3. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/rfin.git
   git push -u origin main
   ```

### 7.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Vercel auto-detects Next.js configuration
6. Add Environment Variables:
   - Click "Environment Variables"
   - Add all variables from `.env.local`
   - **Important**: Update `NEXT_PUBLIC_APP_URL` to your Vercel domain
     ```
     NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
     ```
7. Click "Deploy"
8. Wait 2-3 minutes for deployment

### 7.3 Update OAuth Redirect URLs

After deployment, update OAuth apps with production URLs:

**Google:**
1. Add to Authorized redirect URIs:
   ```
   https://your-app.vercel.app/auth/callback
   ```

**GitHub:**
1. Update Authorization callback URL:
   ```
   https://your-app.vercel.app/auth/callback
   ```

**Supabase:**
1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```

### 7.4 Test Production Deployment

1. Visit your Vercel URL
2. Test signup/signin
3. Test AI assistant
4. Test OAuth providers

## 🔧 Step 8: Optional Configurations

### 8.1 Custom Domain

1. In Vercel, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update `NEXT_PUBLIC_APP_URL` environment variable
6. Update all OAuth redirect URLs

### 8.2 Database Backups

1. In Supabase dashboard
2. Go to **Database** → **Backups**
3. Free tier: Daily backups, 7-day retention
4. Pro tier: Custom backup schedules

### 8.3 Monitoring

1. **Vercel Analytics**: Built-in, enable in project settings
2. **Supabase Logs**: View in dashboard under "Logs"
3. **Error Tracking**: Consider Sentry integration

## 📊 Step 9: Verify Everything Works

### Checklist:

- [ ] Can sign up with email/password
- [ ] Can sign in with Google
- [ ] Can sign in with GitHub  
- [ ] Dashboard loads with stats
- [ ] Can add expense manually
- [ ] AI assistant responds to commands
- [ ] AI assistant creates expenses
- [ ] AI assistant sets budgets
- [ ] AI assistant splits expenses
- [ ] Analytics page shows charts
- [ ] Mobile responsive design works
- [ ] Dark mode toggle works
- [ ] Can sign out

## 🐛 Troubleshooting

### Issue: "Invalid API Key" for Groq

**Solution**: 
- Verify your API key in `.env.local`
- Ensure no extra spaces
- Regenerate key if needed

### Issue: OAuth redirect fails

**Solution**:
- Check redirect URLs match exactly
- Must use HTTPS in production
- Wait 5 minutes for OAuth changes to propagate

### Issue: Database RLS policy blocks queries

**Solution**:
- Verify you're signed in
- Check RLS policies in Supabase
- Ensure triggers created properly

### Issue: Build fails on Vercel

**Solution**:
- Check build logs
- Verify all environment variables are set
- Ensure TypeScript has no errors: `npm run build` locally

## 🎯 Next Steps

After successful setup:

1. **Customize Theme**: Edit `app/globals.css` color variables
2. **Add Features**: Extend AI capabilities in `lib/ai/`
3. **Improve UI**: Add more shadcn/ui components
4. **Analytics**: Integrate PostHog or Mixpanel
5. **Export**: Add CSV export functionality
6. **Reports**: PDF generation for monthly reports

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Groq Docs](https://console.groq.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 🆘 Support

For issues:
1. Check console logs in browser DevTools
2. Check Vercel deployment logs
3. Check Supabase logs
4. Review this setup guide again

## ✅ Setup Complete!

Congratulations! Your RFin application is now:
- ✅ Fully configured
- ✅ Running locally
- ✅ Deployed to production
- ✅ Ready for users

Enjoy your premium AI-powered expense tracker! 🎉
