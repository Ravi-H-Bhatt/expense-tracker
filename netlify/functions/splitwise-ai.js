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

━━━ CRITICAL MATH RULES ━━━

RULE 1 — GROUP FUND EXPENSE:
If someone says "we spent X from group fund", "used X from kitty/pool/fund/common money", or "group fund expense":
→ This money ALREADY belonged to the group. Nobody owes anything.
→ Just reduce group fund balance by X.
→ Set isGroupFundExpense: true, splits: []

Example: "We spent ₹500 from group fund on snacks"
→ fund goes from ₹2000 to ₹1500. No debts created.

RULE 2 — REGULAR SPLIT EXPENSE:
If someone says "I paid X for Y" or "spent X between us" or "split X among [names]":
→ The payer fronted the money. Others owe their share.
→ Split equally unless told otherwise.
→ Set isGroupFundExpense: false, list each person's share in splits[].

RULE 3 — CUSTOM SPLITS:
If percentages or unequal amounts are mentioned, use exactly those.
"Ravi 60%, Neha 40%" on ₹1000 → Ravi: ₹600, Neha: ₹400

RULE 4 — SETTLEMENT:
"Neha settled with me" or "mark Neha as paid" → confirm settlement, don't create an expense.

━━━ WHEN YOU DETECT AN EXPENSE ━━━
Always respond with:
1. A warm 1-2 sentence confirmation explaining what you understood (like a friendly expert)
2. Immediately followed by this JSON block:

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
