-- Migration: add auth_user_id to tbl_admin and populate mapping from auth.users
-- Run this in Supabase SQL Editor. Review results before adding FK constraint.

-- 1) add column (nullable)
ALTER TABLE public.tbl_admin
ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- 2) attempt to populate by matching admin_name -> auth.users.email
UPDATE public.tbl_admin t
SET auth_user_id = u.id
FROM auth.users u
WHERE t.admin_name = u.email
  AND (t.auth_user_id IS NULL OR t.auth_user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- 3) show results to review unmapped admins
SELECT admin_id, admin_name, auth_user_id FROM public.tbl_admin ORDER BY admin_id;

-- OPTIONAL: add FK constraint if you are confident all non-null auth_user_id rows are valid
-- ALTER TABLE public.tbl_admin
-- ADD CONSTRAINT tbl_admin_auth_user_fk FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);

-- NOTES:
-- - Do NOT add the FK constraint until you've verified auth_user_id values are correct.
-- - If some admin rows do not map automatically, set auth_user_id manually using UPDATE, or create corresponding auth.users accounts.
