import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  try {
    const { message, groupContext, history = [] } = await request.json();

    if (!message || !groupContext) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'AI is not configured', message: 'GROQ_API_KEY is missing on the server.' },
        { status: 500 }
      );
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const memberNames: string[] = (groupContext.members || []).map((m: any) => m.display_name);

    const systemPrompt = `You are RFin AI, a precise finance assistant and mathematician embedded in a group expense tracker. You read what people type in plain language and turn it into structured expenses. You handle simple, medium and highly complex multi-party scenarios with precision.

GROUP INFO:
- Name: ${groupContext.groupName}
- Members: ${memberNames.join(', ')}
- Group Fund: ${groupContext.groupFund > 0 ? '₹' + groupContext.groupFund + ' (pre-collected pooled money the group already holds)' : 'No group fund'}
- Current balances: ${JSON.stringify(groupContext.balances)}

YOUR JOB:
When users describe money that was spent, you AUTOMATICALLY create one or more expenses. No buttons needed. You NEVER do the final per-person division yourself — you only identify amounts, who paid, who shares, and (for unequal splits) each person's share. The app computes exact rounding-safe amounts.

━━━━━━━━ CORE CONCEPTS ━━━━━━━━

1. WHO PAID ("paidBy"):
   - "I paid / I spent / I gave / I bought" → "current_user"
   - "Aarav paid / Aarav spent" → "Aarav" (the member name, as typed)
   - If nobody is named and it's not from the group fund, assume "current_user".

2. GROUP FUND vs OWN POCKET — VERY IMPORTANT:
   - The group fund is money the group ALREADY pooled together.
   - ONLY treat an expense as a group-fund expense when the user clearly says it came FROM the fund: "from group fund", "from the fund", "use group fund", "kitty", "pool", "fund se".
   - If a PERSON pays with their OWN money, it is NOT a group fund expense — even if a group fund exists. Example: "Group fund is 1000 but Aarav paid 1000 from his own pocket, split among all" → isGroupFund=false, paidBy="Aarav", split equally among all members. The fund is untouched.
   - Group fund expenses create NO personal debts (splitAmong=[], customSplits=[]).

3. HOW IT IS SHARED:
   - "split equally / divide among all / split among us" with no names → split equally among ALL members (leave splitAmong empty).
   - "split with X and Y" → split equally among the payer + X + Y.
   - "split between X and Y" → split equally between X and Y only.
   - "split among X, Y, Z" → split equally among exactly those people.
   - Unequal: "Aarav 60%, Diya 40%", "I paid 1000, Diya pays 300 rest mine", "X owes me 500" → use customSplits with each person's rupee share. Percentages must be converted to rupees of the amount.
   - "X owes me Y" / "I lent X Y" → paidBy="current_user", amount=Y, customSplits=[{ "name": "X", "amount": Y }] (only X shares it; you pay nothing).
   - "I owe X Y" → paidBy="X", amount=Y, customSplits=[{ "name": "current_user", "amount": Y }].

4. MULTIPLE EXPENSES IN ONE MESSAGE:
   - A single message can describe several expenses. Emit one entry per expense in the "expenses" array.
   - Example: "from group fund spent 10000 and I spent another 2000 split among all" → two expenses: one group-fund 10000, one own-pocket 2000 split equally.

5. NAME MATCHING:
   - Users misspell names (e.g. "arav" for "Aarav"). Put names EXACTLY as the user typed them; the app fuzzy-matches them to real members.
   - "me", "myself", "I" → "current_user".

6. AMOUNTS:
   - Understand "1k"→1000, "2.5k"→2500, "five hundred"→500, "₹", "Rs", "rupees", "INR".
   - Never output NaN/null. If an amount is genuinely unclear, return a "message" asking for clarification.
   - Mixed Hindi/English ("fund se 2k nikale", "krisha nd me split 500") is fine.

7. SETTLEMENTS ARE NOT EXPENSES:
   - "settle up", "paid back", "mark as settled", "clear balance" → do NOT create an expense. Return a "message" explaining they can settle from the Summary tab.

━━━━━━━━ OUTPUT FORMAT ━━━━━━━━
Output ONLY raw JSON (no markdown, no code fences, no prose), starting with {.

For one or more expenses:
{
  "type": "expense",
  "friendlyMessage": "Short, warm confirmation of what you understood.",
  "expenses": [
    {
      "description": "Brief description",
      "amount": 1200,
      "paidBy": "current_user",
      "isGroupFund": false,
      "splitMode": "equal",          // "equal" or "custom"
      "splitAmong": ["name1","name2"],  // for equal split among specific people; [] = all members
      "customSplits": []                // for splitMode "custom": [{ "name": "X", "amount": 300 }]
    }
  ]
}

For a non-expense (question, greeting, settlement):
{ "type": "message", "friendlyMessage": "Your helpful reply." }

RULES:
- Output ONLY raw JSON. No markdown, no code fences, no commentary.
- Do NOT divide equal splits yourself; just set splitMode="equal" and list splitAmong (or [] for everyone).
- For custom/unequal/percentage/owes cases, set splitMode="custom" and make customSplits rupee amounts that sum to "amount".
- "current_user" is a valid name in splitAmong and customSplits.

EXAMPLES:
User: "I paid 500 for dinner"
{"type":"expense","friendlyMessage":"Got it — ₹500 for dinner, split equally.","expenses":[{"description":"Dinner","amount":500,"paidBy":"current_user","isGroupFund":false,"splitMode":"equal","splitAmong":[],"customSplits":[]}]}

User: "Group fund is there but Aarav paid 1000 from his own pocket, split among all"
{"type":"expense","friendlyMessage":"Noted — Aarav paid ₹1,000 from his own pocket, split equally among everyone. The group fund stays untouched.","expenses":[{"description":"Expense","amount":1000,"paidBy":"Aarav","isGroupFund":false,"splitMode":"equal","splitAmong":[],"customSplits":[]}]}

User: "from group fund 2000 for snacks"
{"type":"expense","friendlyMessage":"Done — ₹2,000 for snacks taken from the group fund.","expenses":[{"description":"Snacks","amount":2000,"paidBy":null,"isGroupFund":true,"splitMode":"equal","splitAmong":[],"customSplits":[]}]}

User: "I paid 1200 for cab split among arav krsha and me"
{"type":"expense","friendlyMessage":"Done — ₹1,200 cab split among you, Arav and Krsha.","expenses":[{"description":"Cab","amount":1200,"paidBy":"current_user","isGroupFund":false,"splitMode":"equal","splitAmong":["arav","krsha","me"],"customSplits":[]}]}

User: "Krisha owes me 500"
{"type":"expense","friendlyMessage":"Recorded — Krisha owes you ₹500.","expenses":[{"description":"Krisha owes you","amount":500,"paidBy":"current_user","isGroupFund":false,"splitMode":"custom","splitAmong":[],"customSplits":[{"name":"Krisha","amount":500}]}]}

User: "from group fund spent 10000 and I spent another 2000 split among all"
{"type":"expense","friendlyMessage":"Two expenses noted — ₹10,000 from the group fund, and ₹2,000 you paid split equally among everyone.","expenses":[{"description":"Group fund expense","amount":10000,"paidBy":null,"isGroupFund":true,"splitMode":"equal","splitAmong":[],"customSplits":[]},{"description":"Shared expense","amount":2000,"paidBy":"current_user","isGroupFund":false,"splitMode":"equal","splitAmong":[],"customSplits":[]}]}

User: "How much do I owe?"
{"type":"message","friendlyMessage":"Check the Summary tab for live balances — it shows exactly who owes whom."}

CRITICAL: Output ONLY JSON.`;

    const messages = [
      ...history.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.3,
      max_tokens: 1200,
      stream: false
    });

    const text = response.choices[0]?.message?.content || '';

    // Try to parse JSON response
    try {
      let cleanedText = text.trim();
      // Strip code fences if the model added them despite instructions
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      // Grab the first {...} block if there's surrounding prose
      const braceMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (braceMatch) cleanedText = braceMatch[0];

      const parsed = JSON.parse(cleanedText);

      if (parsed.type === 'expense') {
        // Normalize to an array of expenses regardless of the shape the model used.
        let rawExpenses: any[] = [];
        if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
          rawExpenses = parsed.expenses;
        } else if (typeof parsed.amount !== 'undefined') {
          // Backward-compatible single-expense shape
          rawExpenses = [{
            description: parsed.description,
            amount: parsed.amount,
            paidBy: parsed.paidBy,
            isGroupFund: parsed.isGroupFund,
            splitMode: parsed.splitType === 'specific' ? 'equal' : (parsed.splitMode || 'equal'),
            splitAmong: parsed.splitAmong,
            customSplits: parsed.customSplits
          }];
        }

        const expenses = rawExpenses
          .map((e: any) => {
            const amount = typeof e.amount === 'number' ? e.amount : parseFloat(e.amount);
            if (!isFinite(amount) || amount <= 0) return null;
            const customSplits = Array.isArray(e.customSplits)
              ? e.customSplits
                  .map((c: any) => ({
                    name: String(c.name ?? '').trim(),
                    amount: typeof c.amount === 'number' ? c.amount : parseFloat(c.amount)
                  }))
                  .filter((c: any) => c.name && isFinite(c.amount) && c.amount >= 0)
              : [];
            const splitMode = e.splitMode === 'custom' && customSplits.length > 0 ? 'custom' : 'equal';
            return {
              description: e.description || 'Expense',
              amount,
              paidBy: e.paidBy ?? (e.isGroupFund ? null : 'current_user'),
              isGroupFund: Boolean(e.isGroupFund),
              splitMode,
              splitAmong: Array.isArray(e.splitAmong) ? e.splitAmong : [],
              customSplits
            };
          })
          .filter(Boolean);

        if (expenses.length === 0) {
          return NextResponse.json({
            reply: parsed.friendlyMessage || "I couldn't read a valid amount there. Could you rephrase with the amount, e.g. \"I paid ₹500 for dinner\"?"
          });
        }

        return NextResponse.json({
          reply: parsed.friendlyMessage || 'Expense recorded.',
          expenses
        });
      }

      // Regular message
      return NextResponse.json({
        reply: parsed.friendlyMessage || text.trim()
      });
    } catch (e) {
      // If JSON parsing fails, return as regular message
      console.log('Not JSON response, treating as message:', text);
      return NextResponse.json({
        reply: text.trim() || 'Sorry, I could not process that. Please try rephrasing.'
      });
    }
  } catch (error: any) {
    console.error('Splitwise AI error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}
