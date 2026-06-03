'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface GroupSummaryProps {
  group: any;
  members: any[];
  expenses: any[];
  splits: any[];
  currentUser: any;
  onUpdate: () => void;
}

export default function GroupSummary({ 
  group, 
  members, 
  expenses, 
  splits, 
  currentUser,
  onUpdate 
}: GroupSummaryProps) {
  const supabase = createClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const computeBalances = () => {
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

  const balances = computeBalances();

  // Calculate chart data
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

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Group Fund Box */}
      {group.group_fund > 0 || totalGroupFundSpent > 0 ? (
        <div className="bg-[#FFF3CD] border border-[#F0C040] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📦</span>
            <h3 className="font-['var(--font-playfair)'] font-semibold text-[#8B4513] text-xl">
              Group Fund
            </h3>
          </div>
          <div className="space-y-2 font-['var(--font-dm-sans)']">
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
              <span className="font-bold text-xl">
                {formatCurrency(group.group_fund || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Balance Sheet */}
      <div className="bg-white rounded-2xl border border-[#E8DDD0] p-6">
        <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-xl mb-4">
          Balance Sheet
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full font-['var(--font-dm-sans)']">
            <thead>
              <tr className="border-b border-[#E8DDD0]">
                <th className="text-left py-3 px-2 text-sm font-semibold text-[#6B5744]">Member</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-[#6B5744]">Total Paid</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-[#6B5744]">Total Owes</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-[#6B5744]">Net Balance</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-[#6B5744]">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(balances).map(([name, data]: [string, any]) => (
                <tr key={name} className="border-b border-[#E8DDD0] last:border-0">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-sm font-semibold">
                        {name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-[#1A1208]">{name}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 text-[#1A1208]">
                    {formatCurrency(data.paid)}
                  </td>
                  <td className="text-right py-3 px-2 text-[#1A1208]">
                    {formatCurrency(data.owes)}
                  </td>
                  <td className="text-right py-3 px-2">
                    <span className={`font-semibold ${
                      data.net > 0 ? 'text-green-600' : data.net < 0 ? 'text-red-600' : 'text-[#6B5744]'
                    }`}>
                      {data.net > 0 ? '+' : ''}{formatCurrency(data.net)}
                    </span>
                  </td>
                  <td className="text-right py-3 px-2">
                    {data.net < 0 && (
                      <button
                        onClick={() => handleSettleUp(name)}
                        className="px-3 py-1.5 text-xs bg-[#8B4513] text-white rounded-lg hover:bg-[#6B3410] transition-colors font-medium"
                      >
                        Settle Up
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Object.keys(balances).length === 0 && (
          <p className="text-center text-[#6B5744] py-8">No balance data yet</p>
        )}
      </div>

      {/* Pie Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8DDD0] p-6">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-xl mb-4">
            Spending by Member
          </h3>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E8DDD0',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-dm-sans)'
                }}
              />
              <Legend 
                wrapperStyle={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '14px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Expenses List */}
      <div className="bg-white rounded-2xl border border-[#E8DDD0] p-6">
        <h3 className="font-['var(--font-playfair)'] font-semibold text-[#1A1208] text-xl mb-4">
          Recent Expenses
        </h3>
        
        <div className="space-y-3">
          {expenses.slice(0, 10).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between py-3 border-b border-[#E8DDD0] last:border-0">
              <div className="flex-1">
                <p className="font-['var(--font-dm-sans)'] font-medium text-[#1A1208]">
                  {expense.description}
                </p>
                <p className="text-xs text-[#6B5744] font-['var(--font-dm-sans)'] mt-0.5">
                  {expense.is_group_fund_expense ? (
                    <span className="inline-flex items-center gap-1">
                      <span>📦</span>
                      Group Fund
                    </span>
                  ) : (
                    `Paid by ${expense.paid_by_name || 'Unknown'}`
                  )}
                  {' · '}
                  {new Date(expense.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <p className="font-['var(--font-playfair)'] font-semibold text-[#8B4513] text-lg">
                {formatCurrency(expense.total_amount)}
              </p>
            </div>
          ))}
        </div>

        {expenses.length === 0 && (
          <p className="text-center text-[#6B5744] py-8 font-['var(--font-dm-sans)']">
            No expenses yet. Start adding expenses in the chat!
          </p>
        )}
      </div>
    </div>
  );
}
