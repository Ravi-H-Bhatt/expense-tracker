-- RFin Admin System and Activity Logging Setup
-- Run this in Supabase SQL Editor

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  group_id UUID REFERENCES split_groups(id),
  expense_id UUID REFERENCES group_expenses(id),
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT TO authenticated USING (
  id IN (SELECT id FROM admin_users WHERE id = auth.uid() AND is_active = true)
);

CREATE POLICY "admin_users_insert" ON admin_users FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin' AND is_active = true)
);

CREATE POLICY "admin_users_update" ON admin_users FOR UPDATE TO authenticated USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE role = 'super_admin' AND is_active = true)
);

-- RLS Policies for activity_logs
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT TO authenticated USING (
  auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
);

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Insert admin user (ravibhatt946@gmail.com)
INSERT INTO admin_users (id, email, role, is_active)
SELECT id, email, 'super_admin', true
FROM auth.users 
WHERE email = 'ravibhatt946@gmail.com'
ON CONFLICT (email) DO UPDATE SET 
  role = 'super_admin',
  is_active = true;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();