import { createClient } from '@/lib/supabase/server';
import { getCurrentMonth, getCurrentYear, getMonthName } from '@/lib/format';
import AnalyticsCharts from '@/components/analytics/analytics-charts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  
  // Fetch all expenses for current year
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .gte('expense_date', `${currentYear}-01-01`)
    .order('expense_date', { ascending: true });

  // Category breakdown
  const categoryMap = new Map<string, number>();
  expenses?.forEach(exp => {
    const current = categoryMap.get(exp.category) || 0;
    categoryMap.set(exp.category, current + parseFloat(exp.amount.toString()));
  });

  const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  // Monthly trends
  const monthlyMap = new Map<number, number>();
  expenses?.forEach(exp => {
    const month = new Date(exp.expense_date).getMonth() + 1;
    const current = monthlyMap.get(month) || 0;
    monthlyMap.set(month, current + parseFloat(exp.amount.toString()));
  });

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: getMonthName(i + 1).substring(0, 3),
    amount: parseFloat((monthlyMap.get(i + 1) || 0).toFixed(2))
  }));

  const totalSpent = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0) || 0;
  const avgMonthly = totalSpent / currentMonth;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Visualize your spending patterns and trends
        </p>
      </div>

      <AnalyticsCharts
        categoryData={categoryData}
        monthlyData={monthlyData}
        totalSpent={totalSpent}
        avgMonthly={avgMonthly}
        transactionCount={expenses?.length || 0}
      />
    </div>
  );
}
