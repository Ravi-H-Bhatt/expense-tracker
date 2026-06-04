'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { Plus, Pencil, Trash2, Search, Download, Calendar } from 'lucide-react';
import { EnhancedPDFGenerator } from '@/lib/enhanced-pdf-generator';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/types';

const categories: ExpenseCategory[] = ['Food', 'Petrol', 'Friends', 'Shopping', 'Bills', 'Entertainment', 'Travel', 'Other'];
const paymentMethods: PaymentMethod[] = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Other'];

const categoryColors: Record<ExpenseCategory, string> = {
  Food: 'bg-orange-500',
  Petrol: 'bg-blue-500',
  Friends: 'bg-purple-500',
  Shopping: 'bg-pink-500',
  Bills: 'bg-red-500',
  Entertainment: 'bg-green-500',
  Travel: 'bg-cyan-500',
  Other: 'bg-gray-500',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food' as ExpenseCategory,
    notes: '',
    payment_method: 'UPI' as PaymentMethod,
    expense_date: new Date().toISOString().split('T')[0],
  });

  const supabase = createClient();

  useEffect(() => {
    fetchUserAndExpenses();
  }, []);

  const fetchUserAndExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUser(user);
      await fetchExpenses();
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      toast.error('Failed to load expenses');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        category: formData.category,
        notes: formData.notes || null,
        payment_method: formData.payment_method || null,
        expense_date: formData.expense_date,
      });

      if (error) throw error;

      toast.success('Expense added successfully!');
      setIsAddDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Expense deleted');
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: 'Food',
      notes: '',
      payment_method: 'UPI',
      expense_date: new Date().toISOString().split('T')[0],
    });
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const handleExportReport = () => {
    try {
      const pdfGen = new EnhancedPDFGenerator();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];

      const userName = currentUser?.user_metadata?.full_name || 
                       currentUser?.email?.split('@')[0] || 
                       'User';

      if (reportType === 'monthly') {
        // Filter expenses by selected month and year
        const filteredByMonth = expenses.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
        });

        if (filteredByMonth.length === 0) {
          toast.error('No expenses found for selected month');
          return;
        }

        const totalAmount = filteredByMonth.reduce((sum, e) => sum + Number(e.amount), 0);

        // Category breakdown
        const categoryMap: Record<string, { amount: number; count: number }> = {};
        filteredByMonth.forEach(exp => {
          if (!categoryMap[exp.category]) {
            categoryMap[exp.category] = { amount: 0, count: 0 };
          }
          categoryMap[exp.category].amount += Number(exp.amount);
          categoryMap[exp.category].count += 1;
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count
        })).sort((a, b) => b.amount - a.amount);

        // Payment method breakdown
        const paymentMap: Record<string, { amount: number; count: number }> = {};
        filteredByMonth.forEach(exp => {
          const method = exp.payment_method || 'Not Specified';
          if (!paymentMap[method]) {
            paymentMap[method] = { amount: 0, count: 0 };
          }
          paymentMap[method].amount += Number(exp.amount);
          paymentMap[method].count += 1;
        });

        const paymentMethodBreakdown = Object.entries(paymentMap).map(([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count
        })).sort((a, b) => b.amount - a.amount);

        pdfGen.generatePersonalMonthlyReport({
          userName,
          month: monthNames[selectedMonth],
          year: selectedYear.toString(),
          expenses: filteredByMonth,
          totalAmount,
          categoryBreakdown,
          paymentMethodBreakdown
        });

        pdfGen.save(`Personal_Expenses_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
      } else {
        // Yearly report
        const monthlyData = monthNames.map((month, index) => {
          const monthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.expense_date);
            return expDate.getMonth() === index && expDate.getFullYear() === selectedYear;
          });

          const categoryMap: Record<string, number> = {};
          monthExpenses.forEach(exp => {
            categoryMap[exp.category] = (categoryMap[exp.category] || 0) + Number(exp.amount);
          });

          return {
            month,
            totalExpenses: monthExpenses.length,
            totalAmount: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
            categories: categoryMap
          };
        });

        const yearExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate.getFullYear() === selectedYear;
        });

        if (yearExpenses.length === 0) {
          toast.error('No expenses found for selected year');
          return;
        }

        const totalAmount = yearExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Category breakdown for year
        const categoryMap: Record<string, { amount: number; count: number }> = {};
        yearExpenses.forEach(exp => {
          if (!categoryMap[exp.category]) {
            categoryMap[exp.category] = { amount: 0, count: 0 };
          }
          categoryMap[exp.category].amount += Number(exp.amount);
          categoryMap[exp.category].count += 1;
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count
        })).sort((a, b) => b.amount - a.amount);

        pdfGen.generatePersonalYearlyReport({
          userName,
          year: selectedYear.toString(),
          monthlyData,
          totalExpenses: yearExpenses.length,
          totalAmount,
          categoryBreakdown
        });

        pdfGen.save(`Personal_Expenses_Annual_${selectedYear}.pdf`);
      }

      toast.success('Report downloaded successfully!');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage your expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

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
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value as PaymentMethod })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense_date">Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Adding...' : 'Add Expense'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Export Menu */}
      {showExportMenu && (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Export Expense Report</h3>
            </div>
            
            <div className="mb-4">
              <Label>Report Type</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={reportType === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setReportType('monthly')}
                  className="flex-1"
                >
                  📅 Monthly Report
                </Button>
                <Button
                  type="button"
                  variant={reportType === 'yearly' ? 'default' : 'outline'}
                  onClick={() => setReportType('yearly')}
                  className="flex-1"
                >
                  📊 Yearly Report
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {reportType === 'monthly' && (
                <div>
                  <Label htmlFor="export-month">Select Month</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger id="export-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={reportType === 'yearly' ? 'col-span-2' : ''}>
                <Label htmlFor="export-year">Select Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger id="export-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
              {reportType === 'monthly' ? (
                <p>📄 Monthly report includes: category breakdown, payment methods, and detailed expense list for {months[selectedMonth]} {selectedYear}</p>
              ) : (
                <p>📊 Yearly report includes: 12-month trend, annual category summary, and monthly breakdowns for {selectedYear}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExportReport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Generate {reportType === 'monthly' ? 'Monthly' : 'Yearly'} Report
              </Button>
              <Button variant="outline" onClick={() => setShowExportMenu(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">{filteredExpenses.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No expenses found</p>
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-2 h-12 rounded-full ${categoryColors[expense.category]}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{expense.category}</Badge>
                        {expense.payment_method && (
                          <Badge variant="secondary">{expense.payment_method}</Badge>
                        )}
                      </div>
                      {expense.notes && (
                        <p className="text-sm text-muted-foreground">{expense.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(expense.expense_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold">
                      {formatCurrency(parseFloat(expense.amount.toString()))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(expense.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
