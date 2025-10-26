-- Grant and SECURITY DEFINER helper for approve_pending_payment
-- Usage: run these statements in Supabase SQL editor as a DB admin (not from the browser).
-- WARNING: SECURITY DEFINER functions run with the privileges of the function owner.
-- Make sure the function body performs proper validation (e.g. check that p_admin_id is an admin) before enabling SECURITY DEFINER.

-- 1) Simple: grant EXECUTE to the authenticated role so logged-in users can call the RPC
-- This is safe if the function itself enforces required checks (the RPC should validate admin id / permissions).
GRANT EXECUTE ON FUNCTION public.approve_pending_payment(uuid, uuid) TO authenticated;

-- If you created the integer-wrapper function, grant that too:
GRANT EXECUTE ON FUNCTION public.approve_pending_payment_by_admin_int(uuid, bigint) TO authenticated;

-- 2) Alternative: create a SECURITY DEFINER wrapper that calls the existing function
-- Run this as a DB owner (so the wrapper will run with owner privileges). Validate the function body first.
-- If you already have a function named approve_pending_payment_secdef, this will replace it.

CREATE OR REPLACE FUNCTION public.approve_pending_payment_secdef(
  p_pending_id uuid,
  p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the existing approved function. The inner function should still validate inputs.
  RETURN approve_pending_payment(p_pending_id, p_admin_id);
END;
$$;

-- Grant execute on the SECURITY DEFINER wrapper to authenticated
GRANT EXECUTE ON FUNCTION public.approve_pending_payment_secdef(uuid, uuid) TO authenticated;

-- 3) Quick test (run after you create wrapper/grants) -- use valid ids
-- SELECT public.approve_pending_payment_secdef('pending-uuid-here'::uuid, 'admin-uuid-here'::uuid);

-- Notes:
-- - Prefer the first approach (GRANT EXECUTE on the existing RPC) if the RPC already performs authorization checks.
-- - Only use SECURITY DEFINER if you understand the security implications and the function validates inputs to prevent privilege escalation.
-- - Do NOT put service_role keys in client-side code. Only call RPC from client; the RPC should do the sensitive DB work.
