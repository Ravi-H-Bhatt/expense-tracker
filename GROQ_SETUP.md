# Groq API Setup for RFin Splitwise

## ✅ Switched to Groq (Llama 3.3 70B)

The Splitwise AI function now uses **Groq** instead of Anthropic Claude.

### Why Groq?
- ✅ **Free tier**: 30 requests/minute
- ✅ **Fast**: Extremely low latency
- ✅ **Powerful**: Llama 3.3 70B model
- ✅ **No credit card required** for basic usage

---

## 🔑 Get Your Groq API Key (2 minutes)

### Step 1: Sign Up
1. Go to https://console.groq.com/
2. Click **Sign Up** or **Sign In**
3. Create an account (free)

### Step 2: Create API Key
1. After signing in, go to **API Keys** (in the left sidebar)
2. Click **Create API Key**
3. Give it a name: `RFin Splitwise`
4. Click **Submit**
5. **Copy the API key** (starts with `gsk_...`)
   - ⚠️ **Important**: Save it immediately, you won't see it again!

---

## 📝 Add to Netlify (1 minute)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: **expense-tracker-rk-5**
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Set:
   - **Key**: `GROQ_API_KEY`
   - **Value**: `gsk_...` (paste your key)
   - **Scopes**: Check all boxes
6. Click **Create variable**

---

## 🎯 What Changed

### Updated Files:
- ✅ `netlify/functions/splitwise-ai.js` - Now uses Groq SDK
- ✅ Removed `@anthropic-ai/sdk` dependency
- ✅ Using `groq-sdk` (already installed)
- ✅ Model: `llama-3.3-70b-versatile`

### Environment Variable:
- ❌ ~~ANTHROPIC_API_KEY~~ (removed)
- ✅ **GROQ_API_KEY** (new)

---

## 🧪 Test After Deployment

After you deploy, test with these messages in Splitwise chat:

```
"I paid 1000 for dinner with Alice"
"We spent 500 from group fund on snacks"
"Maine 500 ka petrol bhara"
```

Groq should respond within 1-2 seconds with parsed expense data.

---

## 📊 Groq Free Tier Limits

- **30 requests per minute**
- **14,400 requests per day**
- **6,000 tokens per minute**

This is **more than enough** for a personal expense tracker!

---

## ⚡ Performance

Groq is significantly **faster** than most AI APIs:
- **Response time**: ~500ms (vs 2-3s for Claude)
- **Token throughput**: Very high

Your users will notice the speed difference! 🚀

---

## 🔄 Migration Complete

No other changes needed. The system prompt and parsing logic remain the same - only the underlying API changed.

**Next step:** Add `GROQ_API_KEY` to Netlify and deploy!
