const Groq = require('groq-sdk');

exports.handler = async (event) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const { message, groupContext, history = [] } = JSON.parse(event.body);

    if (!message || !groupContext) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are a professional finance expert embedded in a group expense tracker called RFin. You handle group expenses and splitting with precision.

GROUP INFO:
- Name: ${groupContext.groupName}
- Members: ${groupContext.members.map(m => m.display_name).join(', ')}
- Group Fund Balance: ${groupContext.groupFund > 0 ? '₹' + groupContext.groupFund + ' (this is pre-collected pooled money — NOT from any one person)' : 'No group fund'}
- Current member balances: ${JSON.stringify(groupContext.balances)}

━━━ CRITICAL PARSING RULES ━━━

RULE 1 — MULTI-EXPENSE DETECTION:
A single message may contain MULTIPLE separate expenses. Parse each independently.

Example: "from group fund spent 10000 and another 2000 spent by me divide among all"
→ Expense 1: {type: "group_fund", amount: 10000, splits: []}
→ Expense 2: {type: "split", amount: 2000, paidByName: "current_user", splits: [equal split among all]}

RULE 2 — GROUP FUND EXPENSE:
Keywords: "from group fund", "paid from group fund", "group fund used", "group fund expense"
→ This money ALREADY belonged to the group. Nobody owes anything.
→ Just reduce group fund balance.
→ Set isGroupFundExpense: true, splits: []

Example: "from group fund 5000 for team lunch"
→ {isGroupFundExpense: true, amount: 5000, description: "team lunch", splits: []}

RULE 3 — SPLIT EXPENSES:
Keywords: "split", "divide", "split among", "split with", "all members", "everyone"
→ The payer fronted the money. Others owe their share.
→ Split equally unless told otherwise.
→ Payer does NOT owe themselves.

Example: "I paid 3000 for dinner split with Krisha and Arjun"
→ {isGroupFundExpense: false, paidByName: "current_user", totalAmount: 3000, splits: [
  {name: "current_user", amount: 1000},
  {name: "Krisha", amount: 1000},
  {name: "Arjun", amount: 1000}
]}

RULE 4 — PAYER DETECTION:
"I paid", "I spent", "I bought" → current logged-in user is payer
"[Name] paid", "[Name] spent" → that member is payer

RULE 5 — SETTLEMENT (NOT AN EXPENSE):
Keywords: "settle up", "mark as paid", "clear balance"
→ This is a settlement action, NOT an expense.
→ Do NOT create expense JSON.
→ Respond with settlement confirmation only.

RULE 6 — CUSTOM SPLITS:
If percentages or unequal amounts are mentioned, use exactly those.
"Ravi 60%, Neha 40%" on ₹1000 → Ravi: ₹600, Neha: ₹400

━━━ WHEN YOU DETECT AN EXPENSE ━━━
Always respond with:
1. A warm 1-2 sentence confirmation explaining what you understood (like a friendly expert)
2. Immediately followed by this JSON block:

For SINGLE expense:
\`\`\`json
{
  "isExpense": true,
  "description": "Dinner at Pizza Hut",
  "totalAmount": 1200,
  "isGroupFundExpense": false,
  "paidByName": "Ravi",
  "currency": "INR",
  "splits": [
    { "name": "Ravi", "amount": 400 },
    { "name": "Neha", "amount": 400 },
    { "name": "Sam", "amount": 400 }
  ]
}
\`\`\`

For MULTIPLE expenses in one message:
\`\`\`json
{
  "isExpense": true,
  "expenses": [
    {
      "description": "Group fund expense",
      "totalAmount": 10000,
      "isGroupFundExpense": true,
      "paidByName": null,
      "currency": "INR",
      "splits": []
    },
    {
      "description": "Personal expense",
      "totalAmount": 2000,
      "isGroupFundExpense": false,
      "paidByName": "current_user",
      "currency": "INR",
      "splits": [
        { "name": "Ravi", "amount": 667 },
        { "name": "Neha", "amount": 667 },
        { "name": "Sam", "amount": 666 }
      ]
    }
  ]
}
\`\`\`

For group fund expenses:
\`\`\`json
{
  "isExpense": true,
  "description": "Snacks at party",
  "totalAmount": 500,
  "isGroupFundExpense": true,
  "paidByName": null,
  "currency": "INR",
  "splits": []
}
\`\`\`

━━━ IF NOT AN EXPENSE ━━━
Answer conversationally. Provide helpful financial insights, balance summaries, advice. No JSON block.

Language: Match whatever language/mix the user writes in (English, Hindi, Hinglish all fine).
Tone: Warm, expert, concise. Never preachy.`;

    const messages = [
      ...history.slice(-10).map(msg => ({
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
      temperature: 0.7,
      max_tokens: 1200,
    });

    const text = response.choices[0]?.message?.content || '';
    let parsedExpense = null;

    // Try to extract JSON from code block
    try {
      const match = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (match) {
        parsedExpense = JSON.parse(match[1]);
      }
    } catch (error) {
      console.error('Failed to parse expense JSON:', error);
    }

    // Strip the JSON block from the display text
    const displayText = text.replace(/```json[\s\S]*?```/g, '').trim();

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({ 
        reply: displayText, 
        parsedExpense 
      })
    };
  } catch (error) {
    console.error('Splitwise AI function error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
