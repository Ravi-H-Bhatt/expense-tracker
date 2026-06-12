# Vercel Deployment Checklist

## Your Vercel URL
Replace `YOUR_VERCEL_URL` below with your actual Vercel deployment URL (e.g., `https://expense-tracker-ravi5.vercel.app`)

---

## ✅ 1. Supabase Configuration

### Go to: Supabase Dashboard → Your Project → Authentication → URL Configuration

**Site URL:**
```
YOUR_VERCEL_URL
```

**Redirect URLs (add all):**
```
YOUR_VERCEL_URL/auth/callback
YOUR_VERCEL_URL/dashboard
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
```

---

## ✅ 2. Vercel Environment Variables

### Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Make sure these are set (copy from Netlify or your local `.env.local`):

### Required Variables:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI
GROQ_API_KEY=your_groq_api_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@rfin.app

# App URL (UPDATE THIS!)
NEXT_PUBLIC_APP_URL=YOUR_VERCEL_URL
```

**After adding/updating variables, you MUST redeploy:**
- Go to **Deployments** tab
- Click the ⋯ menu on latest deployment
- Click **Redeploy**

---

## ✅ 3. GitHub OAuth (if you use it)

### Go to: GitHub → Settings → Developer settings → OAuth Apps → Your App

**Homepage URL:**
```
YOUR_VERCEL_URL
```

**Authorization callback URL:**
```
YOUR_VERCEL_URL/auth/callback
```

---

## ✅ 4. Test Authentication Flow

1. Visit `YOUR_VERCEL_URL`
2. Try **Sign Up** with a new email
3. Check email for verification link
4. Verify the link redirects to `YOUR_VERCEL_URL/auth/callback`
5. Try **Login** with existing account
6. Test the splitwise AI: create a group, send "I paid 500 for dinner"

---

## Common Issues

### Issue: "Auth session missing" or infinite redirects
**Fix:** Make sure `NEXT_PUBLIC_APP_URL` is set in Vercel and you've redeployed

### Issue: Email links go to old Netlify URL
**Fix:** Update Supabase Site URL and Redirect URLs (step 1)

### Issue: Changes not reflecting
**Fix:** Redeploy in Vercel after changing environment variables

### Issue: 500 error on /api routes
**Fix:** Check Vercel Functions logs (Dashboard → Your Project → Logs)
