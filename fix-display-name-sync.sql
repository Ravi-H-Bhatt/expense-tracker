-- Fix Display Name Sync (idempotent — safe to run multiple times)
-- Run this in Supabase SQL Editor.
--
-- Root cause: the signup trigger saved profiles.full_name = 'User' when the
-- name metadata was empty at signup. This backfills the REAL name from
-- auth.users metadata into profiles, then into group_members.

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
--    Overwrites empty OR the literal placeholder 'User' with the real name.
UPDATE profiles p
SET full_name = COALESCE(
      NULLIF(u.raw_user_meta_data->>'full_name', ''),
      NULLIF(u.raw_user_meta_data->>'name', '')
    ),
    updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND COALESCE(
        NULLIF(u.raw_user_meta_data->>'full_name', ''),
        NULLIF(u.raw_user_meta_data->>'name', '')
      ) IS NOT NULL
  AND (p.full_name IS NULL OR p.full_name = '' OR p.full_name = 'User');

-- 3) Backfill group_members.display_name from profiles where stale.
UPDATE group_members gm
SET display_name = p.full_name
FROM profiles p
WHERE p.id = gm.user_id
  AND p.full_name IS NOT NULL
  AND p.full_name <> ''
  AND p.full_name <> 'User'
  AND p.full_name <> gm.display_name;

-- 4) Verify
SELECT gm.user_id, gm.display_name, p.full_name AS profile_name,
       u.raw_user_meta_data->>'full_name' AS meta_full_name,
       u.raw_user_meta_data->>'name'      AS meta_name
FROM group_members gm
LEFT JOIN profiles p ON p.id = gm.user_id
LEFT JOIN auth.users u ON u.id = gm.user_id;
