import groq, { AI_MODEL } from './groq-client';
import { ExpenseCategory, PaymentMethod } from '@/types';

export interface ParsedCommand {
  intent: 'add_expense' | 'set_budget' | 'split_expense' | 'query' | 'unknown';
  expense?: {
    amount: number;
    category: ExpenseCategory;
    notes?: string;
    payment_method?: PaymentMethod;
  };
  budget?: {
    category: ExpenseCategory;
    amount: number;
    action: 'set' | 'increase' | 'decrease';
  };
  split?: {
    amount: number;
    category: ExpenseCategory;
    people: string[];
    notes?: string;
  };
  query?: {
    type: 'spending' | 'savings' | 'trends' | 'recommendations' | 'general';
    timeframe?: 'today' | 'week' | 'month' | 'year';
  };
}

const SYSTEM_PROMPT = `You are RFin AI, a premium financial assistant EXCLUSIVELY for personal finance management.

**STRICT RULES:**
1. ONLY answer questions about the user's personal finances, expenses, budgets, and spending
2. REFUSE to answer any questions outside of personal finance
3. If asked about general topics, politics, news, coding, or anything else, respond: "I can only help with your personal finances and expenses. Please ask about your spending, budgets, or financial insights."
4. Stay focused on: expenses, budgets, savings, spending patterns, financial goals

Your task is to parse user commands and extract structured data for expense tracking.

Commands you understand:
1. Add Expense: "Spent ₹500 on petrol", "Add ₹1200 dinner with friends", "Paid ₹350 for Netflix"
2. Set Budget: "Allocate ₹5000 for travel", "Set monthly food budget to ₹8000", "Reduce entertainment budget by 20%"
3. Split Expense: "Split ₹2400 between Ravi, Jay and Mehul", "Jay owes me ₹800"
4. Query: "Where did I spend most?", "How much did I save?", "Show food spending trend"
5. Trip Planning: "Going to Lonavala tomorrow", "Planning trip to Goa next week"

Categories: Food, Petrol, Friends, Shopping, Bills, Entertainment, Travel, Other
Payment Methods: Cash, Credit Card, Debit Card, UPI, Net Banking, Other

Respond ONLY with valid JSON in this format:
{
  "intent": "add_expense" | "set_budget" | "split_expense" | "query" | "trip_plan" | "unknown",
  "expense": { "amount": number, "category": string, "notes": string, "payment_method": string, "location": string },
  "budget": { "category": string, "amount": number, "action": "set" | "increase" | "decrease" },
  "split": { "amount": number, "category": string, "people": ["name1", "name2"], "notes": string },
  "trip": { "destination": string, "start_date": string, "budget": number },
  "query": { "type": "spending" | "savings" | "trends" | "recommendations" | "general", "timeframe": string }
}

Only include the fields relevant to the detected intent.`;

export async function parseCommand(userMessage: string): Promise<ParsedCommand> {
  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content) as ParsedCommand;
    return parsed;
  } catch (error) {
    console.error('Error parsing command:', error);
    return { intent: 'unknown' };
  }
}

export function validateParsedExpense(expense: any): boolean {
  const validCategories: ExpenseCategory[] = ['Food', 'Petrol', 'Friends', 'Shopping', 'Bills', 'Entertainment', 'Travel', 'Other'];
  
  if (!expense.amount || expense.amount <= 0) return false;
  if (!expense.category || !validCategories.includes(expense.category)) return false;
  
  return true;
}

export function validateParsedBudget(budget: any): boolean {
  const validCategories: ExpenseCategory[] = ['Food', 'Petrol', 'Friends', 'Shopping', 'Bills', 'Entertainment', 'Travel', 'Other'];
  const validActions = ['set', 'increase', 'decrease'];
  
  if (!budget.amount || budget.amount <= 0) return false;
  if (!budget.category || !validCategories.includes(budget.category)) return false;
  if (!budget.action || !validActions.includes(budget.action)) return false;
  
  return true;
}
