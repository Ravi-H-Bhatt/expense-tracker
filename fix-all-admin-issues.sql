-- Fix RLS policies so admins can see all data

-- 1. Allow admins to read ALL admin_users (not just their own)
DROP POLICY IF EXISTS "Users can check own admin status" ON admin_users;
CREATE POLICY "Admins can read all admin users" ON admin_users
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 2. Allow admins to read users table for stats
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 3. Allow admins to read group_expenses for stats
CREATE POLICY "Admins can read all expenses" ON group_expenses
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 4. Allow admins to read split_groups for stats
CREATE POLICY "Admins can read all groups" ON split_groups
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Verify admin can now see counts
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM group_expenses) as total_expenses,
  (SELECT COUNT(*) FROM split_groups WHERE is_active = true) as active_groups,
  (SELECT COUNT(*) FROM admin_users WHERE is_active = true) as admin_users;
