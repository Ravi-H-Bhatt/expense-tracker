-- Fix Display Name Sync Issue (idempotent — safe to run multiple times)
-- Run this in Supabase SQL Editor.
-- 1) Enables realtime on group_members (so names update live)
-- 2) One-time backfill: copies profiles.full_name into any stale
--    group_members.display_name (e.g. rows still showing "User")

-- 1) Enable realtime on group_members ONLY if not already enabled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_members'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE group_members';
    RAISE NOTICE 'Added group_members to supabase_realtime publication.';
  ELSE
    RAISE NOTICE 'group_members already in supabase_realtime publication — skipping.';
  END IF;
END $$;

-- 2) Backfill display names from profiles where they differ or are stale.
DO $$
DECLARE
  member_record RECORD;
BEGIN
  FOR member_record IN
    SELECT gm.id, gm.user_id, gm.display_name, p.full_name
    FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE p.full_name IS NOT NULL
      AND p.full_name <> ''
      AND p.full_name <> gm.display_name
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

-- Success
SELECT 'Display name sync complete. Realtime enabled and stale names backfilled.' AS status;
