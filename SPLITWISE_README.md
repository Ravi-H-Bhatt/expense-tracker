# RFin Splitwise Module - Implementation Guide

## ✅ Completed Implementation

### 1. Authentication (Google OAuth + Email/Password)
- ✅ Redesigned login page with split-panel luxury design
- ✅ Redesigned signup page matching login design
- ✅ Google OAuth integration configured
- ✅ Auth callback route handling
- ✅ Playfair Display & DM Sans fonts integrated

### 2. Database Schema
- ✅ Complete SQL schema in `supabase-splitwise-schema.sql`
- ✅ Tables: split_groups, group_members, group_expenses, expense_splits, group_messages
- ✅ Row Level Security policies configured
- ✅ Realtime subscriptions enabled

### 3. Splitwise Module
- ✅ Main Splitwise page at `/dashboard/splitwise`
- ✅ Group list sidebar with fund badges
- ✅ Group workspace with chat and summary tabs
- ✅ Real-time chat with AI expense parsing
- ✅ Expense confirmation cards
- ✅ Balance sheet with settle-up functionality
- ✅ Pie chart for spending visualization
- ✅ Group fund tracking
- ✅ Invite link generation and sharing
- ✅ Join via invite link flow

### 4. AI Integration
- ✅ Netlify serverless function at `netlify/functions/splitwise-ai.js`
- ✅ Claude Sonnet 4 integration
- ✅ Natural language expense parsing
- ✅ Support for regular and group fund expenses
- ✅ Multilingual support (English, Hindi, Hinglish)

### 5. UI Components
- ✅ GroupList
- ✅ GroupWorkspace
- ✅ ChatMessage (3 variants: chat, expense_log, ai_response)
- ✅ ExpenseConfirmCard
- ✅ GroupSummary (balance sheet + pie chart)
- ✅ CreateGroupModal
- ✅ JoinGroupModal

## 🚀 Setup Instructions

### Step 1: Database Setup
1. Open Supabase Dashboard → SQL Editor
2. Run the SQL script in `supabase-splitwise-schema.sql`
3. Verify all tables are created with RLS enabled

### Step 2: Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable Google provider
   - Add Client ID and Secret
5. In Auth Settings, add:
   - Site URL: `https://expense-tracker-rk-5.netlify.app`
   - Redirect URL: `https://expense-tracker-rk-5.netlify.app/auth/callback`

### Step 3: Environment Variables
Add to Netlify dashboard → Site settings → Environment variables:

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Step 4: Install Dependencies
```bash
npm install @anthropic-ai/sdk
```

Already installed: `recharts`, `@supabase/supabase-js`, `@supabase/ssr`

### Step 5: Deploy
```bash
npm run build
# Deploy to Netlify
```

## 📋 Features

### Natural Language Expense Parsing
Users can type expenses naturally:
- "I paid 1200 for dinner between me, Neha and Sam" → Split ₹400 each
- "We spent 500 from group fund on snacks" → Group fund −₹500
- "Ravi paid 3000 for hotel, split between all 4" → Ravi paid, others owe ₹750
- "Maine 500 ka petrol bhara" → Handles Hinglish

### Group Fund System
- Pre-collected pooled money tracking
- Separate from individual balances
- Expenses can be paid from group fund (no debts created)
- Visual fund balance indicator

### Balance Management
- Automatic calculation of who owes whom
- Net balance tracking (paid - owes)
- One-click settle up functionality
- Color-coded balances (green = owed, red = owes)

### Real-time Collaboration
- Live message updates
- Instant expense notifications
- Real-time balance sheet updates

### Invite System
- Unique invite tokens per group
- Share via link
- Auto-join on click
- Works with logged-out users (redirects to login)

## 🎨 Design System

### Colors
- Background: `#FAF7F2`
- Primary Brown: `#8B4513`
- Darker Brown: `#6B3410`
- Terracotta: `#D4956A`
- Light Beige: `#F5EFE6`
- Border: `#E8DDD0`
- Group Fund Gold: `#FFF3CD`

### Typography
- Headings: Playfair Display
- Body: DM Sans
- Currency: INR format with ₹ symbol

## 📱 Mobile Responsive
- Split panel collapses on mobile
- Touch-friendly buttons
- Optimized chat interface
- Responsive balance tables

## 🔒 Security
- Row Level Security (RLS) on all tables
- Users can only access groups they're members of
- Server-side API key storage
- Secure OAuth flow

## 🧪 Testing Checklist

### Login Flow
- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Signup with email works
- [ ] Google OAuth signup works
- [ ] Auth callback redirects correctly

### Group Management
- [ ] Create group with name only
- [ ] Create group with description
- [ ] Create group with initial fund
- [ ] Copy invite link
- [ ] Join group via invite link
- [ ] View group list

### Expense Management
- [ ] Add expense via natural language
- [ ] AI correctly parses equal splits
- [ ] AI correctly parses custom splits
- [ ] AI correctly identifies group fund expenses
- [ ] Confirm expense adds to database
- [ ] Expense appears in chat as expense_log
- [ ] Balance sheet updates correctly

### Chat
- [ ] Send regular messages
- [ ] Receive AI responses
- [ ] Real-time message updates
- [ ] Scroll to bottom on new messages

### Balance & Summary
- [ ] Balance sheet calculates correctly
- [ ] Net balances show correct sign
- [ ] Settle up marks splits as settled
- [ ] Pie chart displays correctly
- [ ] Group fund box shows when applicable

## 📝 Natural Language Examples

### Regular Expenses
```
"I paid 1200 for dinner with Neha and Sam"
"Ravi paid 3000 for hotel between all of us"
"Neha and I got coffee for 240, she paid"
"Split 800 taxi fare among everyone"
```

### Group Fund Expenses
```
"We spent 500 from group fund on snacks"
"Used 1200 from kitty for party decorations"
"Paid 800 from pool money for venue"
```

### Hinglish Support
```
"Maine 500 ka petrol bhara"
"Sabka 300 jama tha, usme se 800 kharcha hua"
"Dinner mein 1200 lagaye between me and Neha"
```

### Balance Queries
```
"Who owes me money?"
"What's my balance?"
"Summarize this month"
"Show all expenses"
```

## 🎯 Next Steps (Optional Enhancements)

1. **Receipt Upload**: Allow image uploads for expenses
2. **Expense Categories**: Tag expenses (food, travel, etc.)
3. **Export Data**: Download expense reports as CSV/PDF
4. **Push Notifications**: Notify users of new expenses
5. **Recurring Expenses**: Set up automatic splits for rent, subscriptions
6. **Multi-Currency**: Support USD, EUR, etc.
7. **Payment Integration**: Direct UPI/payment gateway integration

## 🐛 Troubleshooting

### AI Function Not Working
- Check `ANTHROPIC_API_KEY` is set in Netlify
- Verify function path is `/.netlify/functions/splitwise-ai`
- Check browser console for CORS errors

### Google OAuth Failing
- Verify redirect URIs match exactly (including https://)
- Check Supabase provider is enabled
- Ensure Site URL is set in Supabase Auth settings

### Realtime Not Working
- Verify tables are added to `supabase_realtime` publication
- Check RLS policies allow reading messages
- Ensure channel subscription is cleaned up on unmount

### Balance Calculation Issues
- Verify all expenses have `paid_by_name` set
- Check splits are linked to correct expense IDs
- Ensure `is_settled` flag is updated correctly

## 📞 Support

For issues or questions, check:
1. Browser console for errors
2. Supabase logs for database issues
3. Netlify function logs for AI errors
4. Network tab for failed requests

---

Built with ❤️ using Next.js, Supabase, Anthropic Claude, and Recharts
