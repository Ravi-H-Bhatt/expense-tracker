'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface GroupSummaryProps {
  group: any;
  members: any[];
  expenses: any[];
  splits: any[];
  currentUser: any;
  onUpdate: () => void;
  onDeleteExpense?: (expenseId: string) => void;
  balances: Record<string, { paid: number; owes: number; net: number; userId: string }>;
  groupId?: string;
}

export default function GroupSummary({ 
  group, 
  members, 
  expenses, 
  splits, 
  currentUser,
  onUpdate,
  onDeleteExpense,
  balances,
  groupId
}: GroupSummaryProps) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'unread')
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
  };

  const subscribeToNotifications = () => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const handleSendPaymentRequest = async (memberName: string, amount: number) => {
    try {
      if (!groupId || !currentUser?.id) {
        toast.error('Cannot send request - missing data');
        return;
      }

      const debtor = members.find(m => m.display_name === memberName);
      if (!debtor) {
        toast.error('Member not found');
        return;
      }

      // Create payment request record
      const { error } = await supabase
        .from('payment_requests')
        .insert({
          from_user_id: currentUser.id,
          to_user_id: debtor.user_id,
          amount: amount,
          group_id: groupId,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Create notification for the debtor
      const requesterName = currentUser.profile?.full_name || currentUser.email?.split('@')[0] || 'Someone';
      await supabase
        .from('notifications')
        .insert({
          user_id: debtor.user_id,
          type: 'payment_request',
          title: `Payment request from ${requesterName}`,
          message: `${requesterName} is requesting ${formatCurrency(amount)} in ${group.name}`,
          group_id: groupId,
          from_user_id: currentUser.id,
          amount: amount,
          status: 'unread'
        });

      toast.success(`Payment request sent to ${memberName}!`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to send payment request');
      console.error(error);
    }
  };

  const handleSettleUp = async (memberName: string) => {
    try {
      // Find all unsettled splits for this member across all expenses
      const memberSplits = splits.filter(s => 
        s.display_name === memberName && 
        !s.is_settled &&
        expenses.find(e => e.id === s.expense_id)
      );

      if (memberSplits.length === 0) {
        toast.info('No outstanding debts to settle');
        return;
      }

      // Update all splits to settled
      const { error } = await supabase
        .from('expense_splits')
        .update({ 
          is_settled: true, 
          settled_at: new Date().toISOString(),
          settled_with_user_id: currentUser.id
        })
        .in('id', memberSplits.map(s => s.id));

      if (error) throw error;

      toast.success(`Settled all debts with ${memberName}!`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to settle');
      console.error(error);
    }
  };

  // Calculate chart data - derives from live expenses array
  const chartData = Object.entries(balances).map(([name, data]: [string, any]) => ({
    name,
    value: Math.max(0, data.paid),
  })).filter(item => item.value > 0);

  // Add group fund expenses as a separate slice
  const groupFundExpenses = expenses
    .filter(e => e.is_group_fund_expense)
    .reduce((sum, e) => sum + Number(e.total_amount), 0);

  if (groupFundExpenses > 0) {
    chartData.push({
      name: 'Group Fund',
      value: groupFundExpenses
    });
  }

  const COLORS = ['#8B4513', '#D4956A', '#F0C070', '#A0522D', '#DEB887', '#C19A6B'];

  const totalGroupFundSpent = expenses
    .filter(e => e.is_group_fund_expense)
    .reduce((sum, e) => sum + Number(e.total_amount), 0);

  // Calculate category breakdown for bar chart
  const categoryMap: Record<string, number> = {};
  expenses.forEach(exp => {
    const desc = exp.description.toLowerCase();
    let category = 'Other';
    
    if (desc.includes('food') || desc.includes('dinner') || desc.includes('lunch') || desc.includes('breakfast')) {
      category = 'Food';
    } else if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi') || desc.includes('cab')) {
      category = 'Transport';
    } else if (desc.includes('shop') || desc.includes('clothes') || desc.includes('shopping')) {
      category = 'Shopping';
    } else if (desc.includes('movie') || desc.includes('entertainment') || desc.includes('fun')) {
      category = 'Entertainment';
    } else if (desc.includes('grocery') || desc.includes('groceries')) {
      category = 'Groceries';
    }
    
    categoryMap[category] = (categoryMap[category] || 0) + Number(exp.total_amount);
  });

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="h-full overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6">
      {/* Payment Request Notifications */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 lg:p-6">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg lg:text-xl mb-3 lg:mb-4 flex items-center gap-2">
            <span>🔔</span> Payment Requests
          </h3>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-['var(--font-dm-sans)'] font-medium text-[#1A1208] text-sm lg:text-base">
                    {notif.title}
                  </p>
                  <p className="text-xs lg:text-sm text-[#6B5744] mt-1">
                    {notif.message}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    // Mark as read
                    await supabase
                      .from('notifications')
                      .update({ status: 'read', read_at: new Date().toISOString() })
                      .eq('id', notif.id);
                    fetchNotifications();
                    
                    // Initiate settlement
                    if (notif.type === 'payment_request') {
                      // Handle payment
                      toast.success('Marking as paid...');
                    }
                  }}
                  className="px-4 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#6B3410] transition-colors text-sm font-medium whitespace-nowrap ml-4"
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Fund Box */}
      {group.group_fund > 0 || totalGroupFundSpent > 0 ? (
        <div className="bg-[#FFF3CD] border border-[#F0C040] rounded-2xl p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <span className="text-xl lg:text-2xl">📦</span>
            <h3 className="font-['var(--font-playfair)'] font-semibold text-[#8B4513] text-lg lg:text-xl">
              Group Fund
            </h3>
          </div>
          <div className="space-y-2 font-['var(--font-dm-sans)'] text-sm lg:text-base">
            <div className="flex justify-between text-[#8B4513]">
              <span>Total Fund:</span>
              <span className="font-semibold">
                {formatCurrency((group.group_fund || 0) + totalGroupFundSpent)}
              </span>
            </div>
            <div className="flex justify-between text-[#8B4513]">
              <span>Total Spent:</span>
              <span className="font-semibold">{formatCurrency(totalGroupFundSpent)}</span>
            </div>
            <div className="h-px bg-[#F0C040] my-2" />
            <div className="flex justify-between text-[#8B4513]">
              <span className="font-semibold">Remaining:</span>
              <span className="font-bold text-lg lg:text-xl">
                {formatCurrency(group.group_fund || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Balance Sheet */}
      <div className="bg-white rounded-2xl border border-[#E8DDD0] p-4 lg:p-6">
        <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg lg:text-xl mb-3 lg:mb-4">
          Balance Sheet
        </h3>
        
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <div className="inline-block min-w-full align-middle px-4 lg:px-0">
            <table className="w-full font-['var(--font-dm-sans)']">
              <thead>
                <tr className="border-b border-[#E8DDD0]">
                  <th className="text-left py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#6B5744]">Member</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#6B5744]">Paid</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#6B5744]">Owes</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#6B5744]">Net</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#6B5744]">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(balances).map(([name, data]: [string, any]) => (
                  <tr key={name} className="border-b border-[#E8DDD0] last:border-0">
                    <td className="py-2 lg:py-3 px-1 lg:px-2">
                      <div className="flex items-center gap-1.5 lg:gap-2">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-xs lg:text-sm font-semibold flex-shrink-0">
                          {name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-[#1A1208] text-xs lg:text-base truncate">{name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2 text-[#1A1208] text-xs lg:text-base whitespace-nowrap">
                      {formatCurrency(data.paid)}
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2 text-[#1A1208] text-xs lg:text-base whitespace-nowrap">
                      {formatCurrency(data.owes)}
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2">
                      <span className={`font-semibold text-xs lg:text-base whitespace-nowrap ${
                        data.net > 0 ? 'text-green-600' : data.net < 0 ? 'text-red-600' : 'text-[#6B5744]'
                      }`}>
                        {data.net === 0 ? 'Settled' : `${data.net > 0 ? '+' : ''}${formatCurrency(data.net)}`}
                      </span>
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2">
                      {/* Current user's row */}
                      {data.userId === currentUser?.id && data.net < 0 && (
                        <button
                          onClick={() => handleSettleUp(name)}
                          className="px-2 lg:px-3 py-1 lg:py-1.5 text-xs bg-[#8B4513] text-white rounded-lg hover:bg-[#6B3410] transition-colors font-medium whitespace-nowrap"
                          title={`Pay ₹${Math.abs(data.net).toLocaleString('en-IN')} to settle`}
                        >
                          Pay
                        </button>
                      )}
                      {/* Other member's row who owes current user */}
                      {data.userId !== currentUser?.id && data.net < 0 && (
                        <button
                          onClick={() => handleSendPaymentRequest(name, Math.abs(data.net))}
                          className="px-2 lg:px-3 py-1 lg:py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium whitespace-nowrap"
                          title={`Request ₹${Math.abs(data.net).toLocaleString('en-IN')} from ${name}`}
                        >
                          Request
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {Object.keys(balances).length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#F5EFE6] flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl lg:text-3xl">💰</span>
            </div>
            <p className="text-[#6B5744] font-['var(--font-dm-sans)'] text-sm lg:text-base">No balance data yet</p>
          </div>
        )}
      </div>

      {/* Pie Chart - Reactive with Empty State */}
      <div className="bg-white rounded-2xl border border-[#E8DDD0] p-4 lg:p-6">
        <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg lg:text-xl mb-3 lg:mb-4">
          Spending by Member
        </h3>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={90}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E8DDD0',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '14px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 lg:py-16">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border-8 border-gray-200 mb-4"></div>
            <p className="text-[#6B5744] font-['var(--font-dm-sans)'] text-sm lg:text-base">No expenses yet</p>
          </div>
        )}
      </div>

      {/* Bar Chart - Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8DDD0] p-4 lg:p-6">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg lg:text-xl mb-3 lg:mb-4">
            Spending by Category
          </h3>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6B5744', fontSize: 12 }}
                axisLine={{ stroke: '#E8DDD0' }}
              />
              <YAxis 
                tick={{ fill: '#6B5744', fontSize: 12 }}
                axisLine={{ stroke: '#E8DDD0' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E8DDD0',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="value" fill="#8B4513" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Expenses List with Delete Button */}
      <div className="bg-white rounded-2xl border border-[#E8DDD0] p-4 lg:p-6">
        <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-lg lg:text-xl mb-3 lg:mb-4">
          Recent Expenses
        </h3>
        
        <div className="space-y-2 lg:space-y-3">
          {expenses.slice(0, 10).map((expense) => (
            <div key={expense.id} className="flex items-center gap-2 lg:gap-3 py-2 lg:py-3 border-b border-[#E8DDD0] last:border-0">
              <div className="text-xl lg:text-2xl">
                {expense.is_group_fund_expense ? '📦' : '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['var(--font-dm-sans)'] font-medium text-[#1A1208] text-sm lg:text-base truncate">
                  {expense.description}
                </p>
                <p className="text-xs text-[#6B5744] font-['var(--font-dm-sans)'] mt-0.5">
                  {expense.is_group_fund_expense ? (
                    <span className="inline-flex items-center gap-1">
                      <span>Group Fund</span>
                    </span>
                  ) : (
                    `Paid by ${expense.paid_by_name || 'Unknown'}`
                  )}
                  {' · '}
                  {new Date(expense.created_at).toLocaleDateString('en-IN', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <p className="font-['var(--font-playfair)'] font-semibold text-[#8B4513] text-base lg:text-lg whitespace-nowrap">
                {formatCurrency(expense.total_amount)}
              </p>
              {onDeleteExpense && (
                <button
                  onClick={() => {
                    if (confirm('Delete this expense? This will recalculate all balances.')) {
                      onDeleteExpense(expense.id);
                    }
                  }}
                  className="p-1.5 lg:p-2 hover:bg-red-50 rounded-lg transition-colors group flex-shrink-0"
                  title="Delete expense"
                >
                  <Trash2 className="w-4 h-4 text-[#6B5744] group-hover:text-red-600" />
                </button>
              )}
            </div>
          ))}
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-8 lg:py-12">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#F5EFE6] flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl lg:text-3xl">📝</span>
            </div>
            <p className="text-[#6B5744] font-['var(--font-dm-sans)'] text-sm lg:text-base mb-1">
              No expenses yet
            </p>
            <p className="text-xs lg:text-sm text-[#A89880] font-['var(--font-dm-sans)']">
              Start adding expenses in the chat!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
