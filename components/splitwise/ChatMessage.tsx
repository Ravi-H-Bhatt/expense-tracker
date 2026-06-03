'use client';

import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, Clock } from 'lucide-react';

interface ChatMessageProps {
  message: any;
  isCurrentUser: boolean;
  expenses: any[];
  splits: any[];
  members: any[];
  currentUser: any;
  onExpenseUpdate: () => void;
}

export default function ChatMessage({
  message,
  isCurrentUser,
  expenses,
  splits,
  members,
  currentUser,
  onExpenseUpdate
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

  // Regular chat message
  if (message.message_type === 'chat') {
    const isAI = message.display_name === 'RFin AI';
    
    if (isAI) {
      return (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8B4513] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">✦</span>
          </div>
          <div className="flex-1 max-w-2xl">
            <p className="text-xs text-[#6B5744] mb-1 font-['var(--font-dm-sans)']">RFin AI</p>
            <div className="bg-[#F0EBE3] rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-[#1A1208] font-['var(--font-dm-sans)'] whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs text-[#6B5744] opacity-60 mt-1 block">
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
            <p className="text-xs text-[#6B5744] mb-1 font-['var(--font-dm-sans)']">
              {message.display_name}
            </p>
          )}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isCurrentUser
                ? 'bg-[#8B4513] text-white rounded-br-sm'
                : 'bg-white border border-[#E8DDD0] rounded-bl-sm'
            }`}
          >
            <p className={`font-['var(--font-dm-sans)'] whitespace-pre-wrap ${isCurrentUser ? 'text-white' : 'text-[#1A1208]'}`}>
              {message.content}
            </p>
            <span className={`text-xs mt-1 block ${isCurrentUser ? 'text-white/60' : 'text-[#6B5744] opacity-60'}`}>
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Expense log message
  if (message.message_type === 'expense_log') {
    const expenseData = message.metadata;
    const isGroupFund = expenseData.isGroupFundExpense;

    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-[#FFF8F0] border border-[#F0E0C8] rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💸</span>
                <h4 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg">
                  {expenseData.description}
                </h4>
              </div>
              {expenseData.paidByName && !isGroupFund && (
                <p className="text-sm text-[#6B5744] font-['var(--font-dm-sans)']">
                  Paid by: <span className="font-semibold">{expenseData.paidByName}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-['var(--font-playfair)'] font-bold text-[#8B4513]">
                {formatCurrency(expenseData.totalAmount)}
              </p>
            </div>
          </div>

          {/* Splits or Group Fund Message */}
          {isGroupFund ? (
            <div className="bg-[#FFF3CD] border border-[#F0C040] rounded-xl px-4 py-3 flex items-center gap-2">
              <span>📦</span>
              <span className="text-sm font-['var(--font-dm-sans)'] text-[#8B4513]">
                Paid from Group Fund — no individual debts
              </span>
            </div>
          ) : expenseData.splits && expenseData.splits.length > 0 ? (
            <div>
              <div className="h-px bg-[#E8DDD0] my-4" />
              <div className="space-y-2">
                {expenseData.splits.map((split: any, idx: number) => {
                  // Find if this split is settled
                  const expense = expenses.find(e => e.description === expenseData.description);
                  const splitRecord = expense 
                    ? splits.find(s => s.expense_id === expense.id && s.display_name === split.name)
                    : null;
                  const isSettled = splitRecord?.is_settled;
                  const isPayer = split.name === expenseData.paidByName;

                  return (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-sm font-semibold">
                          {split.name[0].toUpperCase()}
                        </div>
                        <span className="font-['var(--font-dm-sans)'] font-medium text-[#1A1208]">
                          {split.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-['var(--font-dm-sans)'] font-semibold text-[#8B4513]">
                          {formatCurrency(split.amount)}
                        </span>
                        {isPayer ? (
                          <span className="flex items-center gap-1 text-sm text-green-600 font-['var(--font-dm-sans)']">
                            <Check className="w-4 h-4" />
                            paid
                          </span>
                        ) : isSettled ? (
                          <span className="flex items-center gap-1 text-sm text-green-600 font-['var(--font-dm-sans)']">
                            <Check className="w-4 h-4" />
                            settled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-orange-600 font-['var(--font-dm-sans)']">
                            <Clock className="w-4 h-4" />
                            owes
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
          <p className="text-xs text-[#6B5744] mt-4 text-right font-['var(--font-dm-sans)']">
            Added on {new Date(message.created_at).toLocaleString('en-IN')}
          </p>
        </div>
      </div>
    );
  }

  // AI response
  if (message.message_type === 'ai_response') {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#8B4513] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">🤖</span>
        </div>
        <div className="flex-1 max-w-2xl">
          <p className="text-xs text-[#6B5744] mb-1 font-['var(--font-dm-sans)']">RFin AI</p>
          <div className="bg-[#F0EBE3] rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-[#1A1208] font-['var(--font-dm-sans)'] whitespace-pre-wrap">{message.content}</p>
            <span className="text-xs text-[#6B5744] opacity-60 mt-1 block">
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
