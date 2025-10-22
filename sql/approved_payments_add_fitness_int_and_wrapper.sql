-- Migration: add fitness_int_id to approved_payments and create wrapper approve_pending_payment_by_admin_int
-- 1) add column fitness_int_id
ALTER TABLE public.approved_payments
ADD COLUMN IF NOT EXISTS fitness_int_id integer;

-- 2) populate fitness_int_id for existing approved rows by tracing original_payment_id -> pending_payments -> bookings or tbl_memberships
UPDATE public.approved_payments ap
SET fitness_int_id = COALESCE(b.fitness_id, m.fitness_id)
FROM public.pending_payments p
LEFT JOIN public.bookings b ON p.booking_id = b.booking_id
LEFT JOIN public.tbl_memberships m ON p.membership_id = m.membership_id
WHERE ap.original_payment_id = p.id
  AND (ap.fitness_int_id IS NULL);

-- 3) create wrapper function to accept integer admin_id and call approve_pending_payment
CREATE OR REPLACE FUNCTION approve_pending_payment_by_admin_int(p_pending_id uuid, p_admin_int bigint)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  admin_uuid uuid;
BEGIN
  SELECT auth_user_id INTO admin_uuid FROM public.tbl_admin WHERE admin_id = p_admin_int LIMIT 1;
  -- If no mapping found, set admin_uuid = NULL (function will accept NULL)
  IF admin_uuid IS NULL THEN
    RETURN approve_pending_payment(p_pending_id, NULL);
  END IF;
  RETURN approve_pending_payment(p_pending_id, admin_uuid);
END;
$$;

-- Note: review and run in Supabase SQL Editor
