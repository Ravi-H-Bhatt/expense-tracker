-- Fix Display Name Sync (idempotent — safe to run multiple times)
-- Run this in Supabase SQL Editor.
--
-- Order matters:
--   1) Enable realtime on group_members (live name updates)
--   2) Backfill profiles.full_name FROM auth.users metadata (the real source)
--   3) Backfill group_members.display_name FROM profiles
--
-- This fixes rows still showing "User" because the name only lived in auth
-- metadata and never reached the profiles / group_members tables.

-- 1) Enable realtime on group_members ONLY if not already enabled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_members'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE group_members';
    RAISE NOTICE 'Added group_members to supabase_realtime.';
  ELSE
    RAISE NOTICE 'group_members already in supabase_realtime — skipping.';
  END IF;
END $$;

-- 2) Backfill profiles.full_name from auth.users metadata.
--    Looks at full_name, then name (Google OAuth sometimes uses `name`).
INSERT INTO profiles (id, email, full_name, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', '')
  ) AS full_name,
  now()
FROM auth.users u
WHERE COALESCE(
        NULLIF(u.raw_user_meta_data->>'full_name', ''),
        NULLIF(u.raw_user_meta_data->>'name', '')
      ) IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    updated_at = now();

-- 3) Backfill group_members.display_name from profiles where stale/different.
UPDATE group_members gm
SET display_name = p.full_name
FROM profiles p
WHERE p.id = gm.user_id
  AND p.full_name IS NOT NULL
  AND p.full_name <> ''
  AND p.full_name <> gm.display_name;

-- Verify: see resolved names
SELECT gm.user_id, gm.display_name, p.full_name AS profile_name
FROM group_members gm
LEFT JOIN profiles p ON p.id = gm.user_id;
