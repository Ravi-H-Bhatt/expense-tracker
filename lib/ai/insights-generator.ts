import groq, { AI_MODEL } from './groq-client';
import { Expense, CategoryTotal } from '@/types';

export async function generateMonthlyInsights(
  expenses: Expense[],
  categoryTotals: CategoryTotal[],
  totalSpent: number,
  monthName: string
): Promise<string> {
  const prompt = `As RFin AI, a premium financial advisor, analyze this spending data for ${monthName} and provide concise, actionable insights.

Total Spent: ₹${totalSpent.toFixed(2)}
Number of Transactions: ${expenses.length}

Category Breakdown:
${categoryTotals.map(cat => `- ${cat.category}: ₹${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)`).join('\n')}

Provide:
1. Key spending pattern (1 sentence)
2. Top spending category observation (1 sentence)
3. One specific actionable recommendation (1 sentence)
4. Financial health score (1-10) with brief reason

Keep it concise, professional, and actionable. Use Indian Rupee context.`;

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate insights at this time.';
  } catch (error) {
    console.error('Error generating insights:', error);
    return 'Unable to generate insights. Please try again later.';
  }
}

export async function generateSavingsSuggestions(
  expenses: Expense[],
  categoryTotals: CategoryTotal[]
): Promise<string> {
  const topCategories = categoryTotals
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const prompt = `As a financial advisor for RFin, suggest specific ways to save money based on this spending:

Top Spending Categories:
${topCategories.map(cat => `- ${cat.category}: ₹${cat.total.toFixed(2)} (${cat.count} transactions)`).join('\n')}

Provide 3-4 specific, actionable savings opportunities. Be practical and consider Indian context. Keep each suggestion to 1 sentence.`;

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate savings suggestions.';
  } catch (error) {
    console.error('Error generating savings suggestions:', error);
    return 'Unable to generate savings suggestions. Please try again later.';
  }
}

export async function detectAnomalies(
  expenses: Expense[],
  avgSpending: number
): Promise<string | null> {
  const unusualExpenses = expenses.filter(e => e.amount > avgSpending * 2);
  
  if (unusualExpenses.length === 0) return null;

  const prompt = `Analyze these unusual high-value transactions (significantly above average):

${unusualExpenses.map(e => `- ₹${e.amount} on ${e.category}${e.notes ? ` (${e.notes})` : ''}`).join('\n')}

Average transaction: ₹${avgSpending.toFixed(2)}

Provide a brief observation about these unusual expenses (2-3 sentences). Be factual and helpful.`;

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return null;
  }
}

export async function answerFinancialQuery(
  query: string,
  expenses: Expense[],
  categoryTotals: CategoryTotal[],
  totalSpent: number
): Promise<string> {
  const context = `
User's Financial Data:
- Total Spent: ₹${totalSpent.toFixed(2)}
- Number of Transactions: ${expenses.length}
- Average Transaction: ₹${expenses.length > 0 ? (totalSpent / expenses.length).toFixed(2) : 0}

Category Breakdown:
${categoryTotals.map(cat => `- ${cat.category}: ₹${cat.total.toFixed(2)} (${cat.count} transactions)`).join('\n')}

Recent Transactions:
${expenses.slice(-5).map(e => `- ₹${e.amount} on ${e.category} (${e.expense_date})`).join('\n')}
`;

  const prompt = `As RFin AI, a premium financial assistant, answer this user question based on their financial data:

Question: ${query}

${context}

Provide a clear, concise answer with specific numbers from the data. Be helpful and professional. If suggesting actions, make them specific and actionable.`;

  try {
    const completion = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || 'Unable to answer your question right now.';
  } catch (error) {
    console.error('Error answering query:', error);
    return 'I encountered an error processing your question. Please try again.';
  }
}
