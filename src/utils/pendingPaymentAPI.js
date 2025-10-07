import { supabase } from '../supabaseClient';

// บันทึกข้อมูลการชำระเงินรออนุมัติ
export const savePendingPayment = async (paymentData) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('pending_payments')
      .insert([
        {
          ...paymentData,
          user_id: user.user.id,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving pending payment:', error);
    return { success: false, error: error.message };
  }
};

// ดึงข้อมูลการชำระเงินของผู้ใช้
export const getUserPendingPayments = async () => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user pending payments:', error);
    return { success: false, error: error.message };
  }
};

// อัปเดตสถานะการชำระเงิน (สำหรับ admin)
export const updatePaymentStatus = async (paymentId, status, adminNotes = '') => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const updateData = {
      status,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      updateData.approved_by = user.user.id;
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('pending_payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
};

// ดึงข้อมูลการชำระเงินรออนุมัติทั้งหมด (สำหรับ admin)
export const getAllPendingPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('pending_payments')
      .select(`
        *,
        user_profiles:user_id (
          full_name,
          phone_number,
          email
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching all pending payments:', error);
    return { success: false, error: error.message };
  }
};

// อัปโหลดไฟล์สลิป
export const uploadSlipFile = async (file, transactionId) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${transactionId}-${Date.now()}.${fileExt}`;
    const filePath = `slips/${fileName}`;

    const { error } = await supabase.storage
      .from('payment-slips')
      .upload(filePath, file);

    if (error) throw error;

    // ได้ URL ของไฟล์ที่อัปโหลด
    const { data: urlData } = supabase.storage
      .from('payment-slips')
      .getPublicUrl(filePath);

    return {
      success: true,
      data: {
        path: filePath,
        url: urlData.publicUrl,
        filename: fileName
      }
    };
  } catch (error) {
    console.error('Error uploading slip file:', error);
    return { success: false, error: error.message };
  }
};