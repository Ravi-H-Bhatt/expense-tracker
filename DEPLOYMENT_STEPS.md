# RFin Splitwise - Complete Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Code Implementation (All Complete)
- [x] Login page redesigned with split-panel layout
- [x] Signup page redesigned
- [x] Google OAuth integration
- [x] Auth callback route
- [x] Splitwise module (all 7 components)
- [x] Database schema prepared
- [x] AI Netlify function created
- [x] Sidebar updated with Splitwise link
- [x] TypeScript compilation successful
- [x] Next.js build successful

---

## 🚀 Deployment Steps (Follow in Order)

### Step 1: Database Setup (5 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → **SQL Editor**
3. Click **New Query**
4. Open `supabase-splitwise-schema.sql` file
5. Copy the **entire** contents
6. Paste into SQL Editor
7. Click **Run**
8. Verify success message appears

**Verify:**
```sql
-- Run this to check tables were created:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'split_groups', 
  'group_members', 
  'group_expenses', 
  'expense_splits', 
  'group_messages'
);
-- Should return 5 rows
```

---

### Step 2: Google OAuth Configuration (10 minutes)

#### A. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add **Authorized redirect URIs**:
   ```
   https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback
   ```
   Replace `YOUR-SUPABASE-PROJECT` with your actual project ID
7. Click **Create**
8. **Copy the Client ID and Client Secret** (you'll need these)

#### B. Supabase Configuration

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Authentication** → **Providers**
3. Find **Google** and click to expand
4. Toggle **Enable** to ON
5. Paste the **Client ID** from Google
6. Paste the **Client Secret** from Google
7. Click **Save**

#### C. Auth URL Configuration

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set **Site URL**:
   ```
   https://expense-tracker-rk-5.netlify.app
   ```
3. Add **Redirect URLs** (click Add URL for each):
   ```
   https://expense-tracker-rk-5.netlify.app/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

---

### Step 3: Anthropic API Key (2 minutes)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in / Create account
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-api-03-...`)
6. **Save it securely** - you'll add it to Netlify next

---

### Step 4: Netlify Environment Variables (3 minutes)

1. Open [Netlify Dashboard](https://app.netlify.com)
2. Select your site (**expense-tracker-rk-5**)
3. Go to **Site settings** → **Environment variables**
4. Add these variables:

**Add ANTHROPIC_API_KEY:**
- Key: `ANTHROPIC_API_KEY`
- Value: `sk-ant-api-03-...` (your key from Step 3)
- Scopes: Production, Deploy Previews, Branch Deploys
- Click **Create variable**

**Verify existing variables are set:**
- `NEXT_PUBLIC_SUPABASE_URL` ✓ (should already exist)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓ (should already exist)

---

### Step 5: Deploy to Production (5 minutes)

#### Option A: Git Push (Recommended)

```bash
# In your project directory
git add .
git commit -m "Add Splitwise module with Google OAuth and AI integration"
git push origin main
```

Netlify will automatically detect the push and deploy.

#### Option B: Manual Deploy

```bash
npm run build
# Upload .next folder to Netlify manually
```

---

### Step 6: Post-Deployment Verification (10 minutes)

#### A. Test Login Flow

1. Go to `https://expense-tracker-rk-5.netlify.app/auth/login`
2. Check the page design:
   - [ ] Split-panel layout visible (desktop)
   - [ ] Left panel has gradient background
   - [ ] Right panel has login form
   - [ ] Google button is prominent and styled correctly
3. Click **Continue with Google**
   - [ ] Should redirect to Google login
   - [ ] After Google auth, should redirect back to `/dashboard`
4. Sign out and test email login
   - [ ] Email/password login works
   - [ ] Redirects to dashboard

#### B. Test Splitwise Module

1. In dashboard, click **Splitwise** in sidebar
   - [ ] Should navigate to `/dashboard/splitwise`
   - [ ] Should show empty state "Select a group to start"

2. Click **+ New** button
   - [ ] Modal appears
   - [ ] Create group form is visible

3. Create a test group:
   - Name: "Test Group"
   - Description: "Testing Splitwise"
   - Fund: 1000
   - [ ] Click "Create Group →"
   - [ ] Should show success with invite link
   - [ ] Copy invite link

4. Open invite link in **incognito/private window**:
   - [ ] Should redirect to login if not authenticated
   - [ ] After login, should join group automatically
   - [ ] Should redirect to `/dashboard/splitwise`

5. Test AI expense parsing:
   - In chat, type: `I paid 1000 for dinner with Alice`
   - [ ] AI should respond within 2-3 seconds
   - [ ] Should show expense confirmation card
   - [ ] Card shows ₹1000, split ₹500 each
   - [ ] Click "Add to Group"
   - [ ] Expense appears in chat as expense_log card

6. Test Summary tab:
   - Click **Summary** tab
   - [ ] Balance sheet shows correct data
   - [ ] You: +₹500, Alice: -₹500
   - [ ] Pie chart displays
   - [ ] Group fund box shows ₹1000

7. Test group fund expense:
   - Back to Chat tab
   - Type: `We spent 500 from group fund on snacks`
   - [ ] AI detects group fund expense
   - [ ] Confirm expense
   - [ ] Group fund decreases to ₹500
   - [ ] No debts created in balance sheet

#### C. Test Real-time Features

1. Open same group in **two different browsers**
2. Send message in Browser 1
   - [ ] Message appears in Browser 2 instantly
3. Add expense in Browser 1
   - [ ] Expense appears in Browser 2 chat
   - [ ] Balance sheet updates in Browser 2

#### D. Test Mobile Responsiveness

1. Open on mobile device or use browser DevTools mobile view
2. Login page:
   - [ ] Left panel hidden on mobile
   - [ ] Right panel full width
   - [ ] Form fields easy to tap
3. Splitwise page:
   - [ ] Group list accessible
   - [ ] Chat interface touch-friendly
   - [ ] Buttons have proper spacing

---

### Step 7: Natural Language Testing

Test these expressions in the chat (should all parse correctly):

```
✅ "I paid 1200 for dinner between me, Neha and Sam"
   → Split: You ₹400, Neha ₹400, Sam ₹400

✅ "We spent 500 from group fund on snacks"
   → Group fund expense, no debts

✅ "Ravi paid 3000 for hotel split among 4 of us"
   → Ravi paid ₹3000, others owe ₹750 each

✅ "Neha and I got coffee for 240, she paid"
   → Neha paid ₹240, you owe ₹120

✅ "Maine 500 ka petrol bhara" (Hinglish)
   → You paid ₹500, split among group

✅ "Who owes me money?" (Query)
   → AI responds with balance summary

✅ "Neha settled with me" (Settlement)
   → AI confirms, doesn't create expense
```

---

## 🐛 Troubleshooting

### Issue: Google OAuth shows "redirect_uri_mismatch"

**Cause:** Redirect URI in Google Console doesn't match Supabase's auth callback URL

**Fix:**
1. Check your Supabase project URL: `https://YOUR-PROJECT.supabase.co`
2. In Google Console, verify redirect URI is EXACTLY:
   ```
   https://YOUR-PROJECT.supabase.co/auth/v1/callback
   ```
3. Note: Must include `https://` and `/auth/v1/callback`

---

### Issue: AI not responding / Timeout

**Cause:** ANTHROPIC_API_KEY not set or invalid

**Fix:**
1. Go to Netlify → Site settings → Environment variables
2. Check `ANTHROPIC_API_KEY` exists
3. Verify it starts with `sk-ant-api-03-`
4. If missing, add it (see Step 4)
5. After adding, trigger a new deploy:
   ```bash
   git commit --allow-empty -m "Trigger deploy"
   git push
   ```

---

### Issue: "Invalid or expired invite link"

**Cause:** Database schema not run, or group doesn't exist

**Fix:**
1. Verify database schema was run (Step 1)
2. Check Supabase → Table Editor → `split_groups` exists
3. Create a new group and generate fresh invite link

---

### Issue: Expenses not appearing in chat

**Cause:** Realtime subscriptions not enabled

**Fix:**
1. In Supabase SQL Editor, run:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE group_expenses;
   ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;
   ```
2. Refresh the page

---

### Issue: Balance calculations incorrect

**Cause:** Splits not linked to expenses properly

**Fix:**
1. Check in Supabase → `expense_splits` table
2. Verify `expense_id` matches records in `group_expenses`
3. Try creating a fresh expense

---

### Issue: Can't see Splitwise in sidebar

**Cause:** Cache or build issue

**Fix:**
1. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. If still not visible, check deployment logs in Netlify

---

## 📊 Success Metrics

After deployment, verify these work:

- [ ] Login with Google OAuth
- [ ] Login with email/password  
- [ ] Signup flow
- [ ] Create group
- [ ] Join via invite link
- [ ] Send chat message
- [ ] AI parses expense correctly
- [ ] Confirm expense adds to database
- [ ] Balance sheet calculates correctly
- [ ] Pie chart renders
- [ ] Group fund tracking works
- [ ] Real-time updates work
- [ ] Mobile layout responsive
- [ ] Settle up functionality works

**All checked?** ✅ **Deployment successful!**

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Anthropic API Docs:** https://docs.anthropic.com
- **Google OAuth Guide:** https://developers.google.com/identity/protocols/oauth2
- **Netlify Functions:** https://docs.netlify.com/functions/overview/
- **Next.js App Router:** https://nextjs.org/docs/app

---

## 🎉 You're Done!

If all verification steps pass, your RFin Splitwise module is **live and ready to use!**

Share the app with your team and start tracking expenses with AI-powered natural language parsing.

Happy splitting! 💸✨
