-- Drop the restrictive policy
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;

-- Create a new policy that allows users to check their own admin status
CREATE POLICY "Users can check own admin status" ON admin_users
  FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

-- Verify it works
SELECT * FROM admin_users WHERE id = auth.uid();
