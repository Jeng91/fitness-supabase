-- SQL migration: create_tbl_promo_claims.sql
-- Purpose: record when a user claims/uses a promotion (for audit and single-use enforcement)
-- Run this in Supabase SQL Editor or with psql against your database.

-- 1) Create table
CREATE TABLE IF NOT EXISTS public.tbl_promo_claims (
  claim_id bigserial PRIMARY KEY,
  promo_id bigint,
  promo_code text,
  user_id uuid NOT NULL,
  booking_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  used_at timestamptz DEFAULT now()
);

-- 2) Optional: foreign key if you have tbl_promotions.promo_id
-- ALTER TABLE public.tbl_promo_claims
--   ADD CONSTRAINT fk_promo
--   FOREIGN KEY (promo_id)
--   REFERENCES public.tbl_promotions(promo_id)
--   ON DELETE SET NULL;

-- 3) Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_promo_claims_promo_id ON public.tbl_promo_claims(promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_claims_user_id ON public.tbl_promo_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_claims_promo_code ON public.tbl_promo_claims(promo_code);

-- 4) Optional uniqueness to enforce single-use per user per promo
-- Uncomment if you want to prevent a user from claiming the same promo more than once (by promo_id)
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_user ON public.tbl_promo_claims(promo_id, user_id);

-- 5) Row Level Security (RLS) - recommended for Supabase
-- Enable RLS so we can write fine-grained policies
ALTER TABLE public.tbl_promo_claims ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to INSERT claims for themselves
-- (they can only insert rows where user_id = auth.uid())
CREATE POLICY "Insert own promo claim" ON public.tbl_promo_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: allow authenticated users to SELECT their own claims
CREATE POLICY "Select own promo claims" ON public.tbl_promo_claims
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: allow authenticated users to DELETE their own claims (optional)
CREATE POLICY "Delete own promo claim" ON public.tbl_promo_claims
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 6) Admin/service access notes (for server-side processes you may use the service_role key)
-- The service_role key bypasses RLS and can insert/select freely. If you need certain server-side
-- functions to run under the authenticated role, create policies that allow those operations based on
-- some safe condition, or use RPC functions executed by service role.

-- 7) Example: add a helper function to check if a user already claimed a promo (optional)
-- CREATE OR REPLACE FUNCTION public.user_has_claimed_promo(_user uuid, _promo_id bigint)
-- RETURNS boolean LANGUAGE sql STABLE AS $$
--   SELECT EXISTS (SELECT 1 FROM public.tbl_promo_claims WHERE user_id = _user AND promo_id = _promo_id);
-- $$;

-- 8) How to run
-- - Supabase SQL editor: paste this file and run
-- - psql (if you have connection string):
--     psql "postgresql://<user>:<password>@<host>:5432/<db>" -f create_tbl_promo_claims.sql
-- - Supabase CLI: `supabase db push` or include as migration depending on your workflow

-- IMPORTANT: Review RLS policies and adapt them to your project's models (profiles table, auth setup).
-- If your user id is stored in a different column (eg. profiles.id), ensure consistency between auth.uid() and the stored user_id.
