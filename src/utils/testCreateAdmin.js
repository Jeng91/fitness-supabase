// สคริปต์ทดสอบการสร้าง Admin
// วิธีการใช้: เปิด Developer Console และ paste script นี้

// Import the functions (ถ้าต้องการทดสอบใน console)
const createAdminTest = async () => {
  try {
    console.log('🚀 เริ่มทดสอบการสร้าง Admin...');
    
    // ต้อง import supabase client ก่อน
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = "https://ibtvipouiddtvsdsccfc.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidHZpcG91aWRkdHZzZHNjY2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTg2MjUsImV4cCI6MjA2ODY5NDYyNX0.vTAJAsP-UXPLpaHoiU5SW8OTdouqvLJ2RhM8l5yzi6g";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 1. สร้าง auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'jjj@admin',
      password: '12346'
    });
    
    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }
    
    let userId = authData?.user?.id;
    
    // ถ้า user มีอยู่แล้ว ให้ลองเข้าสู่ระบบ
    if (authError?.message.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'jjj@admin',
        password: '12346'
      });
      
      if (signInError) throw signInError;
      userId = signInData.user.id;
    }
    
    console.log('✅ User ID:', userId);
    
    // 2. สร้าง admin record
    const adminData = {
      auth_user_id: userId,
      email: 'jjj@admin',
      full_name: 'System Administrator',
      role: 'super_admin',
      status: 'active',
      permissions: JSON.stringify({
        users: { read: true, write: true, delete: true },
        partners: { read: true, write: true, delete: true },
        bookings: { read: true, write: true, delete: true },
        payments: { read: true, write: true, delete: true },
        reviews: { read: true, write: true, delete: true },
        notifications: { read: true, write: true, delete: true },
        reports: { read: true, write: true, delete: true },
        settings: { read: true, write: true, delete: true }
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newAdmin, error: insertError } = await supabase
      .from('tbl_admin')
      .insert([adminData])
      .select()
      .single();
    
    if (insertError) {
      // ถ้ามีข้อมูลอยู่แล้ว ให้ update แทน
      if (insertError.code === '23505') {
        const { data: updatedAdmin, error: updateError } = await supabase
          .from('tbl_admin')
          .update(adminData)
          .eq('auth_user_id', userId)
          .select()
          .single();
          
        if (updateError) throw updateError;
        console.log('✅ Updated Admin:', updatedAdmin);
        return updatedAdmin;
      }
      throw insertError;
    }
    
    console.log('✅ Created Admin:', newAdmin);
    console.log('🎉 Admin setup complete!');
    console.log('📧 Email: jjj@admin');
    console.log('🔑 Password: 12346');
    
    return newAdmin;
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

// เรียกใช้ function
// createAdminTest();