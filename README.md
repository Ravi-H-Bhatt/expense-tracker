# 🌟 RFin - Premium AI-Powered Expense Tracker

**RFin** is a production-level, luxury minimalist expense tracker with advanced AI capabilities powered by Groq. Built with Next.js 15, TypeScript, Supabase, and featuring a beautiful beige finance UI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🔐 Authentication
- Google OAuth login
- GitHub OAuth login
- Email/password authentication
- Mobile number requirement
- Secure session management with Supabase
- Protected dashboard routes

### 💰 Expense Management
- Add, edit, and delete expenses
- 8 Categories: Food, Petrol, Friends, Shopping, Bills, Entertainment, Travel, Other
- Payment method tracking (Cash, Credit/Debit Card, UPI, Net Banking)
- Notes and date picker for each expense
- Advanced search and filtering

### 🤖 AI Financial Command Center (Powered by Groq)
Natural language financial assistant that understands:

**Expense Commands:**
- "Spent ₹500 on petrol"
- "Add ₹1200 dinner with friends"
- "I paid ₹350 for Netflix"

**Budget Commands:**
- "Set monthly food budget to ₹8000"
- "Allocate ₹5000 for travel"

**Split Expense Commands:**
- "Split ₹2400 between Ravi, Jay and Mehul"
- "Jay owes me ₹800"

**Analytics Questions:**
- "Where did I spend the most this month?"
- "How much did I save?"
- "Show food spending trend"

### 📊 Analytics & Insights
- Interactive pie charts for category breakdown
- Monthly spending trends
- Weekly analytics
- Category-wise budget comparison
- AI-generated monthly insights
- Savings recommendations
- Anomaly detection for unusual spending

### 🎨 UI/UX
- Luxury beige minimalist finance theme
- Glassmorphism cards with backdrop blur
- Smooth Framer Motion animations
- Fully responsive mobile-first design
- Dark/light mode support
- Professional dashboard layout
- Loading skeletons and empty states
- Toast notifications with Sonner
- Apple + Notion + modern fintech inspired

### 📈 Database
- Normalized PostgreSQL schema via Supabase
- Row Level Security (RLS) enabled
- Optimized indexes for performance
- Automatic timestamp management
- Database triggers for profile creation
- Useful views for analytics

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (Nova preset)
- **Animations:** Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI:** Groq API (Llama 3.3 70B)
- **Charts:** Recharts
- **Date Handling:** date-fns
- **Deployment:** Vercel

## 📦 Installation

### Prerequisites
- Node.js 18+ (v25.9.0 tested)
- npm or yarn
- Supabase account
- Groq API key

### Step 1: Clone and Install

```bash
cd rfin
npm install
```

### Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the `supabase-schema.sql` file
3. Enable Row Level Security on all tables
4. Configure OAuth providers in Supabase Dashboard:
   - Settings → Authentication → Providers
   - Enable Google OAuth
   - Enable GitHub OAuth
   - Add your app URLs as redirect URLs

### Step 3: Get Groq API Key

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create a new API key
3. Copy the key for environment variables

### Step 4: Environment Variables

Create `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Groq AI
GROQ_API_KEY=your_groq_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find your Supabase keys:
- Project URL: Settings → API → Project URL
- Anon Key: Settings → API → Project API keys → anon/public
- Service Role Key: Settings → API → Project API keys → service_role

### Step 5: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import project to Vercel:
   ```bash
   vercel
   ```

3. Add environment variables in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel domain

4. Update Supabase redirect URLs:
   - Add your Vercel URL to allowed redirect URLs
   - Format: `https://your-app.vercel.app/auth/callback`

5. Deploy:
   ```bash
   vercel --prod
   ```

### Deploy Database Migrations

Already handled by running `supabase-schema.sql` in Supabase SQL Editor.

## 📁 Project Structure

```
rfin/
├── app/
│   ├── api/              # API routes
│   │   └── ai/
│   │       └── chat/     # AI chat endpoint
│   ├── auth/             # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/        # Dashboard pages
│   │   ├── expenses/
│   │   ├── analytics/
│   │   ├── budget/
│   │   └── ai-assistant/
│   ├── globals.css       # Global styles
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard components
│   ├── expenses/         # Expense components
│   ├── analytics/        # Chart components
│   └── ai/               # AI assistant components
├── lib/
│   ├── supabase/         # Supabase clients
│   ├── ai/               # AI utilities
│   ├── format.ts         # Formatting utilities
│   └── utils.ts          # General utilities
├── types/
│   └── index.ts          # TypeScript types
├── supabase-schema.sql   # Database schema
├── .env.local            # Environment variables
└── README.md             # This file
```

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Secure API routes with auth checks
- Environment variables for sensitive data
- HTTPS only in production
- Rate limiting on AI endpoints
- Input validation and sanitization

## 🎯 Key Features Implementation

### AI Command Parser
Uses Groq's structured output to parse natural language into actionable database operations.

### Real-time Updates
Optimistic UI updates with automatic revalidation.

### Responsive Design
Mobile-first approach with breakpoints for tablet and desktop.

### Performance
- Image optimization with Next.js Image
- Dynamic imports for code splitting
- Efficient database queries with indexes
- Caching strategies

## 📊 Database Schema

Tables:
- `profiles` - User profiles
- `expenses` - Expense records
- `budgets` - Category budgets
- `ai_summaries` - AI-generated insights
- `split_expenses` - Split expense tracking
- `chat_history` - AI chat conversation history

Views:
- `monthly_expenses_summary` - Monthly aggregations
- `category_spending` - Category-wise analysis

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript types
```

### Adding Components

```bash
npx shadcn@latest add [component-name]
```

## 🤝 Contributing

This is a complete production-ready application. Feel free to fork and customize for your needs.

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for deployment platform
- Supabase for backend infrastructure
- Groq for lightning-fast AI inference
- shadcn for beautiful UI components

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Next.js 15 and Groq AI**

*RFin - Your Premium AI Financial Companion*
