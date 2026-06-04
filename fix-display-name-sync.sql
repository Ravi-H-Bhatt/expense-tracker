-- Fix Display Name Sync Issue
-- Run this in Supabase SQL Editor to enable realtime updates for group_members table
-- This allows display names to update in real-time when users change their profile name

-- Enable realtime on group_members table
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- Optional: Create a function to automatically sync display names from profiles
-- This is a one-time sync for existing data
DO $$
DECLARE
  member_record RECORD;
  profile_name TEXT;
BEGIN
  FOR member_record IN 
    SELECT gm.id, gm.user_id, gm.display_name, p.full_name
    FROM group_members gm
    LEFT JOIN profiles p ON p.id = gm.user_id
    WHERE p.full_name IS NOT NULL 
      AND p.full_name != ''
      AND p.full_name != gm.display_name
  LOOP
    UPDATE group_members 
    SET display_name = member_record.full_name 
    WHERE id = member_record.id;
    
    RAISE NOTICE 'Updated member % from "%" to "%"', 
      member_record.user_id, 
      member_record.display_name, 
      member_record.full_name;
  END LOOP;
END $$;

-- Success message
SELECT 'Display name sync enabled! Names will now update in real-time.' AS status;
