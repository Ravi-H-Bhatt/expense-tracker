-- RFin Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  avatar_url TEXT,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- EXPENSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('Food', 'Petrol', 'Friends', 'Shopping', 'Bills', 'Entertainment', 'Travel', 'Other')),
  notes TEXT,
  payment_method TEXT CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Other')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  tags TEXT[],
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view own expenses" 
  ON expenses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" 
  ON expenses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" 
  ON expenses FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" 
  ON expenses FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- BUDGETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Food', 'Petrol', 'Friends', 'Shopping', 'Bills', 'Entertainment', 'Travel', 'Other')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, month, year)
);

-- Indexes
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_month_year ON budgets(month, year);

-- Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Budgets policies
CREATE POLICY "Users can view own budgets" 
  ON budgets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" 
  ON budgets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" 
  ON budgets FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" 
  ON budgets FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- AI SUMMARIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('monthly', 'weekly', 'insights', 'savings', 'anomaly')),
  content TEXT NOT NULL,
  metadata JSONB,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  year INTEGER CHECK (year >= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_summaries_user_id ON ai_summaries(user_id);
CREATE INDEX idx_ai_summaries_type ON ai_summaries(summary_type);
CREATE INDEX idx_ai_summaries_date ON ai_summaries(month, year);

-- Enable Row Level Security
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

-- AI Summaries policies
CREATE POLICY "Users can view own AI summaries" 
  ON ai_summaries FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI summaries" 
  ON ai_summaries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- SPLIT EXPENSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS split_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  amount_owed DECIMAL(10, 2) NOT NULL CHECK (amount_owed > 0),
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_split_expenses_user_id ON split_expenses(user_id);
CREATE INDEX idx_split_expenses_expense_id ON split_expenses(expense_id);
CREATE INDEX idx_split_expenses_settled ON split_expenses(is_settled);

-- Enable Row Level Security
ALTER TABLE split_expenses ENABLE ROW LEVEL SECURITY;

-- Split Expenses policies
CREATE POLICY "Users can view own split expenses" 
  ON split_expenses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own split expenses" 
  ON split_expenses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own split expenses" 
  ON split_expenses FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own split expenses" 
  ON split_expenses FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- CHAT HISTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);

-- Enable Row Level Security
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Chat History policies
CREATE POLICY "Users can view own chat history" 
  ON chat_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat history" 
  ON chat_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- TRIPS TABLE (For Context-Aware Expenses)
-- ==========================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_trips_active ON trips(is_active);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Trips policies
CREATE POLICY "Users can view own trips" 
  ON trips FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger for trips updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_split_expenses_updated_at
  BEFORE UPDATE ON split_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, mobile_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- USEFUL VIEWS
-- ==========================================

-- Monthly expenses summary view
CREATE OR REPLACE VIEW monthly_expenses_summary AS
SELECT 
  user_id,
  EXTRACT(YEAR FROM expense_date) AS year,
  EXTRACT(MONTH FROM expense_date) AS month,
  category,
  COUNT(*) AS expense_count,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_amount
FROM expenses
GROUP BY user_id, year, month, category;

-- Category spending view
CREATE OR REPLACE VIEW category_spending AS
SELECT 
  user_id,
  category,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_spent,
  AVG(amount) AS avg_transaction,
  MIN(expense_date) AS first_expense,
  MAX(expense_date) AS last_expense
FROM expenses
GROUP BY user_id, category;
