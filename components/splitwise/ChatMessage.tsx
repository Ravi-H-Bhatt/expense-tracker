'use client';

import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, Clock, Trash2, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: any;
  isCurrentUser: boolean;
  expenses: any[];
  splits: any[];
  members: any[];
  currentUser: any;
  onExpenseUpdate: () => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export default function ChatMessage({
  message,
  isCurrentUser,
  expenses,
  splits,
  members,
  currentUser,
  onExpenseUpdate,
  onDeleteExpense
}: ChatMessageProps) {
  const supabase = createClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSettleSplit = async (splitId: string) => {
    try {
      const { error } = await supabase
        .from('expense_splits')
        .update({ 
          is_settled: true, 
          settled_at: new Date().toISOString(),
          settled_with_user_id: currentUser.id
        })
        .eq('id', splitId);

      if (error) throw error;

      toast.success('Split marked as settled!');
      onExpenseUpdate();
    } catch (error) {
      toast.error('Failed to settle split');
      console.error(error);
    }
  };

  // AI error message
  if (message.message_type === 'ai_error') {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 max-w-2xl">
          <p className="text-xs text-red-600 mb-1 font-['var(--font-dm-sans)'] font-semibold">Error</p>
          <div className="bg-red-50 border border-red-200 rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-red-800 font-['var(--font-dm-sans)'] whitespace-pre-wrap text-sm">{message.content}</p>
            <span className="text-xs text-red-600 opacity-60 mt-1 block">
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular chat message
  if (message.message_type === 'chat') {
    const isAI = message.display_name === 'RFin AI';
    
    if (isAI) {
      return (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#047857] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">✦</span>
          </div>
          <div className="flex-1 max-w-2xl">
            <p className="text-xs text-[#475569] mb-1 font-['var(--font-dm-sans)']">RFin AI</p>
            <div className="bg-[#F0EBE3] rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-[#0F172A] font-['var(--font-dm-sans)'] whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs text-[#475569] opacity-60 mt-1 block">
                {formatTime(message.created_at)}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-2xl ${isCurrentUser ? 'ml-12' : 'mr-12'}`}>
          {!isCurrentUser && (
            <p className="text-xs text-[#475569] mb-1 font-['var(--font-dm-sans)']">
              {message.display_name}
            </p>
          )}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isCurrentUser
                ? 'bg-[#047857] text-white rounded-br-sm'
                : 'bg-white border border-[#E2E8F0] rounded-bl-sm'
            }`}
          >
            <p className={`font-['var(--font-dm-sans)'] whitespace-pre-wrap ${isCurrentUser ? 'text-white' : 'text-[#0F172A]'}`}>
              {message.content}
            </p>
            <span className={`text-xs mt-1 block ${isCurrentUser ? 'text-white/60' : 'text-[#475569] opacity-60'}`}>
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Expense log message with embedded card
  if (message.message_type === 'expense_log') {
    const expenseData = message.metadata;
    const isGroupFund = expenseData.isGroupFundExpense;
    const expense = expenses.find(e => e.description === expenseData.description);

    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-[#FFF8F0] border border-[#F0E0C8] rounded-2xl p-4 lg:p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💸</span>
                <h4 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-base lg:text-lg">
                  {expenseData.description}
                </h4>
              </div>
              {expenseData.paidByName && !isGroupFund && (
                <p className="text-xs lg:text-sm text-[#475569] font-['var(--font-dm-sans)']">
                  Paid by: <span className="font-semibold">{expenseData.paidByName}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl lg:text-2xl font-['var(--font-playfair)'] font-bold text-[#047857]">
                {formatCurrency(expenseData.totalAmount)}
              </p>
              {expense && onDeleteExpense && (
                <button
                  onClick={() => {
                    if (confirm('Delete this expense? This will recalculate all balances.')) {
                      onDeleteExpense(expense.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Delete expense"
                >
                  <Trash2 className="w-4 h-4 text-[#475569] group-hover:text-red-600" />
                </button>
              )}
            </div>
          </div>

          {/* Splits or Group Fund Message */}
          {isGroupFund ? (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-3 lg:px-4 py-2 lg:py-3 flex items-center gap-2">
              <span>📦</span>
              <span className="text-xs lg:text-sm font-['var(--font-dm-sans)'] text-[#047857]">
                Paid from Group Fund — no individual debts
              </span>
            </div>
          ) : expenseData.splits && expenseData.splits.length > 0 ? (
            <div>
              <div className="h-px bg-[#E2E8F0] my-3" />
              <div className="space-y-1.5 lg:space-y-2">
                {expenseData.splits.map((split: any, idx: number) => {
                  // Find if this split is settled
                  const splitRecord = expense 
                    ? splits.find(s => s.expense_id === expense.id && s.display_name === split.name)
                    : null;
                  const isSettled = splitRecord?.is_settled;
                  const isPayer = split.name === expenseData.paidByName;

                  return (
                    <div key={idx} className="flex items-center justify-between py-1.5 lg:py-2">
                      <div className="flex items-center gap-2 lg:gap-3 flex-1">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-[#047857] text-white flex items-center justify-center text-xs lg:text-sm font-semibold">
                          {split.name[0].toUpperCase()}
                        </div>
                        <span className="font-['var(--font-dm-sans)'] font-medium text-[#0F172A] text-sm lg:text-base">
                          {split.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 lg:gap-4">
                        <span className="font-['var(--font-dm-sans)'] font-semibold text-[#047857] text-sm lg:text-base">
                          {formatCurrency(split.amount)}
                        </span>
                        {isPayer ? (
                          <span className="flex items-center gap-1 text-xs lg:text-sm text-green-600 font-['var(--font-dm-sans)']">
                            <Check className="w-3 h-3 lg:w-4 lg:h-4" />
                            <span className="hidden sm:inline">paid</span>
                          </span>
                        ) : isSettled ? (
                          <span className="flex items-center gap-1 text-xs lg:text-sm text-green-600 font-['var(--font-dm-sans)']">
                            <Check className="w-3 h-3 lg:w-4 lg:h-4" />
                            <span className="hidden sm:inline">settled</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs lg:text-sm text-orange-600 font-['var(--font-dm-sans)']">
                            <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                            <span className="hidden sm:inline">owes</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Timestamp */}
          <p className="text-xs text-[#475569] mt-3 lg:mt-4 text-right font-['var(--font-dm-sans)']">
            Added on {new Date(message.created_at).toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            })}
          </p>
        </div>
      </div>
    );
  }

  // AI response
  if (message.message_type === 'ai_response') {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#047857] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">🤖</span>
        </div>
        <div className="flex-1 max-w-2xl">
          <p className="text-xs text-[#475569] mb-1 font-['var(--font-dm-sans)']">RFin AI</p>
          <div className="bg-[#F0EBE3] rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-[#0F172A] font-['var(--font-dm-sans)'] whitespace-pre-wrap">{message.content}</p>
            <span className="text-xs text-[#475569] opacity-60 mt-1 block">
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
