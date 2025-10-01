const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jswfqddbdvdqccfv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzd2ZxZGRiZHZkcWNjZnYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzkzNzQ2MiwiZXhwIjoyMDQzNTEzNDYyfQ.8F6t-U2oT8Mm0xrGqq3dSQvhA4VPUFGUvX5K5vVSu-4');

async function checkEquipmentData() {
  console.log('=== ตรวจสอบตาราง tbl_equipment ===');
  
  // ตรวจสอบโครงสร้างตาราง
  const { data: schema, error: schemaError } = await supabase
    .from('tbl_equipment')
    .select('*')
    .limit(1);
    
  if (schemaError) {
    console.error('Schema Error:', schemaError);
  } else {
    console.log('Equipment table schema (sample):', schema);
    if (schema && schema.length > 0) {
      console.log('Columns:', Object.keys(schema[0]));
    }
  }
  
  // ตรวจสอบข้อมูลทั้งหมด
  const { data: equipment, error } = await supabase
    .from('tbl_equipment')
    .select('*');
    
  if (error) {
    console.error('Data Error:', error);
  } else {
    console.log('Equipment count:', equipment ? equipment.length : 0);
    console.log('Equipment data:', equipment);
  }
}

checkEquipmentData().then(() => process.exit(0));