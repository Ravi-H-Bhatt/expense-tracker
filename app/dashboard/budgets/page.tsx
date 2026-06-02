'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, getCurrentMonth, getCurrentYear, getMonthName } from '@/lib/format';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import type { ExpenseCategory } from '@/types';

const categories: ExpenseCategory[] = ['Food', 'Petrol', 'Friends', 'Shopping', 'Bills', 'Entertainment', 'Travel', 'Other'];

interface Budget {
  id: string;
  category: ExpenseCategory;
  amount: number;
  month: number;
  year: number;
}

interface CategorySpending {
  category: ExpenseCategory;
  budget: number;
  spent: number;
  percentage: number;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  
  const [formData, setFormData] = useState({
    category: 'Food' as ExpenseCategory,
    amount: '',
  });

  const supabase = createClient();

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  const fetchBudgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (budgetError) throw budgetError;

      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', firstDay)
        .lte('expense_date', lastDay);

      if (expenseError) throw expenseError;

      const spendingMap = new Map<string, number>();
      expenseData?.forEach(exp => {
        const current = spendingMap.get(exp.category) || 0;
        spendingMap.set(exp.category, current + parseFloat(exp.amount.toString()));
      });

      const categorySpending: CategorySpending[] = categories.map(cat => {
        const budget = budgetData?.find(b => b.category === cat);
        const spent = spendingMap.get(cat) || 0;
        return {
          category: cat,
          budget: budget ? parseFloat(budget.amount.toString()) : 0,
          spent,
          percentage: budget ? (spent / parseFloat(budget.amount.toString())) * 100 : 0,
        };
      }).filter(cs => cs.budget > 0 || cs.spent > 0);

      setBudgets(budgetData || []);
      setSpending(categorySpending);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('budgets').upsert({
        user_id: user.id,
        category: formData.category,
        amount: parseFloat(formData.amount),
        month: selectedMonth,
        year: selectedYear,
      }, {
        onConflict: 'user_id,category,month,year'
      });

      if (error) throw error;

      toast.success('Budget saved successfully!');
      setIsDialogOpen(false);
      setFormData({ category: 'Food', amount: '' });
      fetchBudgets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const totalBudget = spending.reduce((sum, s) => sum + s.budget, 0);
  const totalSpent = spending.reduce((sum, s) => sum + s.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Budgets</h1>
          <p className="text-muted-foreground">
            Manage your monthly budgets by category
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>{getMonthName(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Budget for {getMonthName(selectedMonth)} {selectedYear}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Budget'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Overall Budget Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget - totalSpent)}</p>
            </div>
          </div>
          <Progress value={Math.min(overallPercentage, 100)} className="h-3" />
          <p className="text-sm text-muted-foreground text-center">
            {overallPercentage.toFixed(1)}% of budget used
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {spending.map((item) => (
          <Card key={item.category} className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.category}</CardTitle>
                {item.percentage > 100 ? (
                  <TrendingUp className="w-5 h-5 text-destructive" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-semibold">{formatCurrency(item.budget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spent:</span>
                <span className="font-semibold">{formatCurrency(item.spent)}</span>
              </div>
              <Progress 
                value={Math.min(item.percentage, 100)} 
                className={`h-2 ${item.percentage > 100 ? 'bg-destructive/20' : ''}`}
              />
              <div className="flex justify-between text-xs">
                <span className={item.percentage > 100 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {item.percentage.toFixed(1)}% used
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(item.budget - item.spent)} left
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {spending.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No budgets set for {getMonthName(selectedMonth)} {selectedYear}</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Set Your First Budget
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
