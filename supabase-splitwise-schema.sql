-- RFin Splitwise Module Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Groups
CREATE TABLE IF NOT EXISTS split_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  group_fund NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES split_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Group expenses
CREATE TABLE IF NOT EXISTS group_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES split_groups(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  is_group_fund_expense BOOLEAN DEFAULT FALSE,
  paid_by_name TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual splits per expense
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES group_expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  amount_owed NUMERIC(12,2) NOT NULL,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settled_with_user_id UUID REFERENCES auth.users(id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES split_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat',  -- 'chat' | 'expense_log' | 'ai_response'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE split_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "group_access" ON split_groups;
DROP POLICY IF EXISTS "member_access" ON group_members;
DROP POLICY IF EXISTS "expense_access" ON group_expenses;
DROP POLICY IF EXISTS "split_access" ON expense_splits;
DROP POLICY IF EXISTS "message_access" ON group_messages;

-- RLS Policies - Fixed with proper INSERT permissions
CREATE POLICY "group_select" ON split_groups FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR 
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

CREATE POLICY "group_insert" ON split_groups FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "group_update" ON split_groups FOR UPDATE TO authenticated USING (
  created_by = auth.uid()
);

CREATE POLICY "group_delete" ON split_groups FOR DELETE TO authenticated USING (
  created_by = auth.uid()
);

CREATE POLICY "member_all" ON group_members FOR ALL TO authenticated USING (
  user_id = auth.uid() OR
  group_id IN (SELECT id FROM split_groups WHERE created_by = auth.uid())
);

CREATE POLICY "expense_all" ON group_expenses FOR ALL TO authenticated USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

CREATE POLICY "split_all" ON expense_splits FOR ALL TO authenticated USING (
  user_id = auth.uid() OR
  expense_id IN (
    SELECT id FROM group_expenses WHERE group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "message_all" ON group_messages FOR ALL TO authenticated USING (
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

-- Enable realtime on messages and expenses
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id ON group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
