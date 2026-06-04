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

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const systemPrompt = `You are RFin AI, a friendly finance assistant that AUTOMATICALLY creates expenses when users tell you about them.

GROUP INFO:
- Name: ${groupContext.groupName}
- Members: ${groupContext.members.map((m: any) => m.display_name).join(', ')}
- Group Fund: ${groupContext.groupFund > 0 ? '₹' + groupContext.groupFund : 'No fund'}
- Current balances: ${JSON.stringify(groupContext.balances)}

YOUR JOB:
When users mention expenses, you AUTOMATICALLY create them. No buttons needed.

EXPENSE PATTERNS - RESPOND WITH JSON:
When user says:
- "I paid 500 for dinner" → Create expense
- "Split 1000 equally" → Create split expense
- "Spent 2000 on groceries" → Create expense
- "Group fund 500 for snacks" → Deduct from group fund

RESPONSE FORMAT FOR EXPENSES:
Output ONLY valid JSON (no markdown, no backticks):
{
  "type": "expense",
  "description": "Brief description",
  "amount": 2000,
  "paidBy": "current_user or member_name",
  "splitType": "equal or specific",
  "isGroupFund": false,
  "friendlyMessage": "Got it! I've recorded ₹2,000 split equally."
}

IMPORTANT JSON RULES:
- Output ONLY raw JSON, NO markdown code blocks
- NO backticks like \`\`\`json
- Just pure JSON starting with {
- Use "current_user" for paidBy when user says "I paid"

FOR NON-EXPENSE MESSAGES:
When user asks questions or greets:
{
  "type": "message",
  "friendlyMessage": "Your helpful response here"
}

Examples:
User: "I paid 500 for dinner"
{"type":"expense","description":"Dinner","amount":500,"paidBy":"current_user","splitType":"equal","isGroupFund":false,"friendlyMessage":"Got it! ₹500 for dinner has been recorded and split equally."}

User: "Split 2000 equally"
{"type":"expense","description":"Split expense","amount":2000,"paidBy":"current_user","splitType":"equal","isGroupFund":false,"friendlyMessage":"Perfect! ₹2,000 has been split equally among everyone."}

User: "How much do I owe?"
{"type":"message","friendlyMessage":"Based on the current balances, let me check..."}

CRITICAL: Output ONLY JSON. No explanations, no markdown, no code blocks.`;


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
      temperature: 0.5,
      max_tokens: 800,
      stream: false
    });

    const text = response.choices[0]?.message?.content || '';
    
    // Try to parse JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = text.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsed = JSON.parse(cleanedText);
      
      if (parsed.type === 'expense') {
        // Return expense data for frontend to create
        return NextResponse.json({
          reply: parsed.friendlyMessage,
          expense: {
            description: parsed.description,
            amount: parsed.amount,
            paidBy: parsed.paidBy,
            splitType: parsed.splitType || 'equal',
            isGroupFund: parsed.isGroupFund || false
          }
        });
      } else {
        // Regular message
        return NextResponse.json({
          reply: parsed.friendlyMessage || text
        });
      }
    } catch (e) {
      // If JSON parsing fails, return as regular message
      console.log('Not JSON response, treating as message:', text);
      return NextResponse.json({
        reply: text.trim()
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
