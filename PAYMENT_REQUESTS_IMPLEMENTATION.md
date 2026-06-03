# Payment Requests & Settlement Implementation Guide

This document describes the complete implementation of payment requests, two-sided settlements, and profile management features for the RFin Expense Tracker.

## Table of Contents
1. [Database Schema](#database-schema)
2. [AI Expense Parsing](#ai-expense-parsing)
3. [Balance Sheet Logic](#balance-sheet-logic)
4. [Payment Request Flow](#payment-request-flow)
5. [Two-Sided Settlement](#two-sided-settlement)
6. [Profile Management](#profile-management)
7. [Group Fund Tracking](#group-fund-tracking)
8. [Email Notifications](#email-notifications-todo)

---

## Database Schema

### New Tables
Three new tables have been created to support payment requests and settlements:

#### `payment_requests`
```sql
- id (UUID): Primary key
- from_user_id (UUID): User making the request
- to_user_id (UUID): User being requested from (debtor)
- amount (NUMERIC): Amount being requested
- group_id (UUID): Associated group
- status (TEXT): 'pending' | 'pending_confirmation' | 'accepted' | 'rejected' | 'expired'
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `settlements`
```sql
- id (UUID): Primary key
- payer_id (UUID): User making the payment
- payee_id (UUID): User receiving the payment
- amount (NUMERIC): Amount being settled
- group_id (UUID): Associated group
- status (TEXT): 'pending_confirmation' | 'confirmed' | 'rejected'
- payer_confirmed (BOOLEAN): Payer confirmed payment sent
- payee_confirmed (BOOLEAN): Payee confirmed payment received
- confirmed_at (TIMESTAMPTZ): When settlement was confirmed by both parties
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### `notifications`
```sql
- id (UUID): Primary key
- user_id (UUID): User receiving the notification
- type (TEXT): 'payment_request' | 'settlement_pending' | 'settlement_confirmed' | 'payment_reminder'
- title (TEXT): Notification title
- message (TEXT): Notification message
- group_id (UUID): Associated group
- from_user_id (UUID): User initiating the action
- amount (NUMERIC): Amount involved
- status (TEXT): 'unread' | 'read' | 'actioned'
- metadata (JSONB): Additional context
- created_at (TIMESTAMPTZ)
- read_at (TIMESTAMPTZ)
```

### Setup Instructions

**Run this SQL in Supabase:**
```bash
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Create a new query and copy the contents of:
#    supabase-payment-requests-schema.sql
# 4. Execute the query
```

---

## AI Expense Parsing

The new `lib/expense-parser.ts` module handles complex natural language parsing with these rules:

### Parsing Rules

#### 1. **Multi-Expense Detection**
Single message with multiple expenses:
```
Input: "from group fund spent 10000 and another 2000 spent by me divide among all"
→ Expense 1: {type: "group_fund", amount: 10000}
→ Expense 2: {type: "split", amount: 2000, paidBy: "me", splitAmong: "all"}
```

#### 2. **Group Fund Expenses**
Keywords: "from group fund", "paid from group fund", "group fund used", "group fund expense"
```
Input: "from group fund spent 5000 for team lunch"
→ {
    type: "group_fund",
    amount: 5000,
    description: "team lunch",
    paidFromFund: true,
    debts: [] // No individual debts created
}
```

#### 3. **Split Expenses**
Keywords: "split", "divide", "split among", "split with", "all members"
```
Input: "I paid 3000 for dinner split among Krisha, Arjun, and me"
→ {
    type: "split",
    amount: 3000,
    paidBy: "current_user",
    splitAmong: ["Krisha", "Arjun", "current_user"],
    debts: [
      {member: "Krisha", owes: 1000},
      {member: "Arjun", owes: 1000}
    ]
}
```

#### 4. **Payer Detection**
- "I paid", "I spent", "I bought" → Current user is payer
- "[Name] paid" → That member is payer

```
Input: "Krisha paid 2000 for groceries split with me"
→ {paidBy: "Krisha", debts: [{member: "currentUser", owes: 1000}]}
```

#### 5. **Settlement vs Expense**
Keywords: "settle up", "mark as paid", "clear balance"
```
Input: "settle up with Krisha"
→ Handled separately (not as expense)
```

### Usage

```typescript
import { parseExpenseInput } from '@/lib/expense-parser';

const result = parseExpenseInput(
  "I paid ₹500 for dinner split with Krisha",
  currentUserId,
  currentUserName,
  groupMembers
);

// result.expenses[0] = {
//   type: "split",
//   amount: 500,
//   paidBy: currentUserId,
//   splitAmong: ["Krisha", "currentUser"],
//   debts: [{member: "Krisha", owes: 250}]
// }
```

---

## Balance Sheet Logic

### Action Button Rules

The `getActionButton()` function implements this logic:

```typescript
function getActionButton(member, currentUserId) {
  const net = member.paid - member.owes;

  if (member.userId === currentUserId) {
    // Current user's own row
    if (net > 0) {
      // I am owed money → show "Request" button
      return { label: "Request", type: "request" };
    }
    // If I owe, no action on my own row
    return null;
  }

  // Other member's row
  if (net < 0) {
    // This person owes money → show "Pay" button
    return { label: "Pay", type: "pay" };
  } else if (net > 0) {
    // This person is owed → show "Request" button (to ask them)
    return { label: "Request", type: "request" };
  }

  return null;
}
```

### Visual Display

| Net Balance | Current User | Other Member |
|-------------|-------------|-------------|
| +₹200 (owed) | Show "Request" | Show "Request" |
| 0 (settled) | Nothing | Nothing |
| -₹200 (owes) | Nothing | Show "Pay" |

---

## Payment Request Flow

### Step 1: Send Request
When user clicks "Request" button:

**Endpoint:** `POST /api/payments/request`

```typescript
// Request sends to backend
{
  toUserId: "user-id",
  amount: 200,
  groupId: "group-id",
  message: "Optional payment reminder"
}
```

**Backend:**
1. Creates record in `payment_requests` table
2. Creates notification for debtor
3. (TODO) Sends email notification

**User sees:** "Payment request sent to [Name]!"

### Step 2: Debtor Receives Notification

Debtor sees card on home/overview:
```
"Krisha is requesting ₹200 from you in [Group Name]"
[Pay Now] [Dismiss]
```

---

## Two-Sided Settlement

### Settlement Flow

#### Step 1: Payer Initiates Settlement

User clicks "Pay" button or "Settle Up":

**Endpoint:** `POST /api/payments/settle`

```typescript
{
  payerId: "payer-id",
  payeeId: "payee-id",
  amount: 200,
  groupId: "group-id",
  action: "initiate"
}
```

**Status becomes:** `pending_confirmation`

**Payee receives notification:**
```
"Krisha says they have paid ₹200. Confirm?"
[Accept] [Reject]
```

#### Step 2: Payee Confirms or Rejects

**Accept Settlement:**

**Endpoint:** `POST /api/payments/settle`

```typescript
{
  payerId: "payer-id",
  payeeId: "payee-id",
  amount: 200,
  groupId: "group-id",
  action: "confirm"
}
```

**What happens:**
1. Settlement status becomes `confirmed`
2. Related expense splits marked as `is_settled: true`
3. Payer receives confirmation notification
4. Both users see "Settled ✓" badge in their views

**Reject Settlement:**

**Endpoint:** `POST /api/payments/settle`

```typescript
{
  payerId: "payer-id",
  payeeId: "payee-id",
  amount: 200,
  groupId: "group-id",
  action: "reject"
}
```

**What happens:**
1. Settlement status becomes `rejected`
2. Payer notified: "Payment not confirmed by [name]"
3. Settlement record saved for history

---

## Profile Management

### Profile Name Editor Component

Location: `components/ProfileNameEditor.tsx`

#### Features:
- Inline edit mode with keyboard shortcuts (Enter to save, Esc to cancel)
- Auto-edit mode if name is not set
- Syncs across entire app
- Updates both auth metadata and profiles table

#### Usage:

```typescript
import ProfileNameEditor from '@/components/ProfileNameEditor';

<ProfileNameEditor
  user={currentUser}
  onNameUpdated={(newName) => console.log('Name updated to:', newName)}
  autoEdit={false}
  compact={false}
/>
```

#### Props:
- `user`: Current user object
- `onNameUpdated`: Callback when name changes
- `autoEdit`: Auto-open edit mode if name missing
- `compact`: Show inline compact version instead of full form

#### Display Logic:
- Priority: `profile.full_name` → `user_metadata.full_name` → email prefix → "User"
- Never show `undefined` or empty values

---

## Group Fund Tracking

### How Group Fund Works

1. **Fund Deduction**
```typescript
// When group_fund expense is added:
const newFund = group.group_fund - amount;
await db.split_groups.update(id, { group_fund: newFund });
```

2. **No Individual Debts**
```typescript
// Group fund expenses have empty debts array
{
  type: "group_fund",
  paidFromFund: true,
  debts: [] // ← Always empty
}
```

3. **Display in Balance Sheet**
- Separate "Group Fund" row at bottom
- Shows: Starting balance | Total spent | Remaining balance
- NOT included in individual "Paid" or "Owes" columns

4. **Chat Display**
Yellow card appears:
```
"Paid from Group Fund — no individual debts"
```

### Group Fund in Summary

```typescript
// In GroupSummary component:

const totalGroupFundSpent = expenses
  .filter(e => e.is_group_fund_expense)
  .reduce((sum, e) => sum + e.total_amount, 0);

// Display:
<div>
  Total Fund: ₹[startBalance + totalSpent]
  Total Spent: ₹[totalSpent]
  Remaining: ₹[currentBalance]
</div>
```

---

## Email Notifications (TODO)

### Setup SendGrid/Resend

1. Choose email provider (SendGrid recommended)
2. Add API key to `.env.local`:
   ```
   SENDGRID_API_KEY=your-key-here
   ```

3. Create email service utility:
```typescript
// lib/email-service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendPaymentRequestEmail(
  requester: string,
  debtor: { name: string; email: string },
  amount: number,
  groupName: string
) {
  const msg = {
    to: debtor.email,
    from: 'noreply@rfin.app',
    subject: `Payment reminder — ₹${amount} owed in ${groupName}`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Hi ${debtor.name},</p>
      <p>${requester} is requesting ₹${amount} in the group "${groupName}".</p>
      <p><a href="${appUrl}/dashboard/splitwise">Settle this in RFin</a></p>
    `
  };

  await sgMail.send(msg);
}
```

4. Call from payment request endpoint:
```typescript
// In app/api/payments/request/route.ts
await sendPaymentRequestEmail(
  requesterName,
  debtor,
  amount,
  groupName
);
```

---

## Implementation Checklist

- [x] Database schema created (`supabase-payment-requests-schema.sql`)
- [x] AI expense parser implemented (`lib/expense-parser.ts`)
- [x] Payment request API endpoint (`app/api/payments/request/route.ts`)
- [x] Settlement API endpoint (`app/api/payments/settle/route.ts`)
- [x] Profile name editor component (`components/ProfileNameEditor.tsx`)
- [x] Balance sheet action buttons logic
- [x] Group fund tracking logic
- [ ] Email notification service (TODO)
- [ ] Notification UI components (TODO)
- [ ] Settlement confirmation UI (TODO)
- [ ] Payment request UI cards (TODO)
- [ ] Hook into AI response to use parseExpenseInput (TODO)

---

## Migration Guide

### For Existing Deployments

1. **Backup database** (Create snapshot in Supabase)
2. **Run migration SQL** in Supabase SQL Editor
3. **Deploy code changes** to production
4. **Test with beta users** before full rollout

### Testing

```bash
# Test expense parsing
npx ts-node -e "
  import { parseExpenseInput } from './lib/expense-parser';
  console.log(parseExpenseInput(
    'I paid 500 for dinner split with Krisha',
    'userId',
    'Me',
    [{name: 'Krisha', id: 'user2'}]
  ));
"

# Test API endpoints
curl -X POST http://localhost:3000/api/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "toUserId": "user-id",
    "amount": 200,
    "groupId": "group-id"
  }'
```

---

## Troubleshooting

### "Missing payment_requests table"
- Run `supabase-payment-requests-schema.sql` in SQL Editor
- Verify tables exist: `select * from information_schema.tables where table_name like 'payment_%'`

### "Notifications not appearing"
- Check notifications table for records: `select * from notifications order by created_at desc limit 10`
- Verify RLS policies allow user to see their notifications
- Check `user_id` matches current auth user

### "Settlement not confirming"
- Verify both `payer_id` and `payee_id` match correct users
- Check settlements table: `select * from settlements where status = 'pending_confirmation'`
- Ensure payee is clicking correct button in notification

---

## Future Enhancements

- [ ] Recurring payment reminders
- [ ] Payment history/receipts
- [ ] Bulk settle for multiple members
- [ ] Calendar view of payments
- [ ] Integration with payment apps (UPI, Venmo, etc)
- [ ] Advanced analytics on settlement patterns
