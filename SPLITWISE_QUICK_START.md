# RFin Splitwise - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Run Database Schema (2 minutes)
```sql
-- Copy and paste the entire contents of supabase-splitwise-schema.sql
-- Into Supabase Dashboard → SQL Editor → New Query → Run
```

### 2. Set Environment Variable (1 minute)
In Netlify Dashboard → Site settings → Environment variables → Add:
```
ANTHROPIC_API_KEY=sk-ant-api-03-YOUR-KEY-HERE
```

### 3. Configure Google OAuth (2 minutes)
**Supabase Dashboard:**
1. Go to Authentication → Providers → Google → Enable
2. Add your Google Client ID and Secret from Google Cloud Console
3. In Auth Settings → URL Configuration:
   - Site URL: `https://expense-tracker-rk-5.netlify.app`
   - Redirect URLs: `https://expense-tracker-rk-5.netlify.app/auth/callback`

**Google Cloud Console:**
1. Go to APIs & Services → Credentials
2. Add Authorized redirect URI: 
   ```
   https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback
   ```

### 4. Deploy
```bash
npm run build
# Push to Git → Netlify auto-deploys
```

## ✅ Verification

### Test Login
1. Go to `/auth/login`
2. Try Google OAuth → Should redirect to Google → Back to dashboard
3. Try email login → Should work

### Test Splitwise
1. Go to `/dashboard/splitwise`
2. Click "+ New" → Create a group
3. Copy invite link → Open in incognito → Should join group
4. Type: "I paid 500 for lunch between me and John"
5. AI should detect expense → Confirm → Should appear in chat

## 🎯 Quick Test Script

```
1. Create group "Test Group"
2. In chat, type: "I paid 1000 for dinner with Alice"
3. Confirm the expense
4. Click "Summary" tab → Should see balance sheet
5. Alice should owe ₹500, you should be +₹500
```

## 📝 Sample Expenses to Try

```
"I paid 1200 for dinner between me, Neha and Sam"
"We spent 500 from group fund on snacks"
"Ravi paid 3000 for hotel split among 4 of us"
"Maine 500 ka petrol bhara" (Hinglish)
"Who owes me money?" (Balance query)
```

## 🐛 Common Issues

**Issue:** Google OAuth shows "redirect_uri_mismatch"
**Fix:** Check that redirect URI in Google Console EXACTLY matches Supabase's auth callback URL

**Issue:** AI not responding
**Fix:** Check ANTHROPIC_API_KEY is set in Netlify (not in .env.local)

**Issue:** Can't see Splitwise in sidebar
**Fix:** Refresh page, dashboard nav should show "👥 Splitwise" item

**Issue:** Realtime not working
**Fix:** Check supabase-splitwise-schema.sql was run completely (including ALTER PUBLICATION)

## 📱 Mobile Test
1. Open on phone
2. Login should show only right panel (form)
3. Splitwise should be touch-friendly
4. Chat input should resize correctly

## ✨ Features to Demo

1. **Natural Language**: "I paid 500 for lunch with John and Alice"
2. **Group Fund**: "We spent 300 from group fund on snacks"
3. **Hinglish**: "Maine 200 ka chai piya"
4. **Balance Query**: "What's my balance?"
5. **Real-time**: Open group in two browsers, send message in one
6. **Invite**: Copy link, open in incognito, auto-join group

---

**Everything is ready to use!** Just run the SQL schema and set the API key. 🎉
