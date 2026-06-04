-- Payment Requests and Notifications Schema
-- Run this in Supabase SQL Editor to add payment request functionality

-- Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  group_id UUID REFERENCES split_groups(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' | 'pending_confirmation' | 'accepted' | 'rejected' | 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, group_id, created_at)
);

-- Settlements Table (two-sided settlement records)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  group_id UUID REFERENCES split_groups(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending_confirmation', -- 'pending_confirmation' | 'confirmed' | 'rejected'
  payer_confirmed BOOLEAN DEFAULT FALSE,
  payee_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'payment_request' | 'settlement_pending' | 'settlement_confirmed' | 'payment_reminder'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  group_id UUID REFERENCES split_groups(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2),
  status TEXT DEFAULT 'unread', -- 'unread' | 'read' | 'actioned'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "payment_requests_access" ON payment_requests;
DROP POLICY IF EXISTS "settlements_access" ON settlements;
DROP POLICY IF EXISTS "notifications_access" ON notifications;

-- RLS Policies for Payment Requests
CREATE POLICY "payment_requests_select" ON payment_requests FOR SELECT TO authenticated USING (
  from_user_id = auth.uid() OR 
  to_user_id = auth.uid() OR
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

CREATE POLICY "payment_requests_insert" ON payment_requests FOR INSERT TO authenticated WITH CHECK (
  from_user_id = auth.uid() AND
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

CREATE POLICY "payment_requests_update" ON payment_requests FOR UPDATE TO authenticated USING (
  from_user_id = auth.uid() OR to_user_id = auth.uid()
);

-- RLS Policies for Settlements
CREATE POLICY "settlements_select" ON settlements FOR SELECT TO authenticated USING (
  payer_id = auth.uid() OR 
  payee_id = auth.uid() OR
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

CREATE POLICY "settlements_insert" ON settlements FOR INSERT TO authenticated WITH CHECK (
  payer_id = auth.uid() AN
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);

CREATE POLICY "settlements_update" ON settlements FOR UPDATE TO authenticated USING (
  payer_id = auth.uid() OR payee_id = auth.uid()
);

-- RLS Policies for Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);

CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() OR 
  (auth.uid() IS NOT NULL AND user_id IS NOT NULL)
);

CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_from_user ON payment_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_to_user ON payment_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_group ON payment_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_settlements_payer ON settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payee ON settlements(payee_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
