// Database Types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  mobile_number: string;
  avatar_url?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory = 
  | 'Food' 
  | 'Petrol' 
  | 'Friends' 
  | 'Shopping' 
  | 'Bills' 
  | 'Entertainment' 
  | 'Travel' 
  | 'Other';

export type PaymentMethod = 
  | 'Cash' 
  | 'Credit Card' 
  | 'Debit Card' 
  | 'UPI' 
  | 'Net Banking' 
  | 'Other';

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  notes?: string;
  payment_method?: PaymentMethod;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export type SummaryType = 'monthly' | 'weekly' | 'insights' | 'savings' | 'anomaly';

export interface AISummary {
  id: string;
  user_id: string;
  summary_type: SummaryType;
  content: string;
  metadata?: Record<string, any>;
  month?: number;
  year?: number;
  created_at: string;
}

export interface SplitExpense {
  id: string;
  user_id: string;
  expense_id?: string;
  person_name: string;
  amount_owed: number;
  is_settled: boolean;
  settled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Form Types
export interface ExpenseFormData {
  amount: string;
  category: ExpenseCategory;
  notes?: string;
  payment_method?: PaymentMethod;
  expense_date: Date;
}

export interface BudgetFormData {
  category: ExpenseCategory;
  amount: string;
  month: number;
  year: number;
}

// Analytics Types
export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyData {
  month: string;
  total: number;
  count: number;
}

export interface DashboardStats {
  totalSpent: number;
  totalTransactions: number;
  avgTransaction: number;
  monthlyChange: number;
}

export interface CategoryBudgetComparison {
  category: ExpenseCategory;
  spent: number;
  budget: number;
  percentage: number;
}

// AI Types
export interface AICommandResult {
  success: boolean;
  action?: 'add_expense' | 'set_budget' | 'split_expense' | 'get_insights' | 'chat';
  data?: any;
  message: string;
}

export interface ParsedExpenseCommand {
  amount: number;
  category: ExpenseCategory;
  notes?: string;
  payment_method?: PaymentMethod;
}

export interface ParsedBudgetCommand {
  category: ExpenseCategory;
  amount: number;
  action: 'set' | 'increase' | 'decrease';
}

export interface ParsedSplitCommand {
  amount: number;
  category: ExpenseCategory;
  people: string[];
  notes?: string;
}

// UI Component Types
export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

export interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color?: string;
}
