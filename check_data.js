const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cxhgwowddadpodvccfig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4aGd3b3dkZGFkcG9kdmNjZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyMDUzMjUsImV4cCI6MjA0Mjc4MTMyNX0.G7_KqzYJhOe71T3p4bKBLyTMJZIBi_DHHQN4sEQ-qKY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 ตรวจสอบข้อมูลฟิตเนส...');
  const { data: fitness, error: fitnessError } = await supabase
    .from('tbl_fitness')
    .select('*')
    .limit(5);
  
  if (fitnessError) {
    console.error('❌ Error fetching fitness:', fitnessError);
  } else {
    console.log('✅ ข้อมูลฟิตเนส:', fitness);
  }

  console.log('\n🔍 ตรวจสอบข้อมูล owner...');
  const { data: owners, error: ownerError } = await supabase
    .from('tbl_owner')
    .select('*')
    .limit(5);
  
  if (ownerError) {
    console.error('❌ Error fetching owners:', ownerError);
  } else {
    console.log('✅ ข้อมูล owner:', owners);
  }

  console.log('\n🔍 ตรวจสอบ RLS policies สำหรับ tbl_fitness...');
  try {
    // ทดสอบการเข้าถึงข้อมูลฟิตเนสแบบ anonymous
    const { data: publicFitness, error: publicError } = await supabase
      .from('tbl_fitness')
      .select('fit_id, fit_name, fit_user, created_by')
      .limit(3);
    
    if (publicError) {
      console.error('❌ Public access error:', publicError);
    } else {
      console.log('✅ Public fitness data:', publicFitness);
    }
  } catch (error) {
    console.error('❌ RLS test error:', error);
  }

  console.log('\n🔍 ตรวจสอบการจับคู่ข้อมูล...');
  const { data: joinData, error: joinError } = await supabase
    .from('tbl_fitness')
    .select(`
      fit_id,
      fit_name,
      fit_user,
      created_by,
      tbl_owner!inner(owner_id, owner_name, owner_uid)
    `)
    .limit(3);
  
  if (joinError) {
    console.error('❌ Join error:', joinError);
  } else {
    console.log('✅ Joined data:', joinData);
  }
}

checkData().catch(console.error);