-- Function to approve a pending_payment and insert into approved_payments atomically
CREATE OR REPLACE FUNCTION approve_pending_payment(p_pending_id uuid, p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  p RECORD;
  v_split numeric := NULL;
  v_partner numeric := 0;
  v_system_fee numeric := 0;
  v_fitness_name text := NULL;
BEGIN
  -- lock the pending row
  SELECT * INTO p FROM public.pending_payments WHERE id = p_pending_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','error','message','pending_not_found');
  END IF;

  IF p.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('status','error','message','already_processed');
  END IF;

  -- Try to read revenue split from tbl_fitness. Be tolerant to different id types.
  BEGIN
    -- attempt numeric match (common case: fitness id stored as integer)
    SELECT revenue_split_percentage, fit_name INTO v_split, v_fitness_name
    FROM public.tbl_fitness
    WHERE fit_id = p.fitness_id::integer
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_split := NULL;
    v_fitness_name := NULL;
  END;

  IF v_split IS NULL THEN
    -- try textual match as a fallback
    SELECT revenue_split_percentage, fit_name INTO v_split, v_fitness_name
    FROM public.tbl_fitness
    WHERE fit_id::text = p.fitness_id::text
    LIMIT 1;
  END IF;

  IF v_split IS NULL THEN
    v_split := 80.00; -- default partner% if not found
  END IF;

  v_partner := ROUND(p.amount * v_split / 100.0, 2);
  v_system_fee := ROUND(p.amount - v_partner, 2);

  -- insert into approved_payments
  INSERT INTO public.approved_payments(
    transaction_id, user_id, amount, description, slip_url, slip_filename, payment_type,
    original_payment_id, approved_by, approved_at, booking_id, membership_id, fitness_id,
    partner_id, booking_type, booking_period, fitness_name, partner_name, system_fee,
    partner_revenue, notes, created_at, updated_at
  )
  VALUES (
    p.transaction_id, p.user_id, p.amount, p.description, p.slip_url, p.slip_filename, p.payment_type,
    p.id, p_admin_id, now(), p.booking_id, p.membership_id, p.fitness_id,
    p.partner_id, p.booking_type, p.booking_period, COALESCE(v_fitness_name, ''), NULL, v_system_fee,
    v_partner, p.admin_notes, now(), now()
  )
  RETURNING id INTO STRICT p.id; -- reuse p.id variable here to store new approved id

  -- update pending_payments status
  UPDATE public.pending_payments
  SET status = 'approved', approved_by = p_admin_id, approved_at = now(), updated_at = now()
  WHERE id = p_pending_id;

  -- Optionally create a partner transfer row for later processing
  IF p.partner_id IS NOT NULL OR p.fitness_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.tbl_partner_transfers(
        partner_fitness_id, payment_id, total_amount, partner_amount, system_amount,
        transfer_status, transfer_date, partner_bank_account, partner_bank_name, partner_account_name, notes, created_at
      ) VALUES (
        NULLIF(p.fitness_id::integer, 0), -- try to coerce fitness_id to integer where possible
        p.id, p.amount, v_partner, v_system_fee, 'pending', NULL, NULL, NULL, NULL,
        CONCAT('Auto-created transfer for approved pending_payment ', p_pending_id), now()
      );
    EXCEPTION WHEN OTHERS THEN
      -- don't fail approval if transfer insert cannot be created
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object('status','ok','approved_payment_id', p.id, 'system_fee', v_system_fee, 'partner_revenue', v_partner);
END;
$$;

-- Grant execute to authenticated if you want clients to call it directly (adjust as needed)
-- GRANT EXECUTE ON FUNCTION approve_pending_payment(uuid, uuid) TO authenticated;
