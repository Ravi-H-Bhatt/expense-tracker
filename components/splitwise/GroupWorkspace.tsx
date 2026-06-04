'use client';

import { useState, useEffect, useRef, useReducer } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Users, Copy, Check, Plus, Trash2, AlertCircle } from 'lucide-react';
import ChatMessage from './ChatMessage';
import GroupSummary from './GroupSummary';
import ExpenseConfirmCard from './ExpenseConfirmCard';
import ManualExpenseModal from './ManualExpenseModal';

interface GroupWorkspaceProps {
  groupId: string;
  currentUser: any;
  onGroupDeleted: () => void;
}

// Shared state action types
type SharedStateAction = 
  | { type: 'SET_INITIAL_DATA'; payload: { expenses: any[]; splits: any[]; members: any[]; group: any; messages: any[] } }
  | { type: 'ADD_EXPENSE'; payload: { expense: any; splits: any[] } }
  | { type: 'DELETE_EXPENSE'; payload: { id: string } }
  | { type: 'DELETE_ALL_EXPENSES' }
  | { type: 'SETTLE_UP'; payload: { fromName: string; toName: string; amount: number } }
  | { type: 'ADD_MESSAGE'; payload: any }
  | { type: 'UPDATE_GROUP_FUND'; payload: number };

interface SharedState {
  expenses: any[];
  splits: any[];
  members: any[];
  group: any;
  messages: any[];
  balances: Record<string, { paid: number; owes: number; net: number; userId: string }>;
}

// Compute balances from expenses and splits
function computeBalances(expenses: any[], splits: any[], members: any[]) {
  const balances: any = {};
  members.forEach(m => {
    balances[m.display_name] = { 
      paid: 0, 
      owes: 0, 
      net: 0,
      userId: m.user_id 
    };
  });

  expenses.forEach(exp => {
    if (exp.is_group_fund_expense) return;
    if (exp.paid_by_name && balances[exp.paid_by_name] !== undefined) {
      balances[exp.paid_by_name].paid += Number(exp.total_amount);
    }
  });

  const expenseIds = expenses.map(e => e.id);
  const relevantSplits = splits.filter(s => expenseIds.includes(s.expense_id));

  relevantSplits.forEach(split => {
    if (!split.is_settled && balances[split.display_name]) {
      balances[split.display_name].owes += Number(split.amount_owed);
    }
  });

  Object.keys(balances).forEach(name => {
    balances[name].net = balances[name].paid - balances[name].owes;
  });

  return balances;
}

// Shared state reducer
function sharedStateReducer(state: SharedState, action: SharedStateAction): SharedState {
  switch (action.type) {
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        expenses: action.payload.expenses,
        splits: action.payload.splits,
        members: action.payload.members,
        group: action.payload.group,
        messages: action.payload.messages,
        balances: computeBalances(action.payload.expenses, action.payload.splits, action.payload.members)
      };
    
    case 'ADD_EXPENSE':
      const newExpenses = [action.payload.expense, ...state.expenses];
      const newSplits = [...state.splits, ...action.payload.splits];
      return {
        ...state,
        expenses: newExpenses,
        splits: newSplits,
        balances: computeBalances(newExpenses, newSplits, state.members)
      };
    
    case 'DELETE_EXPENSE':
      const filteredExpenses = state.expenses.filter(e => e.id !== action.payload.id);
      const filteredSplits = state.splits.filter(s => s.expense_id !== action.payload.id);
      return {
        ...state,
        expenses: filteredExpenses,
        splits: filteredSplits,
        balances: computeBalances(filteredExpenses, filteredSplits, state.members)
      };
    
    case 'DELETE_ALL_EXPENSES':
      return {
        ...state,
        expenses: [],
        splits: [],
        balances: computeBalances([], [], state.members)
      };
    
    case 'SETTLE_UP':
      // Mark all splits from "fromName" as settled
      const updatedSplits = state.splits.map(s => 
        s.display_name === action.payload.fromName && !s.is_settled
          ? { ...s, is_settled: true, settled_at: new Date().toISOString() }
          : s
      );
      return {
        ...state,
        splits: updatedSplits,
        balances: computeBalances(state.expenses, updatedSplits, state.members)
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case 'UPDATE_GROUP_FUND':
      return {
        ...state,
        group: { ...state.group, group_fund: action.payload }
      };
    
    default:
      return state;
  }
}

export default function GroupWorkspace({ groupId, currentUser, onGroupDeleted }: GroupWorkspaceProps) {
  // Shared state using useReducer
  const [state, dispatch] = useReducer(sharedStateReducer, {
    expenses: [],
    splits: [],
    members: [],
    group: null,
    messages: [],
    balances: {}
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'summary'>('chat');
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<any>(null);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [showManualExpense, setShowManualExpense] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const supabase = createClient();

  useEffect(() => {
    if (groupId && currentUser) {
      fetchGroupData();
      subscribeToRealtime();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [groupId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + 'px';
    }
  }, [messageInput]);

  const fetchGroupData = async () => {
    try {
      setIsLoading(true);
      if (!groupId || !currentUser?.id) {
        throw new Error('Missing group or user ID');
      }

      // Parallel fetches with error handling
      const results = await Promise.allSettled([
        supabase.from('split_groups').select('*').eq('id', groupId).single(),
        supabase.from('group_members').select('*').eq('group_id', groupId).order('joined_at', { ascending: true }),
        supabase.from('group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }),
        supabase.from('group_expenses').select('*').eq('group_id', groupId).order('created_at', { ascending: false }),
        supabase.from('expense_splits').select('*')
      ]);

      const [groupResult, membersResult, messagesResult, expensesResult, splitsResult] = results;

      if (groupResult.status === 'rejected' || !groupResult.value?.data) {
        throw new Error('Failed to fetch group');
      }

      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: {
          group: groupResult.value.data,
          members: membersResult.status === 'fulfilled' ? (membersResult.value?.data || []) : [],
          messages: messagesResult.status === 'fulfilled' ? (messagesResult.value?.data || []) : [],
          expenses: expensesResult.status === 'fulfilled' ? (expensesResult.value?.data || []) : [],
          splits: splitsResult.status === 'fulfilled' ? (splitsResult.value?.data || []) : []
        }
      });
    } catch (error: any) {
      console.error('Error fetching group data:', error);
      toast.error('Failed to load group. Retrying...');
      // Retry once after 2 seconds
      setTimeout(() => fetchGroupData(), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToRealtime = () => {
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      }, (payload) => {
        dispatch({ type: 'ADD_MESSAGE', payload: payload.new });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_expenses',
        filter: `group_id=eq.${groupId}`
      }, () => {
        fetchGroupData(); // Refetch all data when new expense is added
      })
      .subscribe();
  };

  // Parse AI response for structured actions
  const parseAIAction = (response: string): any => {
    try {
      // Look for JSON action blocks
      const jsonMatch = response.match(/\{[\s\S]*"action"[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: parse natural language commands
      const lowerResponse = response.toLowerCase();
      
      // Delete all
      if (lowerResponse.includes('deleted all') || lowerResponse.includes('cleared all') || lowerResponse.includes('reset')) {
        return { action: 'DELETE_ALL' };
      }

      // Settle up
      const settleMatch = response.match(/settled?.*?(?:between|with)\s+(\w+)\s+(?:and|with)\s+(\w+)/i);
      if (settleMatch) {
        return { action: 'SETTLE_UP', from: settleMatch[1], to: settleMatch[2] };
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  // Execute AI action
  const executeAIAction = async (action: any) => {
    if (!action) return;

    try {
      switch (action.action) {
        case 'DELETE_ALL':
          // Delete all expenses from DB
          const expenseIds = state.expenses.map(e => e.id);
          if (expenseIds.length > 0) {
            await supabase.from('expense_splits').delete().in('expense_id', expenseIds);
            await supabase.from('group_expenses').delete().in('id', expenseIds);
          }
          dispatch({ type: 'DELETE_ALL_EXPENSES' });
          toast.success('All expenses cleared!');
          break;

        case 'SETTLE_UP':
          const member = state.members.find(m => 
            m.display_name.toLowerCase() === action.from.toLowerCase()
          );
          if (member) {
            const memberSplits = state.splits.filter(s => 
              s.display_name === member.display_name && !s.is_settled
            );
            if (memberSplits.length > 0) {
              await supabase
                .from('expense_splits')
                .update({ 
                  is_settled: true, 
                  settled_at: new Date().toISOString(),
                  settled_with_user_id: currentUser.id
                })
                .in('id', memberSplits.map(s => s.id));
              
              dispatch({ type: 'SETTLE_UP', payload: { fromName: member.display_name, toName: '', amount: 0 } });
              toast.success(`Settled debts with ${member.display_name}!`);
            }
          }
          break;

        case 'DELETE_EXPENSE':
          if (action.expenseId) {
            await supabase.from('expense_splits').delete().eq('expense_id', action.expenseId);
            await supabase.from('group_expenses').delete().eq('id', action.expenseId);
            dispatch({ type: 'DELETE_EXPENSE', payload: { id: action.expenseId } });
            toast.success('Expense deleted!');
          }
          break;
      }
    } catch (error) {
      console.error('Failed to execute AI action:', error);
      toast.error('Failed to execute action');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || isSending || !currentUser) return;

    const userMessage = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    try {
      // Save user message to DB
      const displayName = currentUser.profile?.full_name || currentUser.email?.split('@')[0] || 'User';
      
      await supabase.from('group_messages').insert({
        group_id: groupId,
        user_id: currentUser.id,
        display_name: displayName,
        content: userMessage,
        message_type: 'chat'
      });

      // Call AI function
      setIsAiProcessing(true);
      
      const conversationHistory = state.messages.slice(-10).map(msg => ({
        role: msg.user_id === currentUser.id ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/.netlify/functions/splitwise-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          groupContext: {
            groupName: state.group.name,
            members: state.members,
            groupFund: state.group.group_fund || 0,
            balances: state.balances
          },
          history: conversationHistory
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      const { reply, parsedExpense } = await response.json();

      // Save AI reply
      await supabase.from('group_messages').insert({
        group_id: groupId,
        user_id: currentUser.id,
        display_name: 'RFin AI',
        content: reply,
        message_type: 'ai_response'
      });

      // Parse AI action from response
      const aiAction = parseAIAction(reply);
      if (aiAction) {
        await executeAIAction(aiAction);
      }

      // If expense detected, show confirmation
      if (parsedExpense?.isExpense) {
        setPendingExpense(parsedExpense);
      }

    } catch (error: any) {
      toast.error('Failed to send message');
      console.error(error);
      
      // Show error message in chat
      await supabase.from('group_messages').insert({
        group_id: groupId,
        user_id: currentUser.id,
        display_name: 'RFin AI',
        content: 'Sorry, I encountered an error processing your message. Please try rephrasing, like: "I paid ₹500 for dinner with Krisha"',
        message_type: 'ai_error'
      });
    } finally {
      setIsSending(false);
      setIsAiProcessing(false);
    }
  };

  const handleConfirmExpense = async (expense: any) => {
    try {
      // Insert expense
      const { data: expenseRow, error: expenseError } = await supabase
        .from('group_expenses')
        .insert({
          group_id: groupId,
          added_by: currentUser.id,
          description: expense.description,
          total_amount: expense.totalAmount,
          is_group_fund_expense: expense.isGroupFundExpense,
          paid_by_name: expense.paidByName
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Insert splits if not group fund expense
      const newSplits: any[] = [];
      if (!expense.isGroupFundExpense && expense.splits?.length > 0) {
        // Match display names to user IDs
        const splitsWithUserIds = expense.splits.map((split: any) => {
          const member = state.members.find(m => 
            m.display_name.toLowerCase() === split.name.toLowerCase()
          );
          return {
            expense_id: expenseRow.id,
            user_id: member?.user_id || null,
            display_name: split.name,
            amount_owed: split.amount,
            is_settled: false
          };
        });

        const { data: insertedSplits, error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsWithUserIds)
          .select();

        if (splitsError) throw splitsError;
        newSplits.push(...(insertedSplits || []));
      }

      // Update local state
      dispatch({
        type: 'ADD_EXPENSE',
        payload: {
          expense: expenseRow,
          splits: newSplits
        }
      });

      // Update group fund if group fund expense
      if (expense.isGroupFundExpense) {
        const newFund = (state.group.group_fund || 0) - expense.totalAmount;
        const { error: fundError } = await supabase
          .from('split_groups')
          .update({ group_fund: Math.max(0, newFund) })
          .eq('id', groupId);

        if (fundError) throw fundError;
        dispatch({ type: 'UPDATE_GROUP_FUND', payload: Math.max(0, newFund) });
      }

      // Post expense log message
      const displayName = currentUser.profile?.full_name || currentUser.email?.split('@')[0] || 'User';
      await supabase.from('group_messages').insert({
        group_id: groupId,
        user_id: currentUser.id,
        display_name: displayName,
        content: expense.description,
        message_type: 'expense_log',
        metadata: expense
      });

      setPendingExpense(null);
      toast.success('Expense added!');

    } catch (error: any) {
      toast.error('Failed to add expense');
      console.error(error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      // Delete from DB
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
      await supabase.from('group_expenses').delete().eq('id', expenseId);

      // Update local state
      dispatch({ type: 'DELETE_EXPENSE', payload: { id: expenseId } });
      toast.success('Expense deleted!');
    } catch (error) {
      toast.error('Failed to delete expense');
      console.error(error);
    }
  };

  const computeBalances = () => {
    return state.balances;
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${state.group.invite_token}`;
    navigator.clipboard.writeText(link);
    setInviteLinkCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setInviteLinkCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[#6B5744]">Loading group...</div>
      </div>
    );
  }

  if (!state.group) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Compute current user's balance for balance bar
  const currentUserMember = state.members.find(m => m.user_id === currentUser?.id);
  const currentUserBalance = currentUserMember ? state.balances[currentUserMember.display_name] : null;
  const owesAmount = currentUserBalance ? currentUserBalance.net : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="h-14 lg:h-16 border-b border-border px-3 lg:px-6 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
          <h2 className="text-lg lg:text-xl font-['var(--font-playfair)'] font-semibold text-[#1A1208] truncate">
            {state.group.name}
          </h2>
          {state.group.group_fund > 0 && (
            <div className="hidden sm:flex px-3 py-1 bg-[#FFF3CD] rounded-full text-xs lg:text-sm font-['var(--font-dm-sans)'] font-medium text-[#8B4513] whitespace-nowrap">
              Fund: {formatCurrency(state.group.group_fund)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Add Expense Button - Mobile friendly */}
          <button
            onClick={() => setShowManualExpense(true)}
            className="px-2.5 lg:px-4 py-1.5 lg:py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#6B3410] transition-colors text-xs lg:text-sm font-['var(--font-dm-sans)'] font-medium flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>

          {/* Member avatars - Hidden on small mobile */}
          <div className="hidden md:flex -space-x-2">
            {state.members.slice(0, 5).map((member, idx) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-xs font-['var(--font-dm-sans)'] font-semibold border-2 border-white"
                title={member.display_name}
              >
                {member.display_name[0].toUpperCase()}
              </div>
            ))}
            {state.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-[#D4956A] text-white flex items-center justify-center text-xs font-['var(--font-dm-sans)'] font-semibold border-2 border-white">
                +{state.members.length - 5}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowInviteLink(!showInviteLink)}
            className="px-2.5 lg:px-4 py-1.5 lg:py-2 border border-[#8B4513] text-[#8B4513] rounded-lg hover:bg-[#8B4513] hover:text-white transition-colors text-xs lg:text-sm font-['var(--font-dm-sans)'] font-medium"
          >
            <Users className="w-4 h-4 lg:inline" />
            <span className="hidden lg:inline ml-1.5">Invite</span>
          </button>
        </div>
      </div>

      {/* Invite Link Banner */}
      {showInviteLink && (
        <div className="bg-[#FFF3CD] border-b border-[#F0C040] px-3 lg:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs lg:text-sm font-['var(--font-dm-sans)'] text-[#8B4513] mb-1">
              Share this link to invite members:
            </p>
            <code className="text-xs bg-white px-2 lg:px-3 py-1.5 rounded border border-[#E8DDD0] text-[#1A1208] font-mono block truncate">
              {`${window.location.origin}/join/${state.group.invite_token}`}
            </code>
          </div>
          <button
            onClick={copyInviteLink}
            className="w-full sm:w-auto sm:ml-4 px-4 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#6B3410] transition-colors text-sm font-['var(--font-dm-sans)'] font-medium flex items-center justify-center gap-2"
          >
            {inviteLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {inviteLinkCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border bg-white px-3 lg:px-6">
        <div className="flex gap-4 lg:gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 lg:py-3 px-1 border-b-2 font-['var(--font-dm-sans)'] font-medium transition-colors text-sm lg:text-base whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-[#8B4513] text-[#8B4513]'
                : 'border-transparent text-[#6B5744] hover:text-[#8B4513]'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 lg:py-3 px-1 border-b-2 font-['var(--font-dm-sans)'] font-medium transition-colors text-sm lg:text-base whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-[#8B4513] text-[#8B4513]'
                : 'border-transparent text-[#6B5744] hover:text-[#8B4513]'
            }`}
          >
            📊 Summary
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col">
            {/* Balance Bar - Always visible in Chat */}
            {owesAmount !== 0 && (
              <div className={`px-4 py-2.5 flex items-center justify-between text-sm border-b ${
                owesAmount < 0 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : owesAmount > 0 
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="flex items-center gap-2 font-['var(--font-dm-sans)'] font-medium">
                  {owesAmount < 0 ? (
                    <>
                      <span>⚠️</span>
                      <span>You owe {formatCurrency(Math.abs(owesAmount))}</span>
                    </>
                  ) : owesAmount > 0 ? (
                    <>
                      <span>✓</span>
                      <span>You are owed {formatCurrency(owesAmount)}</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>All settled</span>
                    </>
                  )}
                </div>
                {owesAmount !== 0 && (
                  <button 
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      owesAmount < 0
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    Settle up
                  </button>
                )}
              </div>
            )}
            {owesAmount === 0 && state.expenses.length > 0 && (
              <div className="px-4 py-2.5 flex items-center justify-between text-sm border-b bg-gray-50 border-gray-200 text-gray-600">
                <div className="flex items-center gap-2 font-['var(--font-dm-sans)'] font-medium">
                  <span>✓</span>
                  <span>All settled</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 lg:px-6 py-4 space-y-4">
              {state.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-[#F5EFE6] flex items-center justify-center mb-4">
                    <span className="text-3xl">💬</span>
                  </div>
                  <h3 className="text-lg font-['var(--font-playfair)'] font-semibold text-[#1A1208] mb-2">
                    No expenses yet
                  </h3>
                  <p className="text-sm text-[#6B5744] font-['var(--font-dm-sans)'] mb-4">
                    Start by adding an expense below
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button 
                      onClick={() => setMessageInput('I paid ₹500 for dinner')}
                      className="px-3 py-1.5 bg-[#F5EFE6] text-[#8B4513] rounded-lg text-xs hover:bg-[#E8DDD0] transition-colors"
                    >
                      💡 I paid ₹500 for dinner
                    </button>
                    <button 
                      onClick={() => setMessageInput('Split ₹300 for groceries')}
                      className="px-3 py-1.5 bg-[#F5EFE6] text-[#8B4513] rounded-lg text-xs hover:bg-[#E8DDD0] transition-colors"
                    >
                      💡 Split ₹300 for groceries
                    </button>
                  </div>
                </div>
              )}

              {state.messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isCurrentUser={msg.user_id === currentUser?.id}
                  expenses={state.expenses}
                  splits={state.splits}
                  members={state.members}
                  currentUser={currentUser}
                  onExpenseUpdate={fetchGroupData}
                  onDeleteExpense={handleDeleteExpense}
                />
              ))}
              
              {isAiProcessing && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8B4513] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✦</span>
                  </div>
                  <div className="flex-1 max-w-2xl">
                    <p className="text-xs text-[#6B5744] mb-1 font-['var(--font-dm-sans)']">RFin AI</p>
                    <div className="bg-[#F0EBE3] rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-[#8B4513] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-[#8B4513] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-[#8B4513] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-sm text-[#6B5744]">Processing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pendingExpense && (
                <ExpenseConfirmCard
                  expense={pendingExpense}
                  onConfirm={handleConfirmExpense}
                  onCancel={() => setPendingExpense(null)}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border px-3 lg:px-6 py-3 lg:py-4 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2 lg:gap-3">
                <textarea
                  ref={textareaRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type an expense naturally, e.g. 'I paid ₹500 for dinner with Neha'"
                  className="flex-1 resize-none border border-[#E8DDD0] rounded-xl px-3 lg:px-4 py-2 lg:py-3 bg-white placeholder:text-[#A89880] text-[#1A1208] font-['var(--font-dm-sans)'] text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#D4956A] min-h-[44px] max-h-24"
                  rows={1}
                  disabled={isSending || isAiProcessing}
                />
                <button
                  type="submit"
                  disabled={isSending || isAiProcessing || !messageInput.trim()}
                  className="px-4 lg:px-6 py-2 lg:py-3 bg-[#8B4513] text-white rounded-xl hover:bg-[#6B3410] transition-colors font-['var(--font-dm-sans)'] font-medium text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#A89880] whitespace-nowrap self-end"
                >
                  {isSending || isAiProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    'Send'
                  )}
                </button>
              </form>
              <p className="text-xs text-[#A89880] mt-2 font-['var(--font-dm-sans)']">
                <span className="font-semibold">Tip:</span> Press Enter to send, Shift+Enter for new line. AI will understand and parse expenses automatically.
              </p>
            </div>
          </div>
        ) : (
          <GroupSummary
            group={state.group}
            members={state.members}
            expenses={state.expenses}
            splits={state.splits}
            currentUser={currentUser}
            onUpdate={fetchGroupData}
            onDeleteExpense={handleDeleteExpense}
            balances={state.balances}
            groupId={groupId}
          />
        )}
      </div>

      {/* Manual Expense Modal */}
      {showManualExpense && (
        <ManualExpenseModal
          onClose={() => setShowManualExpense(false)}
          onExpenseAdded={fetchGroupData}
          groupId={groupId}
          members={state.members}
          currentUser={currentUser}
          group={state.group}
        />
      )}
    </div>
  );
}
