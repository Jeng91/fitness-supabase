// Node test script: insert (optional) a pending payment and call approve_pending_payment RPC
// Usage (Windows cmd):
// set SUPABASE_URL=https://... && set SUPABASE_KEY=your_service_role_key && node scripts\testApprove.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // service role key recommended for testing

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  try {
    // Optionally: create a pending payment via insert if none exists
    console.log('Inserting seed pending payment (if not present)...');
    const seedTx = 'seed-tx-001';

    const { data: existing } = await supabase
      .from('pending_payments')
      .select('id, transaction_id, status')
      .eq('transaction_id', seedTx)
      .limit(1)
      .maybeSingle();

    let pendingId = existing?.id;

    if (!pendingId) {
      const insertPayload = {
        transaction_id: seedTx,
        user_id: null, // set to a valid user uuid if available
        amount: 150.00,
        description: 'Seed pending payment for RPC test',
        payment_type: 'bank_transfer',
        status: 'pending',
        fitness_id: 1,
        admin_notes: 'created-by-test-script'
      };

      const { data: ins, error: insErr } = await supabase
        .from('pending_payments')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insErr) throw insErr;
      pendingId = ins.id;
      console.log('Inserted pending payment id:', pendingId);
    } else {
      console.log('Found existing pending id:', pendingId);
    }

    // Call RPC approve_pending_payment
    console.log('Calling RPC approve_pending_payment for id:', pendingId);
    const adminId = null; // set to a valid admin uuid if you want to track approved_by
    const { data: rpcData, error: rpcErr } = await supabase.rpc('approve_pending_payment', { p_pending_id: pendingId, p_admin_id: adminId });

    if (rpcErr) {
      console.error('RPC error:', rpcErr);
      process.exit(1);
    }

    console.log('RPC result:', rpcData);

    // Verify approved_payments row exists
    const { data: approved } = await supabase
      .from('approved_payments')
      .select('*')
      .eq('original_payment_id', pendingId)
      .limit(1)
      .maybeSingle();

    console.log('Approved row:', approved || 'Not found');

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

main();
