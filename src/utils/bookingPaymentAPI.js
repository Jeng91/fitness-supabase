// ========================================
// API Utils สำหรับระบบการจองและชำระเงิน
// ========================================

import { supabase } from '../supabaseClient';

// ========================================
// Booking Management Functions
// ========================================

/**
 * สร้างการจองใหม่
 */
export const createBooking = async (bookingData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนทำการจอง');
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          user_id: user.id,
          fitness_id: bookingData.fitness_id,
          owner_uid: bookingData.owner_uid,
          booking_date: bookingData.booking_date,
          total_amount: bookingData.total_amount,
          booking_status: 'pending',
          notes: bookingData.notes || `จองผ่านระบบออนไลน์ - ${new Date().toLocaleDateString('th-TH')}`
        }
      ])
      .select(`
        *,
        tbl_fitness:fitness_id (
          fitness_name,
          location,
          price_per_day
        ),
        profiles:user_id (
          full_name,
          phone
        )
      `)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error.message };
  }
};

/**
 * อัพเดทสถานะการจอง
 */
export const updateBookingStatus = async (bookingId, status, reason = null) => {
  try {
    // อัพเดทสถานะการจอง
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        booking_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (error) throw error;

    // บันทึกประวัติการเปลี่ยนแปลง
    await logBookingHistory(bookingId, data.booking_status, status, reason);

    return { success: true, data };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงข้อมูลการจองของผู้ใช้
 */
export const getUserBookings = async (userId = null, status = null) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        tbl_fitness:fitness_id (
          fitness_name,
          location,
          image,
          price_per_day
        ),
        payments (
          payment_id,
          payment_status,
          total_amount,
          paid_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('booking_status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ยกเลิกการจอง
 */
export const cancelBooking = async (bookingId, reason = 'ผู้ใช้ยกเลิก') => {
  try {
    const result = await updateBookingStatus(bookingId, 'cancelled', reason);
    
    if (result.success) {
      // ถ้ามีการชำระเงินแล้ว ให้สร้างคำขอคืนเงิน
      const payment = await getPaymentByBookingId(bookingId);
      if (payment.success && payment.data && payment.data.payment_status === 'completed') {
        await createRefundRequest(payment.data.payment_id, bookingId, reason);
      }
    }

    return result;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// Payment Management Functions
// ========================================

/**
 * สร้างข้อมูลการชำระเงิน
 */
export const createPayment = async (paymentData) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('กรุณาเข้าสู่ระบบก่อนทำการชำระเงิน');
    }

    const systemFee = Math.round(paymentData.total_amount * 0.20 * 100) / 100;
    const fitnessAmount = Math.round(paymentData.total_amount * 0.80 * 100) / 100;

    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          booking_id: paymentData.booking_id,
          user_id: user.id,
          total_amount: paymentData.total_amount,
          system_fee: systemFee,
          fitness_amount: fitnessAmount,
          payment_method: paymentData.payment_method,
          payment_status: paymentData.payment_status || 'pending',
          transaction_id: paymentData.transaction_id,
          gateway_response: paymentData.gateway_response,
          gateway_reference: paymentData.gateway_reference,
          paid_at: paymentData.payment_status === 'completed' ? new Date().toISOString() : null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // สร้างการแบ่งเงิน
    if (paymentData.payment_status === 'completed') {
      await createPaymentSplit(data.payment_id, systemFee, fitnessAmount);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * อัพเดทสถานะการชำระเงิน
 */
export const updatePaymentStatus = async (paymentId, status, gatewayData = null) => {
  try {
    const updateData = {
      payment_status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.paid_at = new Date().toISOString();
    }

    if (gatewayData) {
      updateData.gateway_response = gatewayData;
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // ถ้าชำระเงินสำเร็จ ให้สร้างการแบ่งเงินและ Partner Transfer
    if (status === 'completed') {
      await createPaymentSplit(paymentId, data.system_fee, data.fitness_amount);
      
      // สร้าง Partner Transfer อัตโนมัติ
      try {
        const { createPartnerTransfer } = await import('./partnerAccountAPI');
        
        // ดึงข้อมูลฟิตเนสจากการจอง
        if (data.booking_id) {
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('fitness_id')
            .eq('booking_id', data.booking_id)
            .single();

          if (!bookingError && bookingData?.fitness_id) {
            // ดึงข้อมูลฟิตเนสและการแบ่งรายได้
            const { data: fitnessData, error: fitnessError } = await supabase
              .from('tbl_fitness')
              .select('partner_bank_account, partner_bank_name, partner_account_name, revenue_split_percentage')
              .eq('fit_id', bookingData.fitness_id)
              .single();

            if (!fitnessError && fitnessData?.partner_bank_account) {
              console.log('🔄 Creating partner transfer for booking payment:', paymentId);
              
              const transferResult = await createPartnerTransfer({
                partner_fitness_id: bookingData.fitness_id,
                payment_id: paymentId,
                total_amount: data.total_amount,
                revenue_split_percentage: fitnessData.revenue_split_percentage || 80.00,
                partner_bank_account: fitnessData.partner_bank_account,
                partner_bank_name: fitnessData.partner_bank_name,
                partner_account_name: fitnessData.partner_account_name,
                notes: `การจองบริการรายวัน - Transaction: ${data.transaction_id}`
              });

              if (transferResult.success) {
                console.log('✅ Partner transfer created for booking:', transferResult.data);
              } else {
                console.error('❌ Partner transfer failed for booking:', transferResult.error);
              }
            }
          }
        }
      } catch (transferError) {
        console.error('❌ Error creating partner transfer for booking:', transferError);
        // ไม่ให้ error ของ transfer ทำให้ payment ล้มเหลว
      }
      
      // อัพเดทสถานะการจองเป็น confirmed
      if (data.booking_id) {
        await updateBookingStatus(data.booking_id, 'confirmed', 'ชำระเงินสำเร็จ');
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงข้อมูลการชำระเงินจากการจอง
 */
export const getPaymentByBookingId = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงประวัติการชำระเงินของผู้ใช้
 */
export const getUserPayments = async (userId = null) => {
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        bookings:booking_id (
          booking_date,
          tbl_fitness:fitness_id (
            fitness_name,
            location
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// Payment Split Management
// ========================================

/**
 * สร้างการแบ่งเงิน
 */
export const createPaymentSplit = async (paymentId, systemAmount, fitnessAmount) => {
  try {
    const { data, error } = await supabase
      .from('payment_splits')
      .insert([
        {
          payment_id: paymentId,
          system_split_amount: systemAmount,
          system_split_status: 'completed', // ระบบได้เงินทันที
          fitness_split_amount: fitnessAmount,
          fitness_split_status: 'pending', // รอโอนให้ฟิตเนส
          system_fee_ref: `SYS_${Date.now()}`,
          fitness_transfer_ref: `FIT_${Date.now()}`
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating payment split:', error);
    return { success: false, error: error.message };
  }
};

/**
 * อัพเดทสถานะการแบ่งเงินให้ฟิตเนส
 */
export const updateFitnessSplitStatus = async (splitId, status, transferRef = null) => {
  try {
    const updateData = {
      fitness_split_status: status,
      updated_at: new Date().toISOString()
    };

    if (transferRef) {
      updateData.fitness_transfer_ref = transferRef;
    }

    const { data, error } = await supabase
      .from('payment_splits')
      .update(updateData)
      .eq('split_id', splitId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating fitness split status:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// Refund Management
// ========================================

/**
 * สร้างคำขอคืนเงิน
 */
export const createRefundRequest = async (paymentId, bookingId, reason) => {
  try {
    // ดึงข้อมูลการชำระเงิน
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('total_amount')
      .eq('payment_id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    const { data, error } = await supabase
      .from('refunds')
      .insert([
        {
          payment_id: paymentId,
          booking_id: bookingId,
          refund_amount: payment.total_amount,
          refund_reason: reason,
          refund_status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating refund request:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// History and Logging
// ========================================

/**
 * บันทึกประวัติการเปลี่ยนแปลงสถานะการจอง
 */
export const logBookingHistory = async (bookingId, fromStatus, toStatus, reason) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('booking_history')
      .insert([
        {
          booking_id: bookingId,
          from_status: fromStatus,
          to_status: toStatus,
          change_reason: reason,
          changed_by: user?.id
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error logging booking history:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// Analytics and Reports
// ========================================

/**
 * ดึงสถิติการจองสำหรับ Dashboard
 */
export const getBookingStats = async (ownerUid = null, dateRange = null) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        booking_status,
        total_amount,
        created_at,
        tbl_fitness:fitness_id (
          fitness_name
        )
      `);

    if (ownerUid) {
      query = query.eq('owner_uid', ownerUid);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;

    // คำนวณสถิติ
    const stats = {
      total_bookings: data.length,
      pending_bookings: data.filter(b => b.booking_status === 'pending').length,
      confirmed_bookings: data.filter(b => b.booking_status === 'confirmed').length,
      completed_bookings: data.filter(b => b.booking_status === 'completed').length,
      cancelled_bookings: data.filter(b => b.booking_status === 'cancelled').length,
      total_revenue: data
        .filter(b => ['confirmed', 'completed'].includes(b.booking_status))
        .reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ดึงรายงานรายได้
 */
export const getRevenueReport = async (ownerUid = null, period = 'month') => {
  try {
    // คำนวณช่วงเวลา
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let query = supabase
      .from('payment_splits')
      .select(`
        *,
        payments:payment_id (
          total_amount,
          paid_at,
          bookings:booking_id (
            owner_uid,
            tbl_fitness:fitness_id (
              fitness_name
            )
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .eq('system_split_status', 'completed');

    if (ownerUid) {
      // สำหรับเจ้าของฟิตเนส - ดูเฉพาะของตนเอง
      query = query.eq('payments.bookings.owner_uid', ownerUid);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// Mock Payment Gateway Integration
// ========================================

/**
 * จำลอง Payment Gateway API
 */
export const processPaymentGateway = async (paymentInfo) => {
  return new Promise((resolve, reject) => {
    // จำลองเวลาประมวลผล
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        resolve({
          success: true,
          transaction_id: paymentInfo.transaction_id,
          gateway_reference: `REF_${Date.now()}`,
          status: 'completed',
          amount: paymentInfo.amount,
          currency: 'THB',
          response_data: {
            gateway: 'mock_payment',
            timestamp: new Date().toISOString(),
            method: paymentInfo.method,
            card_last_four: paymentInfo.method === 'credit_card' ? '****1234' : null
          }
        });
      } else {
        reject({
          success: false,
          error_code: 'PAYMENT_FAILED',
          error_message: 'การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
        });
      }
    }, 2000 + Math.random() * 2000); // 2-4 วินาที
  });
};

const bookingPaymentAPI = {
  createBooking,
  updateBookingStatus,
  getUserBookings,
  cancelBooking,
  createPayment,
  updatePaymentStatus,
  getPaymentByBookingId,
  getUserPayments,
  createPaymentSplit,
  updateFitnessSplitStatus,
  createRefundRequest,
  logBookingHistory,
  getBookingStats,
  getRevenueReport,
  processPaymentGateway
};

// eslint-disable-next-line import/no-anonymous-default-export
export default bookingPaymentAPI;