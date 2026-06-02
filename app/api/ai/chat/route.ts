import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCommand } from '@/lib/ai/command-parser';
import { answerFinancialQuery } from '@/lib/ai/insights-generator';
import { checkRateLimit } from '@/lib/ai/groq-client';
import { getCurrentMonth, getCurrentYear } from '@/lib/format';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Save user message to chat history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'user',
      content: message,
    });

    // Parse the command
    const parsed = await parseCommand(message);

    let responseMessage = '';
    let actionPerformed = false;

    // Handle different intents
    switch (parsed.intent) {
      case 'add_expense':
        if (parsed.expense) {
          const { data, error } = await supabase.from('expenses').insert({
            user_id: user.id,
            amount: parsed.expense.amount,
            category: parsed.expense.category,
            notes: parsed.expense.notes,
            payment_method: parsed.expense.payment_method,
            expense_date: new Date().toISOString().split('T')[0],
          }).select();

          if (error) {
            responseMessage = `I couldn't add that expense. ${error.message}`;
          } else {
            actionPerformed = true;
            responseMessage = `✓ Added ₹${parsed.expense.amount} expense for ${parsed.expense.category}${parsed.expense.notes ? ` - ${parsed.expense.notes}` : ''}.`;
          }
        } else {
          responseMessage = "I couldn't extract the expense details from your message. Please try again with the amount and category.";
        }
        break;

      case 'set_budget':
        if (parsed.budget) {
          const month = getCurrentMonth();
          const year = getCurrentYear();

          const { data, error } = await supabase
            .from('budgets')
            .upsert({
              user_id: user.id,
              category: parsed.budget.category,
              amount: parsed.budget.amount,
              month,
              year,
            }, {
              onConflict: 'user_id,category,month,year'
            })
            .select();

          if (error) {
            responseMessage = `I couldn't set that budget. ${error.message}`;
          } else {
            actionPerformed = true;
            responseMessage = `✓ Set ${parsed.budget.category} budget to ₹${parsed.budget.amount} for this month.`;
          }
        } else {
          responseMessage = "I couldn't extract the budget details. Please specify the category and amount.";
        }
        break;

      case 'split_expense':
        if (parsed.split) {
          const amountPerPerson = parsed.split.amount / (parsed.split.people.length + 1);

          // Create the main expense
          const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .insert({
              user_id: user.id,
              amount: parsed.split.amount,
              category: parsed.split.category,
              notes: `Split with ${parsed.split.people.join(', ')}${parsed.split.notes ? ` - ${parsed.split.notes}` : ''}`,
              expense_date: new Date().toISOString().split('T')[0],
            })
            .select()
            .single();

          if (expenseError) {
            responseMessage = `I couldn't create the split expense. ${expenseError.message}`;
          } else {
            // Create split records
            const splitRecords = parsed.split.people.map(person => ({
              user_id: user.id,
              expense_id: expenseData.id,
              person_name: person,
              amount_owed: amountPerPerson,
              is_settled: false,
            }));

            const { error: splitError } = await supabase
              .from('split_expenses')
              .insert(splitRecords);

            if (splitError) {
              responseMessage = `Expense created, but couldn't track splits. ${splitError.message}`;
            } else {
              actionPerformed = true;
              responseMessage = `✓ Split ₹${parsed.split.amount} between you and ${parsed.split.people.join(', ')}. Each person owes ₹${amountPerPerson.toFixed(2)}.`;
            }
          }
        } else {
          responseMessage = "I couldn't extract the split expense details. Please specify the amount and people involved.";
        }
        break;

      case 'trip_plan':
        if (parsed.trip) {
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .insert({
              user_id: user.id,
              name: `Trip to ${parsed.trip.destination}`,
              destination: parsed.trip.destination,
              start_date: parsed.trip.start_date || new Date().toISOString().split('T')[0],
              budget: parsed.trip.budget,
              is_active: true,
            })
            .select()
            .single();

          if (tripError) {
            responseMessage = `I couldn't create that trip. ${tripError.message}`;
          } else {
            actionPerformed = true;
            responseMessage = `✓ Trip to ${parsed.trip.destination} planned!${parsed.trip.budget ? ` Budget: ₹${parsed.trip.budget}` : ''} Your expenses for this trip will be tracked automatically.`;
          }
        } else {
          responseMessage = "I couldn't extract the trip details. Please specify the destination.";
        }
        break;

      case 'query':
        // Fetch user's expense data for context
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .order('expense_date', { ascending: false });

        const totalSpent = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0) || 0;

        // Calculate category totals
        const categoryMap = new Map<string, { total: number; count: number }>();
        expenses?.forEach(exp => {
          const existing = categoryMap.get(exp.category) || { total: 0, count: 0 };
          categoryMap.set(exp.category, {
            total: existing.total + parseFloat(exp.amount.toString()),
            count: existing.count + 1,
          });
        });

        const categoryTotals = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category: category as any,
          total: data.total,
          count: data.count,
          percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
        }));

        responseMessage = await answerFinancialQuery(
          message,
          expenses || [],
          categoryTotals,
          totalSpent
        );
        break;

      default:
        responseMessage = "I'm not sure what you're asking. Try commands like:\n• 'Spent ₹500 on petrol'\n• 'Set food budget to ₹10000'\n• 'Split ₹3000 with Ravi and Jay'\n• 'How much did I spend on food?'";
    }

    // Save assistant response to chat history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'assistant',
      content: responseMessage,
      metadata: { intent: parsed.intent, actionPerformed },
    });

    return NextResponse.json({
      message: responseMessage,
      intent: parsed.intent,
      actionPerformed,
    });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
