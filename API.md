# 🔌 RFin - API Documentation

## Overview

RFin uses Next.js 15 API routes with Supabase for data persistence and Groq for AI capabilities.

## Base URL

```
Local: http://localhost:3000/api
Production: https://your-app.vercel.app/api
```

## Authentication

All API routes require authentication via Supabase session cookies. The middleware handles auth automatically.

### Headers

```http
Content-Type: application/json
Cookie: supabase-auth-token=...
```

## Endpoints

### 1. AI Chat

Send messages to the AI financial assistant.

**Endpoint:** `POST /api/ai/chat`

**Request Body:**
```json
{
  "message": "Spent ₹500 on petrol"
}
```

**Response:**
```json
{
  "message": "✓ Added ₹500 expense for Petrol.",
  "intent": "add_expense",
  "actionPerformed": true
}
```

**Intents:**
- `add_expense` - Created a new expense
- `set_budget` - Updated budget
- `split_expense` - Created split expense
- `query` - Answered financial question
- `unknown` - Couldn't understand

**Rate Limit:** 30 requests per minute per user

**Example:**

```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'How much did I spend on food?' })
});

const data = await response.json();
console.log(data.message);
```

**Error Responses:**

```json
{
  "error": "Rate limit exceeded. Please try again in a moment."
}
// Status: 429

{
  "error": "Unauthorized"
}
// Status: 401

{
  "error": "Invalid message"
}
// Status: 400
```

## Database Operations

Direct database operations use Supabase client. Here are the main operations:

### Expenses

**Fetch All Expenses:**
```typescript
const { data, error } = await supabase
  .from('expenses')
  .select('*')
  .eq('user_id', user.id)
  .order('expense_date', { ascending: false });
```

**Create Expense:**
```typescript
const { data, error } = await supabase
  .from('expenses')
  .insert({
    user_id: user.id,
    amount: 500,
    category: 'Food',
    notes: 'Lunch with friends',
    payment_method: 'UPI',
    expense_date: '2026-06-02'
  });
```

**Update Expense:**
```typescript
const { data, error } = await supabase
  .from('expenses')
  .update({ amount: 600, notes: 'Updated notes' })
  .eq('id', expense_id)
  .eq('user_id', user.id);
```

**Delete Expense:**
```typescript
const { data, error } = await supabase
  .from('expenses')
  .delete()
  .eq('id', expense_id)
  .eq('user_id', user.id);
```

### Budgets

**Fetch Monthly Budget:**
```typescript
const { data, error } = await supabase
  .from('budgets')
  .select('*')
  .eq('user_id', user.id)
  .eq('month', 6)
  .eq('year', 2026);
```

**Upsert Budget:**
```typescript
const { data, error } = await supabase
  .from('budgets')
  .upsert({
    user_id: user.id,
    category: 'Food',
    amount: 8000,
    month: 6,
    year: 2026
  }, {
    onConflict: 'user_id,category,month,year'
  });
```

### Chat History

**Fetch Recent Chat:**
```typescript
const { data, error } = await supabase
  .from('chat_history')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: true })
  .limit(50);
```

**Save Message:**
```typescript
const { data, error } = await supabase
  .from('chat_history')
  .insert({
    user_id: user.id,
    role: 'user',
    content: 'How much did I spend?'
  });
```

### Split Expenses

**Create Split:**
```typescript
const { data, error } = await supabase
  .from('split_expenses')
  .insert([
    {
      user_id: user.id,
      expense_id: expense.id,
      person_name: 'Ravi',
      amount_owed: 1000,
      is_settled: false
    },
    {
      user_id: user.id,
      expense_id: expense.id,
      person_name: 'Jay',
      amount_owed: 1000,
      is_settled: false
    }
  ]);
```

**Mark as Settled:**
```typescript
const { data, error } = await supabase
  .from('split_expenses')
  .update({ 
    is_settled: true,
    settled_at: new Date().toISOString()
  })
  .eq('id', split_id)
  .eq('user_id', user.id);
```

### AI Summaries

**Save AI Summary:**
```typescript
const { data, error } = await supabase
  .from('ai_summaries')
  .insert({
    user_id: user.id,
    summary_type: 'monthly',
    content: 'Your spending this month...',
    month: 6,
    year: 2026,
    metadata: {
      total_spent: 15000,
      top_category: 'Food'
    }
  });
```

**Fetch Latest Insights:**
```typescript
const { data, error } = await supabase
  .from('ai_summaries')
  .select('*')
  .eq('user_id', user.id)
  .eq('summary_type', 'insights')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

## AI Service Functions

### Command Parser

**Function:** `parseCommand(userMessage: string)`

Parses natural language into structured commands.

```typescript
import { parseCommand } from '@/lib/ai/command-parser';

const result = await parseCommand("Spent ₹500 on petrol");

// Returns:
{
  intent: 'add_expense',
  expense: {
    amount: 500,
    category: 'Petrol',
    notes: undefined,
    payment_method: undefined
  }
}
```

### Insights Generator

**Generate Monthly Insights:**

```typescript
import { generateMonthlyInsights } from '@/lib/ai/insights-generator';

const insights = await generateMonthlyInsights(
  expenses,
  categoryTotals,
  totalSpent,
  'June'
);
```

**Generate Savings Suggestions:**

```typescript
import { generateSavingsSuggestions } from '@/lib/ai/insights-generator';

const suggestions = await generateSavingsSuggestions(
  expenses,
  categoryTotals
);
```

**Detect Anomalies:**

```typescript
import { detectAnomalies } from '@/lib/ai/insights-generator';

const anomalies = await detectAnomalies(expenses, avgSpending);
```

**Answer Financial Query:**

```typescript
import { answerFinancialQuery } from '@/lib/ai/insights-generator';

const answer = await answerFinancialQuery(
  "How much did I spend on food?",
  expenses,
  categoryTotals,
  totalSpent
);
```

## Utility Functions

### Currency Formatting

```typescript
import { formatCurrency } from '@/lib/format';

formatCurrency(1500); // "₹1,500"
formatCurrency(1500.50); // "₹1,500.50"
formatCurrency(1500, 'USD'); // "$1,500"
```

### Date Formatting

```typescript
import { formatDate, formatShortDate, formatMonthYear } from '@/lib/format';

formatDate('2026-06-02'); // "Jun 02, 2026"
formatShortDate('2026-06-02'); // "Jun 02"
formatMonthYear(6, 2026); // "June 2026"
```

### Current Period

```typescript
import { getCurrentMonth, getCurrentYear } from '@/lib/format';

const month = getCurrentMonth(); // 6
const year = getCurrentYear(); // 2026
```

### Compact Numbers

```typescript
import { formatCompactNumber } from '@/lib/format';

formatCompactNumber(1500); // "1.5K"
formatCompactNumber(150000); // "1.5L"
formatCompactNumber(15000000); // "1.5Cr"
```

## Rate Limiting

**AI Chat Endpoint:**
- Limit: 30 requests per minute per user
- Window: Rolling 60-second window
- Response: 429 Too Many Requests

**Implementation:**

```typescript
import { checkRateLimit } from '@/lib/ai/groq-client';

if (!checkRateLimit()) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
```

## Error Handling

All API routes follow consistent error response format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
- `AUTH_REQUIRED` - User not authenticated
- `INVALID_INPUT` - Bad request data
- `RATE_LIMIT` - Too many requests
- `AI_ERROR` - AI service failure
- `DATABASE_ERROR` - Database operation failed

## WebSocket (Planned)

Real-time updates for:
- New expenses
- Budget alerts
- AI streaming responses

```typescript
// Coming soon
const ws = new WebSocket('wss://your-app.vercel.app/ws');

ws.on('expense_added', (expense) => {
  // Update UI
});
```

## Webhooks (Planned)

Configure webhooks for external integrations:

```http
POST /api/webhooks/expense-added
{
  "expense": {...},
  "user_id": "...",
  "timestamp": "2026-06-02T10:00:00Z"
}
```

## SDK (Planned)

TypeScript SDK for easier integration:

```typescript
import { RFinClient } from '@rfin/sdk';

const client = new RFinClient({
  apiKey: process.env.RFIN_API_KEY
});

await client.expenses.create({
  amount: 500,
  category: 'Food'
});
```

---

For questions or issues with the API, open an issue on GitHub.
