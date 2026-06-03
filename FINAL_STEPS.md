# 🚀 Final Steps - RFin Splitwise Deployment

## ✅ What's Done
- ✅ Code pushed to GitHub
- ✅ Netlify will auto-deploy (check: https://app.netlify.com/sites/expense-tracker-rk-5/deploys)
- ✅ Google OAuth configured in Supabase

---

## ⚡ URGENT: Add Groq API Key to Netlify (1 minute)

**Your Groq API Key:** (check your Groq console at https://console.groq.com)

### Steps:
1. Go to https://app.netlify.com/sites/expense-tracker-rk-5/configuration/env
2. Find the existing **GROQ_API_KEY** variable
3. Edit it and update the value with your Splitwise Groq key
4. Make sure **all scopes are checked** (Production, Deploy Previews, Branch deploys)
5. Click **"Save"**
6. **Important:** Trigger a redeploy after updating:
   - Go to Deploys tab
   - Click "Trigger deploy" → "Deploy site"

---

## 📊 Run Database Schema (5 minutes)

1. Go to https://supabase.com/dashboard
2. Open your RFin project
3. Go to **SQL Editor**
4. Click **"New Query"**
5. Open file: `supabase-splitwise-schema.sql`
6. Copy **entire contents**
7. Paste into SQL Editor
8. Click **"Run"**
9. Wait for "Success" message

---

## 🔗 Configure Supabase Auth URLs (2 minutes)

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL**:
   ```
   https://expense-tracker-rk-5.netlify.app
   ```
3. Add **Redirect URLs** (click "Add URL" for each):
   ```
   https://expense-tracker-rk-5.netlify.app/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **"Save"**

---

## 🧪 Test After Deployment Completes

### 1. Test Login
1. Go to: https://expense-tracker-rk-5.netlify.app/auth/login
2. Click "Continue with Google"
3. Should redirect to Google → back to dashboard

### 2. Test Splitwise
1. In dashboard, click **"Splitwise"** in sidebar
2. Click **"+ New"**
3. Create group: "Test Group"
4. In chat, type: `I paid 1000 for dinner with Alice`
5. AI should respond in 1-2 seconds
6. Confirm the expense
7. Check Summary tab → balance should show splits

---

## 🎯 Deployment Timeline

**Current Status:** Code is pushing to GitHub now

**Timeline:**
- ⏱️ **Now**: GitHub push complete
- ⏱️ **+1 min**: Netlify detects push, starts build
- ⏱️ **+3-5 min**: Build completes, site deploys
- ⏱️ **+6 min**: Site is live!

**Monitor deployment:**
https://app.netlify.com/sites/expense-tracker-rk-5/deploys

---

## 🚨 If Deployment Fails

Check Netlify deploy logs for errors. Common issues:

1. **Missing GROQ_API_KEY**: Add it in environment variables
2. **Build error**: Check the logs, likely a dependency issue
3. **Function error**: Check that groq-sdk is installed

---

## 📋 Quick Checklist

- [ ] Add `GROQ_API_KEY` to Netlify
- [ ] Trigger redeploy after adding key
- [ ] Run `supabase-splitwise-schema.sql` in Supabase
- [ ] Configure Auth URLs in Supabase
- [ ] Wait for deployment to complete
- [ ] Test Google login
- [ ] Test Splitwise AI chat

---

## ✨ You're Almost There!

Just add the API key to Netlify, run the SQL schema, and wait for deployment!

**Estimated time to completion: 10 minutes**
