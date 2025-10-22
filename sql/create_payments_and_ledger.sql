-- Migration: create payments and revenue_ledger tables and approve_payment function

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  fit_id uuid REFERENCES tbl_fitness(fit_id),
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'THB',
  payment_method text,
  reference text,
  status text DEFAULT 'pending',
  fee_percent numeric(5,2) DEFAULT 20,
  fee_amount numeric(12,2),
  partner_amount numeric(12,2),
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid,
  metadata jsonb
);

-- Create revenue_ledger table
CREATE TABLE IF NOT EXISTS revenue_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'system' or 'partner'
  entity_id uuid, -- nullable (system may have null)
  payment_id uuid REFERENCES payments(id),
  amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  note text
);

-- Function to approve a payment atomically
CREATE OR REPLACE FUNCTION approve_payment(p_payment_id uuid, p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  r payments%ROWTYPE;
  fee numeric;
  partner_share numeric;
  owner_id uuid;
BEGIN
  SELECT * INTO r FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','error','message','payment_not_found');
  END IF;

  IF r.status <> 'pending' THEN
    RETURN jsonb_build_object('status','error','message','already_processed');
  END IF;

  fee := ROUND(r.amount * r.fee_percent / 100.0, 2);
  partner_share := ROUND(r.amount - fee, 2);

  UPDATE payments
  SET status = 'approved', fee_amount = fee, partner_amount = partner_share,
      approved_at = now(), approved_by = p_admin_id
  WHERE id = p_payment_id;

  SELECT owner_id INTO owner_id FROM tbl_fitness WHERE fit_id = r.fit_id LIMIT 1;

  INSERT INTO revenue_ledger(entity_type, entity_id, payment_id, amount, created_at, note)
  VALUES ('system', NULL, p_payment_id, fee, now(), 'system fee');

  IF owner_id IS NOT NULL THEN
    INSERT INTO revenue_ledger(entity_type, entity_id, payment_id, amount, created_at, note)
    VALUES ('partner', owner_id, p_payment_id, partner_share, now(), 'partner share');
  END IF;

  RETURN jsonb_build_object('status','ok','payment_id', p_payment_id, 'fee', fee, 'partner_share', partner_share);
END;
$$;

-- Grant execute privileges if desired (depends on your Supabase roles)
-- GRANT EXECUTE ON FUNCTION approve_payment(uuid, uuid) TO authenticated;