-- Seed a pending payment for testing approve_pending_payment
-- Adjust user_id and fitness_id to match your environment before running
-- Seed a pending payment for testing approve_pending_payment
-- Adjust user_id and fitness_id to match your environment before running

INSERT INTO public.pending_payments (
  transaction_id,
  user_id,
  amount,
  description,
  slip_url,
  slip_filename,
  payment_type,
  status,
  booking_id,
  membership_id,
  admin_notes,
  created_at,
  updated_at
)
VALUES (
  'seed-tx-001',
  -- replace with a real auth.users.id (uuid) in your project (or set to NULL if allowed)
  'c50256f2-0fcf-4ed9-be60-c24c721340cd',
  150.00,
  'Seed pending payment for testing',
  NULL,
  NULL,
  'bank_transfer',
  'pending',
  NULL,
  NULL,
  'Seed note',
  now(), now()
);

-- Select inserted row id for convenience (run after insert)
SELECT id, transaction_id, user_id, amount, status, created_at
FROM public.pending_payments
WHERE transaction_id = 'seed-tx-001';
