# Payment Requests & Settlement Implementation - Quick Start

## What Was Implemented

This implementation adds the following features to RFin:

1. **AI Natural Language Parsing** - Parse complex multi-part expenses
2. **Balance Sheet Action Buttons** - Context-aware Request/Pay buttons
3. **Payment Request Flow** - Send payment reminders to group members
4. **Two-Sided Settlement** - Confirm payments before marking as settled
5. **Profile Name Management** - Edit and sync display names across the app
6. **Group Fund Tracking** - Track group fund separately from individual expenses

---

## Files Created

### Database Schema
- `supabase-payment-requests-schema.sql` - New tables: payment_requests, settlements, notifications

### Backend APIs
- `app/api/payments/request/route.ts` - Send payment requests
- `app/api/payments/settle/route.ts` - Handle settlement confirmations

### Utilities & Libraries
- `lib/expense-parser.ts` - AI-powered expense parsing with multi-expense support
- `components/ProfileNameEditor.tsx` - Reusable profile name editor component

### Documentation
- `PAYMENT_REQUESTS_IMPLEMENTATION.md` - Complete feature documentation
- `IMPLEMENTATION_CHECKLIST.md` - This file

---

## Files Modified

### Balance Sheet & Group Summary
- `components/splitwise/GroupSummary.tsx`
  - Added `groupId` prop
  - Implemented `handleSendPaymentRequest()` function
  - Updated action button logic to show Request/Pay based on user role and balance
  - Improved prop interface

### Group Workspace
- `components/splitwise/GroupWorkspace.tsx`
  - Pass `groupId` to GroupSummary component

---

## Step-by-Step Setup

### 1. Run Database Migration (REQUIRED)

```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Click "New Query"
# 3. Copy entire content of: supabase-payment-requests-schema.sql
# 4. Execute the query
# 5. Check that 3 tables were created:
#    - payment_requests
#    - settlements
#    - notifications
```

**Verify Success:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'payment_%' OR table_name = 'notifications';

-- Should return 3 rows
```

### 2. Update AI Processing Function (TODO)

In your AI function that processes user messages:
```typescript
import { parseExpenseInput } from '@/lib/expense-parser';

// When processing user input:
const parseResult = parseExpenseInput(
  userMessage,
  currentUserId,
  currentUserName,
  groupMembers
);

// parseResult.expenses contains structured expense data
// parseResult.message contains human-friendly confirmation
```

### 3. Add Profile Editor to Settings/Profile Page

```typescript
import ProfileNameEditor from '@/components/ProfileNameEditor';

// In your profile page:
<ProfileNameEditor
  user={currentUser}
  onNameUpdated={(newName) => {
    // Optionally refetch group data to update all displays
    fetchGroupData();
  }}
/>
```

### 4. Test the Implementation

#### Test Payment Requests:
```bash
curl -X POST http://localhost:3000/api/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "toUserId": "user-uuid",
    "amount": 200,
    "groupId": "group-uuid"
  }'

# Should create a record in payment_requests table
# and a notification for the debtor
```

#### Test Settlements:
```bash
# Initiate settlement (as payer)
curl -X POST http://localhost:3000/api/payments/settle \
  -H "Content-Type: application/json" \
  -d '{
    "payerId": "payer-uuid",
    "payeeId": "payee-uuid",
    "amount": 200,
    "groupId": "group-uuid",
    "action": "initiate"
  }'

# Confirm settlement (as payee)
curl -X POST http://localhost:3000/api/payments/settle \
  -H "Content-Type: application/json" \
  -d '{
    "payerId": "payer-uuid",
    "payeeId": "payee-uuid",
    "amount": 200,
    "groupId": "group-uuid",
    "action": "confirm"
  }'
```

#### Test Expense Parsing:
```typescript
import { parseExpenseInput } from '@/lib/expense-parser';

const tests = [
  "I paid 500 for dinner split with Krisha",
  "from group fund spent 10000 for supplies",
  "Arjun paid 1500 for groceries divide among all",
  "I spent 300 and another 200 split equally"
];

tests.forEach(test => {
  console.log(
    parseExpenseInput(test, 'user1', 'Me', [
      {name: 'Krisha', id: 'user2'},
      {name: 'Arjun', id: 'user3'}
    ])
  );
});
```

---

## Balance Sheet Logic Reference

### Button Visibility Rules

| Scenario | Current User | Other Member | Button |
|----------|-------------|-------------|--------|
| Other member owes me | My row | - | Request |
| I owe other member | - | Their row | Pay |
| Other member is owed | Their row | - | Request |
| Settled (net=0) | - | - | None |

### Example Balance Sheet

```
Member    | Paid   | Owes   | Net    | Action
----------|--------|--------|--------|--------
You       | ₹2000  | ₹1000  | +₹1000 | Request (on your row)
Krisha    | ₹1000  | ₹2000  | -₹1000 | Pay (on her row)
Group Fund| ₹5000  | ₹5000  | ₹0     | —
```

---

## AI Parsing Examples

### Example 1: Multi-Expense
```
Input: "from group fund spent 10000 and another 2000 spent by me divide among all"

Output:
Expense 1:
  - type: "group_fund"
  - amount: 10000
  - no individual debts

Expense 2:
  - type: "split"
  - amount: 2000
  - paidBy: "me"
  - debts: everyone except me gets ₹X
```

### Example 2: Group Fund
```
Input: "from group fund 5000 for team lunch"

Output:
  - type: "group_fund"
  - amount: 5000
  - paidFromFund: true
  - debts: [] (empty)
  - Chat shows: "Paid from Group Fund — no individual debts"
```

### Example 3: Split Expense
```
Input: "I paid 3000 for dinner split with Krisha and Arjun"

Output:
  - type: "split"
  - amount: 3000
  - paidBy: currentUser
  - splitAmong: [Krisha, Arjun, currentUser]
  - debts:
    * Krisha owes ₹1000
    * Arjun owes ₹1000
```

---

## Payment Request Flow Diagram

```
User A (Owed)          System              User B (Owes)
    |                    |                     |
    +--- Click Request --+                     |
    |                    |                     |
    |             Save to payment_requests     |
    |             Create notification          |
    |                    +--- Notify ----------+
    |                    |                     |
    |                    |                +--- See on Home
    |                    |                |    "A is requesting ₹X"
    |                    |                |
    |                    |          +--- Click Pay
    |                    |          |
    |                    |     Settlement initiated
    |                    |     status = pending_confirmation
    |                    |          |
    |                +--- Notify --+
    |                |             |
    +--- See notification "B says they paid ₹X"
         [Accept] [Reject]
         |
    +--- Click Accept
    |
    Settlement confirmed
    Debts marked settled
    Both see "Settled ✓"
```

---

## Payment Settlement Confirmation Flow

```
Payer                  Payee
  |                      |
  +-- Click Pay ----------+
  |                       |
  | Settlement created    |
  | status: pending_confirmation
  |                       |
  |                       +-- Sees notification
  |                       |   "[Payer] says paid ₹X"
  |                       |
  |                  [Accept] [Reject]
  |                       |
  |            +----------+
  |            |
  |       ACCEPT
  |            |
  |       Settlement confirmed
  |       Debts settled
  |       Both notified
  |
  +-- Sees "Settled ✓"
```

---

## Troubleshooting

### Issue: "Table payment_requests does not exist"
**Solution:** Run the SQL migration file in Supabase SQL Editor

### Issue: "Payment request sent but debtor doesn't see it"
**Solution:** Check that notification was created:
```sql
SELECT * FROM notifications 
WHERE type = 'payment_request' 
ORDER BY created_at DESC LIMIT 5;
```

### Issue: "Settlement confirmation not working"
**Solution:** Verify the payee_id matches the authenticated user making the request:
```sql
SELECT * FROM settlements 
WHERE status = 'pending_confirmation'
ORDER BY created_at DESC LIMIT 5;
```

### Issue: "Expense parsing not working"
**Solution:** Ensure group members array includes all members with correct names:
```typescript
const groupMembers = members.map(m => ({
  name: m.display_name,
  id: m.user_id
}));
```

---

## Next Steps (Post-Implementation)

1. **[IMPORTANT] Update AI Chat Route** - Integrate `parseExpenseInput()` into your AI processing
2. **Add Notification UI** - Create notification dashboard/cards
3. **Add Settlement UI** - Create confirmation dialogs for settlements
4. **Setup Email Service** - Integrate SendGrid/Resend for email notifications
5. **Add Payment Reminders** - Implement cron job for payment reminders
6. **Add Analytics** - Track settlement patterns, payment times, etc.

---

## Database Queries

### Check Payment Requests
```sql
SELECT 
  pr.id,
  from_user.display_name as requester,
  to_user.display_name as debtor,
  pr.amount,
  pr.status,
  pr.created_at
FROM payment_requests pr
LEFT JOIN group_members from_user ON pr.from_user_id = from_user.user_id
LEFT JOIN group_members to_user ON pr.to_user_id = to_user.user_id
ORDER BY pr.created_at DESC;
```

### Check Settlements
```sql
SELECT 
  s.id,
  payer.display_name as payer,
  payee.display_name as payee,
  s.amount,
  s.status,
  s.payer_confirmed,
  s.payee_confirmed,
  s.created_at
FROM settlements s
LEFT JOIN group_members payer ON s.payer_id = payer.user_id
LEFT JOIN group_members payee ON s.payee_id = payee.user_id
ORDER BY s.created_at DESC;
```

### Check Notifications
```sql
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.status,
  n.created_at,
  n.read_at
FROM notifications n
WHERE n.user_id = 'user-uuid'
ORDER BY n.created_at DESC;
```

---

## Support

For issues or questions:
1. Check the `PAYMENT_REQUESTS_IMPLEMENTATION.md` for detailed documentation
2. Review database migrations: `supabase-payment-requests-schema.sql`
3. Check API endpoints for expected request/response formats
4. Run SQL queries above to verify data is being created correctly
