# RFin Payment Requests & Settlement Feature

## 🎯 What's New

You now have professional payment management features:

1. **Smart Expense Parsing** - "I paid 500 for dinner split with Krisha" → automatically parsed
2. **Payment Requests** - Send reminders to people who owe you
3. **Settlement Confirmation** - Two-sided payment confirmation (payer + payee)
4. **Profile Management** - Edit your display name
5. **Group Fund Tracking** - Separate tracking for group fund expenses

---

## 🚀 Getting Started

### Step 1: Database Migration (REQUIRED)
```bash
# Open Supabase Dashboard
# Go to: SQL Editor → New Query
# Paste contents of: supabase-payment-requests-schema.sql
# Click Execute
```

### Step 2: Test It Out
Go to a group and try these in chat:
- "I paid 500 for dinner split with Krisha"
- "from group fund 1000 for supplies"
- "Arjun paid 300 for groceries divide among all"

### Step 3: Use Balance Sheet Buttons
- Click **"Request"** to ask someone for money
- Click **"Pay"** to settle a payment
- Confirm the settlement when prompted

---

## 📖 How Each Feature Works

### 1. Smart Expense Parsing

**What you type:**
```
"I paid 500 for dinner split with Krisha and Arjun"
```

**What happens:**
- Amount: ₹500 detected
- Payer: You
- Split: Equally among 3 people → ₹167 each
- Debts created for Krisha and Arjun

**Other examples:**
```
"from group fund spent 10000 for supplies"
→ Deducts from group fund, no individual debts

"Krisha paid 2000 for groceries divide among all members"
→ Krisha is payer, split among all

"I spent 300 and another 200 split equally"
→ Two separate expenses parsed
```

### 2. Balance Sheet Logic

**The "Request" Button**
- Shows when: Someone owes you OR you're owed
- Does: Sends them a payment reminder
- They see: Notification on their home page

**The "Pay" Button**
- Shows when: You owe someone
- Does: Marks payment as sent (awaiting their confirmation)
- They see: "X says they paid ₹Y - Confirm?"

**Example Balance Sheet:**
```
Member  │ Paid   │ Owes   │ Net    │ Action
──────────────────────────────────────────
You     │ ₹2000  │ ₹500   │ +₹1500 │ [Request] → Ask for your money
Krisha  │ ₹500   │ ₹1500  │ -₹1000 │ [Pay]     → Send her money
Arjun   │ ₹1000  │ ₹1000  │ ₹0     │ —         → Settled
```

### 3. Payment Request Flow

**Step 1: You send request**
- Balance Sheet → Click "Request" on someone's row
- Notification created

**Step 2: They see it**
- Home page shows: "You is requesting ₹500 from you"
- Click [Pay Now]

**Step 3: They confirm payment**
- Dialog: "[You] says they have paid ₹500"
- Click [Accept] or [Reject]

**Step 4: You see confirmation**
- Get notified: "[Krisha] confirmed payment"
- Balance updated to "Settled ✓"

### 4. Settlement Confirmation (Two-Sided)

Why it matters: Prevents accidental payments from being marked settled too early.

**The flow:**
1. Payer clicks "Pay" → sends ₹X
2. Payee sees notification with [Accept] [Reject]
3. If Accept → both see "Settled ✓"
4. If Reject → payer knows to follow up

### 5. Profile Name Editor

**How to use:**
1. Go to your profile page
2. Click edit pencil next to your name
3. Type new name
4. Press Enter or click Save

**Why it matters:**
- Group members see your real name in balance sheet
- Your name appears on all transactions

---

## 🎓 Usage Examples

### Example 1: Split Dinner
```
You: "I paid 1500 for dinner, split with Krisha and Arjun"

AI parses:
- Type: Split
- Amount: 1500
- Payer: You
- Each person owes: 500

Balance Sheet:
You:    +1000 [Request]
Krisha: -500  [Pay]
Arjun:  -500  [Pay]
```

### Example 2: Group Fund
```
You: "from group fund 5000 for office supplies"

AI parses:
- Type: Group Fund
- Amount: 5000
- Deducts from group fund
- NO individual debts

What you see: Yellow badge "Paid from Group Fund"
What happens: Group fund balance goes down by 5000
```

### Example 3: Multiple Expenses
```
You: "I spent 200 for coffee and another 300 for lunch, divide among everyone"

AI parses:
- Expense 1: 200 split among all
- Expense 2: 300 split among all
- Creates debts for both
```

---

## 🔄 Complete Settlement Scenario

**Day 1:**
- You pay ₹500 for group lunch
- Add to group: "I paid 500 for lunch split among all 5 people"
- Krisha's balance: -₹100 [Pay]

**Day 2:**
- You go to Balance Sheet
- Click [Request] on Krisha's row
- Krisha gets notification: "You is requesting ₹100"

**Day 3:**
- Krisha receives money (UPI/cash)
- She opens RFin
- Clicks [Pay] in notification
- She sends ₹100 through preferred method
- System shows: "Krisha says they have paid ₹100"
- She clicks [Accept Payment Confirmation]
- ✓ Both see "Settled ✓"

---

## 📊 Balance Sheet Reference

### Understanding Your Balance

**Net = Paid - Owes**

- **Positive net** (green): You are OWED money
  - Example: +₹200 means someone owes you ₹200
  - Click "Request" to ask for it

- **Negative net** (red): You OWE money
  - Example: -₹200 means you owe ₹200
  - Click "Pay" to send the money

- **Zero net** (gray): All settled
  - No outstanding debts
  - Shows "Settled ✓"

### Action Buttons

**On your own row:**
- If owed: Show [Request] → Ask for your money
- If owing: No button (see Pay on their row)

**On others' rows:**
- If they owe: Show [Pay] → Send them money
- If owed to them: Show [Request] → Ask them
- If settled: No button

---

## 🎯 Best Practices

1. **Add expenses immediately** - Easier to remember details
2. **Use natural language** - No special syntax needed
3. **Confirm settlements** - Payee should confirm to avoid disputes
4. **Update your name** - Helps others identify you
5. **Use group fund** for shared expenses like group events

---

## ⚙️ Technical Details

### What Gets Stored

**Payment Requests Table:**
- Who requested
- Who it's from
- Amount
- Group
- Status (pending/confirmed)
- Timestamp

**Settlements Table:**
- Payer & Payee
- Amount
- Both must confirm
- Confirmation dates

**Notifications Table:**
- User receiving
- Type (request/settlement/etc)
- Message & metadata
- Read status

### Security

- ✅ Only see notifications sent to you
- ✅ Only create requests in groups you're in
- ✅ Only confirm settlements you're part of
- ✅ All requests require authentication

---

## 🆘 Troubleshooting

**Q: "I sent a payment request but they didn't get a notification"**
A: Check:
1. Their user ID is correct
2. They're a member of the group
3. Database migration was run

**Q: "Settlement not confirming"**
A: Make sure:
1. Payee is clicking the correct button
2. They're logged in to their account
3. Database tables exist (run migration)

**Q: "Expense not parsing correctly"**
A: Try:
1. Use simpler language: "I paid 500 for lunch split with Krisha"
2. Use standard number format: ₹500 or 500
3. Be explicit about split: "split with X and Y"

**Q: "My name not updating in group"**
A: Try:
1. Refresh the page
2. Check profile page - name is actually saved
3. Rejoin the group to refresh cache

---

## 📚 More Information

- **Detailed Setup**: See `IMPLEMENTATION_CHECKLIST.md`
- **Full Documentation**: See `PAYMENT_REQUESTS_IMPLEMENTATION.md`
- **Technical Summary**: See `IMPLEMENTATION_SUMMARY.md`

---

## 🚀 Coming Soon

- Email notifications for payment requests
- Payment history and receipts
- Bulk settlements
- UPI payment integration
- Analytics dashboard

---

## 💬 Questions?

Check the documentation files or review the API endpoints in:
- `app/api/payments/request/route.ts` - Payment requests
- `app/api/payments/settle/route.ts` - Settlement confirmations
- `lib/expense-parser.ts` - Expense parsing logic

**Last updated:** June 3, 2026
