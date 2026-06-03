'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Users, Copy, Check, Plus } from 'lucide-react';
import ChatMessage from './ChatMessage';
import GroupSummary from './GroupSummary';
import ExpenseConfirmCard from './ExpenseConfirmCard';
import ManualExpenseModal from './ManualExpenseModal';

interface GroupWorkspaceProps {
  groupId: string;
  currentUser: any;
  onGroupDeleted: () => void;
}

export default function GroupWorkspace({ groupId, currentUser, onGroupDeleted }: GroupWorkspaceProps) {
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
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
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroupData = async () => {
    setIsLoading(true);
    try {
      // Fetch group
      const { data: groupData, error: groupError } = await supabase
        .from('split_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('group_expenses')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      // Fetch splits
      const { data: splitsData, error: splitsError } = await supabase
        .from('expense_splits')
        .select('*');

      if (splitsError) throw splitsError;
      setSplits(splitsData || []);

    } catch (error: any) {
      toast.error('Failed to load group data');
      console.error(error);
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
        setMessages(prev => [...prev, payload.new]);
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
      const balances = computeBalances();
      
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.user_id === currentUser.id ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/.netlify/functions/splitwise-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          groupContext: {
            groupName: group.name,
            members: members,
            groupFund: group.group_fund || 0,
            balances
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

      // If expense detected, show confirmation
      if (parsedExpense?.isExpense) {
        setPendingExpense(parsedExpense);
      }

    } catch (error: any) {
      toast.error('Failed to send message');
      console.error(error);
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
      if (!expense.isGroupFundExpense && expense.splits?.length > 0) {
        // Match display names to user IDs
        const splitsWithUserIds = expense.splits.map((split: any) => {
          const member = members.find(m => 
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

        const { error: splitsError } = await supabase
          .from('expense_splits')
          .insert(splitsWithUserIds);

        if (splitsError) throw splitsError;
      }

      // Update group fund if group fund expense
      if (expense.isGroupFundExpense) {
        const newFund = (group.group_fund || 0) - expense.totalAmount;
        const { error: fundError } = await supabase
          .from('split_groups')
          .update({ group_fund: Math.max(0, newFund) })
          .eq('id', groupId);

        if (fundError) throw fundError;
        setGroup({ ...group, group_fund: Math.max(0, newFund) });
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

  const computeBalances = () => {
    const balances: any = {};
    members.forEach(m => {
      balances[m.display_name] = { paid: 0, owes: 0, net: 0 };
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
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${group.invite_token}`;
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

  if (!group) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Bar */}
      <div className="h-14 lg:h-16 border-b border-border px-3 lg:px-6 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
          <h2 className="text-lg lg:text-xl font-['var(--font-playfair)'] font-semibold text-[#1A1208] truncate">
            {group.name}
          </h2>
          {group.group_fund > 0 && (
            <div className="hidden sm:flex px-3 py-1 bg-[#FFF3CD] rounded-full text-xs lg:text-sm font-['var(--font-dm-sans)'] font-medium text-[#8B4513] whitespace-nowrap">
              Fund: {formatCurrency(group.group_fund)}
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
            {members.slice(0, 5).map((member, idx) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-xs font-['var(--font-dm-sans)'] font-semibold border-2 border-white"
                title={member.display_name}
              >
                {member.display_name[0].toUpperCase()}
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-[#D4956A] text-white flex items-center justify-center text-xs font-['var(--font-dm-sans)'] font-semibold border-2 border-white">
                +{members.length - 5}
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
              {`${window.location.origin}/join/${group.invite_token}`}
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
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isCurrentUser={msg.user_id === currentUser?.id}
                  expenses={expenses}
                  splits={splits}
                  members={members}
                  currentUser={currentUser}
                  onExpenseUpdate={fetchGroupData}
                />
              ))}
              
              {isAiProcessing && (
                <div className="flex items-center gap-2 text-[#6B5744] text-sm">
                  <div className="w-5 h-5 border-2 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
                  <span>AI is analyzing...</span>
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
              <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2 lg:gap-3">
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
                  className="flex-1 resize-none border border-[#E8DDD0] rounded-xl px-3 lg:px-4 py-2 lg:py-3 bg-white placeholder:text-[#A89880] text-[#1A1208] font-['var(--font-dm-sans)'] text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-[#D4956A] max-h-24"
                  rows={2}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !messageInput.trim()}
                  className="px-4 lg:px-6 py-2 lg:py-3 bg-[#8B4513] text-white rounded-xl hover:bg-[#6B3410] transition-colors font-['var(--font-dm-sans)'] font-medium text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
              <p className="text-xs text-[#A89880] mt-2 font-['var(--font-dm-sans)']">
                Tip: Just type naturally. AI will understand and parse expenses automatically.
              </p>
            </div>
          </div>
        ) : (
          <GroupSummary
            group={group}
            members={members}
            expenses={expenses}
            splits={splits}
            currentUser={currentUser}
            onUpdate={fetchGroupData}
          />
        )}
      </div>

      {/* Manual Expense Modal */}
      {showManualExpense && (
        <ManualExpenseModal
          onClose={() => setShowManualExpense(false)}
          onExpenseAdded={fetchGroupData}
          groupId={groupId}
          members={members}
          currentUser={currentUser}
          group={group}
        />
      )}
    </div>
  );
}
