import { supabase } from '../supabaseClient';

// ฟังก์ชันสำหรับสร้างการชำระเงินสมาชิก
export const createMembershipPayment = async (paymentData, bookingData) => {
  try {
    console.log('🔄 Creating membership payment...', { paymentData, bookingData });

    // 1. สร้างข้อมูลการชำระเงิน
    const { data: paymentResult, error: paymentError } = await supabase
      .from('payments')
      .insert({
        total_amount: paymentData.total_amount,
        payment_method: paymentData.payment_method,
        payment_status: paymentData.payment_status,
        transaction_id: paymentData.transaction_id,
        gateway_response: paymentData.gateway_response,
        gateway_reference: paymentData.gateway_reference,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Payment creation failed: ${paymentError.message}`);
    }

    console.log('✅ Payment created:', paymentResult);

    // 2. คำนวณวันที่เริ่มและสิ้นสุดสมาชิก
    const startDate = new Date(bookingData.start_date || new Date().toISOString().split('T')[0]);
    const endDate = new Date(startDate);
    
    if (bookingData.membership_type === 'monthly') {
      endDate.setDate(endDate.getDate() + 30 - 1); // -1 เพราะวันแรกนับเป็นวันที่ 1
    } else if (bookingData.membership_type === 'yearly') {
      endDate.setDate(endDate.getDate() + 365 - 1); // -1 เพราะวันแรกนับเป็นวันที่ 1
    }

    // 3. สร้างข้อมูลสมาชิก
    const { data: membershipResult, error: membershipError } = await supabase
      .from('tbl_memberships')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        fitness_id: bookingData.fitness_id,
        membership_type: bookingData.membership_type,
        amount: paymentData.total_amount,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        payment_id: paymentResult.payment_id
      })
      .select()
      .single();

    if (membershipError) {
      throw new Error(`Membership creation failed: ${membershipError.message}`);
    }

    console.log('✅ Membership created:', membershipResult);

    return {
      success: true,
      data: {
        payment: paymentResult,
        membership: membershipResult
      }
    };

  } catch (error) {
    console.error('❌ createMembershipPayment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลสมาชิกของฟิตเนส
export const getFitnessMemberships = async (fitnessId) => {
  try {
    console.log('🔄 Fetching memberships for fitness:', fitnessId);

    const { data, error } = await supabase
      .from('tbl_memberships')
      .select(`
        *,
        profiles:user_id (
          username,
          useremail,
          full_name,
          usertel
        ),
        payments:payment_id (
          transaction_id,
          paid_at
        )
      `)
      .eq('fitness_id', fitnessId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch memberships: ${error.message}`);
    }

    console.log('✅ Memberships fetched:', data);

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ getFitnessMemberships error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลการสมัครคลาส
export const getFitnessClassEnrollments = async (fitnessId) => {
  try {
    console.log('🔄 Fetching class enrollments for fitness:', fitnessId);

    const { data, error } = await supabase
      .from('tbl_class_enrollments')
      .select(`
        *,
        profiles:user_id (
          username,
          useremail,
          full_name,
          usertel
        ),
        tbl_classes:class_id (
          class_name,
          description,
          price
        ),
        payments:payment_id (
          transaction_id,
          paid_at
        )
      `)
      .eq('fitness_id', fitnessId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch class enrollments: ${error.message}`);
    }

    console.log('✅ Class enrollments fetched:', data);

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ getFitnessClassEnrollments error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// ฟังก์ชันสำหรับสร้างการสมัครคลาส
export const createClassEnrollment = async (enrollmentData) => {
  try {
    console.log('🔄 Creating class enrollment...', enrollmentData);

    const { data, error } = await supabase
      .from('tbl_class_enrollments')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        class_id: enrollmentData.class_id,
        fitness_id: enrollmentData.fitness_id,
        payment_id: enrollmentData.payment_id,
        status: 'enrolled'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Class enrollment failed: ${error.message}`);
    }

    console.log('✅ Class enrollment created:', data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ createClassEnrollment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับอัปเดตสถานะสมาชิก
export const updateMembershipStatus = async (membershipId, status) => {
  try {
    const { data, error } = await supabase
      .from('tbl_memberships')
      .update({ status })
      .eq('membership_id', membershipId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update membership status: ${error.message}`);
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ updateMembershipStatus error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};