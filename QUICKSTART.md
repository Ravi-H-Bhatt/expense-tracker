# ⚡ RFin - Quick Start Guide

Get RFin running in under 10 minutes!

## 🎯 What You'll Need

- Node.js 18+ installed
- A Supabase account (sign up free at supabase.com)
- A Groq API key (get free at console.groq.com)

## 🚀 5-Minute Setup

### 1. Create Supabase Project (2 min)

1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Create new project
3. Go to SQL Editor → Run `supabase-schema.sql` file
4. Go to Settings → API → Copy:
   - Project URL
   - anon/public key
   - service_role key

### 2. Get Groq API Key (1 min)

1. Go to [console.groq.com](https://console.groq.com) → Sign up/Login
2. API Keys → Create API Key
3. Copy the key

### 3. Configure Environment (1 min)

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Install & Run (1 min)

```bash
npm install
npm run dev
```

Visit http://localhost:3000 🎉

## ✅ Test It Works

1. Click "Sign Up"
2. Create account (use any email for testing)
3. Go to Dashboard
4. Open AI Assistant
5. Type: "Spent ₹500 on petrol"
6. See it create an expense automatically!

## 🎨 What's Included

✅ **Complete Authentication**
- Email/Password signup
- Google OAuth (configure in Supabase)
- GitHub OAuth (configure in Supabase)

✅ **AI Financial Assistant**
- Natural language expense tracking
- Budget management
- Split expenses
- Financial insights

✅ **Full Dashboard**
- Beautiful stats overview
- Expense management
- Analytics with charts
- Budget tracking

✅ **Premium UI**
- Luxury beige theme
- Glassmorphism effects
- Smooth animations
- Dark mode ready
- Fully responsive

## 📖 Next Steps

For OAuth providers setup: See `SETUP.md`

For deployment to Vercel: See `SETUP.md` Section 7

For full documentation: See `README.md`

## 🆘 Quick Troubleshooting

**"Invalid API Key"** → Check your `.env.local` has correct keys

**"Table does not exist"** → Run the `supabase-schema.sql` in Supabase SQL Editor

**OAuth not working** → Need to configure providers in Supabase (see SETUP.md)

## 💡 Pro Tips

- Start with AI Assistant - it's the fastest way to add expenses
- Try "How much did I spend on food?" for insights
- Set budgets: "Set food budget to ₹10000"
- Split bills: "Split ₹3000 with Ravi and Jay"

That's it! You're ready to manage your finances with AI 🚀

For detailed setup: `SETUP.md`
For features guide: `README.md`
