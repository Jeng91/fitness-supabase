import { supabase } from '../supabaseClient';

// Webhook handler สำหรับรับการแจ้งเตือนจาก AppzStory Studio
export const handleAppzStoryWebhook = async (webhookData, signature) => {
  try {
    console.log('🔔 Received AppzStory webhook:', webhookData);

    // ตรวจสอบ signature เพื่อความปลอดภัย
    const isValidSignature = await verifyWebhookSignature(webhookData, signature);
    if (!isValidSignature) {
      throw new Error('Invalid webhook signature');
    }

    const { 
      payment_id, 
      reference_id, 
      status, 
      amount, 
      paid_at,
      gateway_reference 
    } = webhookData;

    // อัปเดตสถานะในฐานข้อมูล
    const { error: updateError } = await supabase
      .from('qr_payments')
      .update({
        status: status, // 'success', 'failed', 'expired'
        paid_at: paid_at || new Date().toISOString(),
        gateway_response: webhookData
      })
      .eq('transaction_id', reference_id);

    if (updateError) {
      throw new Error(`Failed to update payment status: ${updateError.message}`);
    }

    // ถ้าเป็นการชำระเงินสำเร็จ ให้อัปเดตสถานะการจองด้วย
    if (status === 'success') {
      await updateBookingStatus(reference_id, amount);
    }

    console.log('✅ Webhook processed successfully');
    return {
      success: true,
      message: 'Webhook processed successfully'
    };

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันตรวจสอบ webhook signature
const verifyWebhookSignature = async (data, receivedSignature) => {
  try {
    const secretKey = process.env.REACT_APP_APPZSTORY_SECRET_KEY;
    
    // สร้าง signature ใหม่จากข้อมูลที่ได้รับ
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    const fullString = `${signString}&secret=${secretKey}`;
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(fullString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
};

// ฟังก์ชันอัปเดตสถานะการจอง
const updateBookingStatus = async (transactionId, amount) => {
  try {
    // ค้นหาการจองที่เกี่ยวข้อง
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_id', transactionId)
      .single();

    if (bookingError && bookingError.code !== 'PGRST116') {
      console.error('❌ Error finding booking:', bookingError);
      return;
    }

    if (booking) {
      // อัปเดตสถานะการจอง
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('booking_id', transactionId);

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError);
      } else {
        console.log('✅ Booking status updated successfully');
      }
    }

    // ตรวจสอบการจองสมาชิก
    const { data: membership, error: membershipError } = await supabase
      .from('tbl_memberships')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (membership) {
      // อัปเดตสถานะสมาชิก
      const { error: updateError } = await supabase
        .from('tbl_memberships')
        .update({
          status: 'active',
          payment_status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId);

      if (updateError) {
        console.error('❌ Error updating membership status:', updateError);
      } else {
        console.log('✅ Membership status updated successfully');
      }
    }

  } catch (error) {
    console.error('❌ Error updating booking/membership status:', error);
  }
};

export default {
  handleAppzStoryWebhook,
  verifyWebhookSignature
};