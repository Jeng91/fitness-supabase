const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cxhgwowddadpodvccfig.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4aGd3b3dkZGFkcG9kdmNjZmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcyMDUzMjUsImV4cCI6MjA0Mjc4MTMyNX0.G7_KqzYJhOe71T3p4bKBLyTMJZIBi_DHHQN4sEQ-qKY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMoreDetails() {
  console.log('🔄 กำลังอัปเดต fit_moredetails สำหรับ fitness ID 22...');
  
  // ข้อมูลตัวอย่างสำหรับรายละเอียดเพิ่มเติม
  const moreDetailsText = `• อุปกรณ์ออกกำลังกายครบครัน
• เครื่องวิ่งไฟฟ้าใหม่ล่าสุด
• เครื่องยกน้ำหนักแบบมืออาชีพ
• ห้องแอร์เย็นสบาย
• ที่จอดรถสะดวก
• เทรนเนอร์มืออาชีพให้คำแนะนำ
• ห้องน้ำสะอาด พร้อมอุปกรณ์อาบน้ำ
• Wi-Fi ฟรี
• เครื่องดื่มและขนมเบาๆ จำหน่าย
• เปิดทุกวัน ไม่มีวันหยุด`;

  try {
    // อัปเดตข้อมูล
    const { data, error } = await supabase
      .from('tbl_fitness')
      .update({ fit_moredetails: moreDetailsText })
      .eq('fit_id', 22)
      .select();

    if (error) {
      console.error('❌ Error updating more details:', error);
    } else {
      console.log('✅ อัปเดตสำเร็จ:', data);
    }

    // ตรวจสอบข้อมูลหลังอัปเดต
    console.log('\n🔍 ตรวจสอบข้อมูลหลังอัปเดต...');
    const { data: updated, error: checkError } = await supabase
      .from('tbl_fitness')
      .select('fit_id, fit_name, fit_moredetails')
      .eq('fit_id', 22);

    if (checkError) {
      console.error('❌ Error checking updated data:', checkError);
    } else {
      console.log('📄 ข้อมูลหลังอัปเดต:', updated);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateMoreDetails();