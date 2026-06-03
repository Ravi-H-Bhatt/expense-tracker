# RFin Splitwise - Quick Reference Card

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| Live App | https://expense-tracker-rk-5.netlify.app |
| Login | https://expense-tracker-rk-5.netlify.app/auth/login |
| Splitwise | https://expense-tracker-rk-5.netlify.app/dashboard/splitwise |
| Join Group | https://expense-tracker-rk-5.netlify.app/join/[TOKEN] |
| Supabase Dashboard | https://supabase.com/dashboard |
| Netlify Dashboard | https://app.netlify.com |
| Google Cloud Console | https://console.cloud.google.com |
| Anthropic Console | https://console.anthropic.com |

---

## ⚙️ Environment Variables

```bash
# Netlify Environment Variables (Required)
ANTHROPIC_API_KEY=sk-ant-api-03-...

# Should already exist
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 Natural Language Examples

### Equal Splits
```
"I paid 1200 for dinner between me, Neha and Sam"
"Split 800 taxi fare among everyone"
"Ravi paid 3000 for hotel between all of us"
```

### Custom Splits
```
"I paid 1000, Neha owes 60%, I owe 40%"
"Split 1500: Me 500, Alice 600, Bob 400"
```

### Group Fund
```
"We spent 500 from group fund on snacks"
"Used 1200 from kitty for decorations"
"Paid 800 from pool money"
```

### Hinglish Support
```
"Maine 500 ka petrol bhara"
"Dinner mein 1200 lagaye"
"Sabka 300 jama tha, 800 kharcha hua"
```

### Queries
```
"Who owes me money?"
"What's my balance?"
"Summarize this month"
```

### Settlement
```
"Neha settled with me"
"Mark Alice as paid"
```

---

## 🗂️ Database Tables

| Table | Purpose |
|-------|---------|
| `split_groups` | Group info + invite tokens |
| `group_members` | User memberships |
| `group_expenses` | Expense records |
| `expense_splits` | Individual amounts owed |
| `group_messages` | Chat messages (3 types) |

---

## 🎨 Color Palette

```css
Background:     #FAF7F2
Primary:        #8B4513
Dark Brown:     #6B3410
Terracotta:     #D4956A
Light Beige:    #F5EFE6
Border:         #E8DDD0
Text Dark:      #1A1208
Text Medium:    #6B5744
Text Muted:     #A89880
Group Fund:     #FFF3CD
```

---

## 🔧 Common Commands

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Build
npm run build

# Run locally
npm run dev

# Deploy (via Git)
git push origin main
```

---

## 📱 Component Structure

```
Splitwise Page
├── GroupList (left sidebar)
│   └── Group cards with fund badges
└── GroupWorkspace (main area)
    ├── Top bar (name, members, invite)
    ├── Tabs (Chat | Summary)
    ├── Chat Tab
    │   ├── ChatMessage (3 types)
    │   ├── ExpenseConfirmCard
    │   └── Input area
    └── Summary Tab
        ├── Group fund box
        ├── Balance sheet
        ├── Pie chart
        └── Recent expenses
```

---

## 🔐 OAuth Redirect URIs

### Google Console (Authorized Redirect URIs)
```
https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback
```

### Supabase Auth URLs
```
Site URL:
https://expense-tracker-rk-5.netlify.app

Redirect URLs:
https://expense-tracker-rk-5.netlify.app/auth/callback
http://localhost:3000/auth/callback
```

---

## 🎯 Quick Test Script

```
1. Login with Google
2. Go to Splitwise
3. Create group "Test"
4. Chat: "I paid 1000 for dinner with Alice"
5. Confirm expense
6. Check Summary → Balance should show split
7. Copy invite link → Open incognito → Join
8. Chat: "We spent 500 from group fund"
9. Check fund decreased to 500
10. Test real-time: Open 2 browsers, send message
```

---

## 🐛 Quick Fixes

| Problem | Solution |
|---------|----------|
| Google OAuth error | Check redirect URI matches exactly |
| AI not responding | Add ANTHROPIC_API_KEY in Netlify |
| Can't join group | Run database schema in Supabase |
| Balance wrong | Check expense splits in database |
| Realtime not working | Add tables to supabase_realtime publication |
| Build fails | Run `npm run type-check` for errors |

---

## 📊 Message Types

| Type | Purpose | Display |
|------|---------|---------|
| `chat` | User messages | Bubbles (left/right) |
| `expense_log` | Confirmed expenses | Full-width cards |
| `ai_response` | AI replies | Left-aligned with icon |

---

## 💡 Pro Tips

1. **Invite Links:** Each group has unique token, never expires
2. **Group Fund:** Only use if money already collected
3. **Settle Up:** One-click marks all splits as settled
4. **Natural Language:** AI understands Hindi, English, Hinglish
5. **Real-time:** Up to 10 people can collaborate live
6. **Mobile:** Split panel collapses on small screens
7. **Balance Colors:** Green = you're owed, Red = you owe

---

## 📚 Documentation Files

- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `SPLITWISE_README.md` - Detailed guide
- `SPLITWISE_QUICK_START.md` - 5-minute setup
- `DEPLOYMENT_STEPS.md` - Step-by-step deployment
- `QUICK_REFERENCE.md` - This file
- `supabase-splitwise-schema.sql` - Database schema
- `.env.splitwise.example` - Env vars template

---

## 🎉 Key Features

✅ Google OAuth + Email login
✅ AI expense parsing (Claude Sonnet 4)
✅ Real-time chat & updates
✅ Group fund tracking
✅ Balance calculations
✅ Settle up functionality
✅ Pie chart visualization
✅ Invite system
✅ Mobile responsive
✅ Multilingual support

---

**Need help?** Check the detailed docs or browser console for errors.

**Ready to deploy?** Follow `DEPLOYMENT_STEPS.md`

**Everything works?** Share with your team! 🚀
