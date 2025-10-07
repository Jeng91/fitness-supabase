import { supabase } from '../supabaseClient';

// QR Payment API Configuration
const QR_PAYMENT_CONFIG = {
  appzstory: {
    api_key: process.env.REACT_APP_APPZSTORY_API_KEY,
    secret_key: process.env.REACT_APP_APPZSTORY_SECRET_KEY,
    merchant_id: process.env.REACT_APP_APPZSTORY_MERCHANT_ID,
    base_url: process.env.REACT_APP_ENVIRONMENT === 'production' 
      ? process.env.REACT_APP_APPZSTORY_API_URL 
      : process.env.REACT_APP_APPZSTORY_SANDBOX_URL,
    webhook_url: process.env.REACT_APP_WEBHOOK_URL || 'http://localhost:3001/webhook/appzstory',
    // เพิ่มโหมด development สำหรับใช้ mock API
    is_development: process.env.REACT_APP_ENVIRONMENT === 'development'
  }
};

// Utility Functions
const generateSignature = async (data, secretKey) => {
  try {
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    const fullString = `${signString}&secret=${secretKey}`;
    
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(fullString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signature;
  } catch (error) {
    console.error('❌ Signature generation error:', error);
    throw error;
  }
};

// สร้าง Mock QR Code สำหรับ Development
const generateMockQRCode = (paymentData) => {
  const qrData = `EMVCo QR Code\nAmount: ${paymentData.amount} THB\nReference: ${paymentData.reference}\nMerchant: ${paymentData.merchant_id}`;
  
  // สร้าง SVG QR Code แบบง่าย (Mock)
  const qrSvg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="20" height="20" fill="black"/>
      <rect x="40" y="10" width="20" height="20" fill="black"/>
      <rect x="70" y="10" width="20" height="20" fill="black"/>
      <rect x="10" y="40" width="20" height="20" fill="black"/>
      <rect x="70" y="40" width="20" height="20" fill="black"/>
      <rect x="10" y="70" width="20" height="20" fill="black"/>
      <rect x="40" y="70" width="20" height="20" fill="black"/>
      <rect x="70" y="70" width="20" height="20" fill="black"/>
      <text x="100" y="100" font-family="Arial" font-size="12" fill="black">Mock QR</text>
      <text x="100" y="120" font-family="Arial" font-size="10" fill="gray">${paymentData.amount} THB</text>
    </svg>
  `;
  
  // Convert SVG to Data URL
  const base64 = btoa(unescape(encodeURIComponent(qrSvg)));
  return `data:image/svg+xml;base64,${base64}`;
};

// AppzStory Studio API Functions
const callAppzStoryAPI = async (paymentData) => {
  try {
    const config = QR_PAYMENT_CONFIG.appzstory;
    
    // ถ้าเป็น development mode ให้ใช้ mock response
    if (config.is_development) {
      console.log('🧪 Development Mode: Using Mock AppzStory API Response');
      
      // Mock response สำหรับ development
      await new Promise(resolve => setTimeout(resolve, 1000)); // จำลองการรอ API
      
      const mockQRCode = generateMockQRCode(paymentData);
      
      return {
        success: true,
        data: {
          payment_id: `mock_payment_${Date.now()}`,
          qr_code_url: mockQRCode,
          qr_code_text: '00020101021102160004123456789012345678901234567890',
          reference_id: paymentData.reference,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'pending',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
      };
    }
    
    // Production API call
    const requestBody = {
      amount: paymentData.amount,
      currency: paymentData.currency || 'THB',
      reference_id: paymentData.reference,
      description: paymentData.description,
      merchant_id: config.merchant_id,
      webhook_url: config.webhook_url,
      timestamp: Date.now()
    };
    
    // สร้าง signature
    const signature = await generateSignature(requestBody, config.secret_key);
    
    // เรียก API
    const response = await fetch(`${config.base_url}/payments/qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
        'X-Signature': signature
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'API request failed');
    }
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('❌ AppzStory API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const checkAppzStoryPaymentStatus = async (transactionId) => {
  try {
    const config = QR_PAYMENT_CONFIG.appzstory;
    
    // ถ้าเป็น development mode ให้ใช้ mock response
    if (config.is_development) {
      console.log('🧪 Development Mode: Using Mock Payment Status Check');
      
      // Mock response - สุ่มสถานะเพื่อทดสอบ
      const mockStatuses = ['pending', 'success', 'failed'];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
      
      return {
        success: true,
        data: {
          payment_id: `mock_payment_${transactionId}`,
          reference_id: transactionId,
          status: randomStatus,
          amount: 299,
          currency: 'THB',
          paid_at: randomStatus === 'success' ? new Date().toISOString() : null,
          failed_at: randomStatus === 'failed' ? new Date().toISOString() : null
        }
      };
    }
    
    // Production API call
    const response = await fetch(`${config.base_url}/payments/${transactionId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Status check failed');
    }
    
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    console.error('❌ Payment status check error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// สร้าง Transaction ID ที่ไม่ซ้ำกัน
export const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `TXN_${timestamp}_${random}`;
};

// Main QR Payment Functions
export const generatePaymentQR = async (paymentData) => {
  try {
    console.log('🔄 Generating QR Payment with AppzStory...', paymentData);

    // ตรวจสอบ Authentication ก่อน
    const { data: { user: currentUser }, error: authCheckError } = await supabase.auth.getUser();
    if (authCheckError || !currentUser) {
      throw new Error('User must be logged in to create payment');
    }
    console.log('👤 Authenticated user:', currentUser.id);

    // เรียก AppzStory Studio API สำหรับสร้าง QR Payment
    const qrResponse = await callAppzStoryAPI({
      amount: paymentData.total_amount,
      currency: 'THB',
      reference: paymentData.transaction_id,
      description: paymentData.description || 'Fitness Booking Payment',
      merchant_id: QR_PAYMENT_CONFIG.appzstory.merchant_id,
      webhook_url: QR_PAYMENT_CONFIG.appzstory.webhook_url,
    });

    if (!qrResponse.success) {
      throw new Error(qrResponse.error);
    }

    // บันทึกข้อมูลการชำระเงินลงฐานข้อมูล
    // ดึง user_id จาก auth.getUser() เพื่อให้แน่ใจว่าตรงกับ auth.uid()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      throw new Error('User not authenticated');
    }

    console.log('👤 User ID:', authUser.id);
    console.log('💾 Inserting QR payment data...', {
      transaction_id: paymentData.transaction_id,
      amount: paymentData.total_amount,
      user_id: authUser.id
    });

    const { data: qrRecord, error: dbError } = await supabase
      .from('qr_payments')
      .insert([{
        transaction_id: paymentData.transaction_id,
        amount: paymentData.total_amount,
        currency: 'THB',
        status: 'pending',
        qr_code: qrResponse.data.qr_code_text || '00020101021102160004123456789012345678901234567890',
        qr_image_url: qrResponse.data.qr_code_url,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        user_id: authUser.id, // ใช้ authUser.id จาก auth.getUser()
        gateway_response: qrResponse.data
      }])
      .select()
      .single();

    // เพิ่ม debug information สำหรับ database error
    if (dbError) {
      console.error('❌ Database error details:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        user_id: authUser.id
      });
      throw new Error(`Failed to save payment record: ${dbError.message}`);
    }

    console.log('✅ QR Payment created successfully:', qrRecord);

    return {
      success: true,
      data: {
        transaction_id: paymentData.transaction_id,
        qr_code_url: qrResponse.data.qr_code_url,
        qr_code_text: qrResponse.data.qr_code_text,
        payment_id: qrResponse.data.payment_id,
        amount: paymentData.total_amount,
        expires_at: qrRecord.expires_at,
        status: 'pending'
      }
    };

  } catch (error) {
    console.error('❌ QR Payment generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const checkQRPaymentStatus = async (transactionId) => {
  try {
    console.log('🔄 Checking payment status:', transactionId);

    // ตรวจสอบสถานะจากฐานข้อมูลก่อน
    const { data: localPayment, error: localError } = await supabase
      .from('qr_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (localError) {
      throw new Error('Payment record not found');
    }

    // ถ้าสถานะยังเป็น pending ให้ตรวจสอบจาก AppzStory Studio
    if (localPayment.status === 'pending') {
      const statusResponse = await checkAppzStoryPaymentStatus(transactionId);
      
      if (statusResponse.success && statusResponse.data.status !== localPayment.status) {
        // อัปเดตสถานะในฐานข้อมูล
        const { error: updateError } = await supabase
          .from('qr_payments')
          .update({
            status: statusResponse.data.status,
            paid_at: statusResponse.data.status === 'success' ? new Date().toISOString() : null,
            gateway_response: statusResponse.data
          })
          .eq('transaction_id', transactionId);

        if (updateError) {
          console.error('❌ Status update error:', updateError);
        }

        return {
          success: true,
          data: {
            ...localPayment,
            status: statusResponse.data.status,
            paid_at: statusResponse.data.status === 'success' ? new Date().toISOString() : null
          }
        };
      }
    }

    return {
      success: true,
      data: localPayment
    };

  } catch (error) {
    console.error('❌ Payment status check error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const cancelQRPayment = async (transactionId) => {
  try {
    console.log('🔄 Cancelling QR Payment:', transactionId);

    // อัปเดตสถานะในฐานข้อมูล
    const { data, error } = await supabase
      .from('qr_payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to cancel payment');
    }

    console.log('✅ Payment cancelled successfully:', data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ Payment cancellation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export configuration for external use
export { QR_PAYMENT_CONFIG };

const qrPaymentModule = {
  generatePaymentQR,
  checkQRPaymentStatus,
  cancelQRPayment,
  generateTransactionId,
  QR_PAYMENT_CONFIG
};

export default qrPaymentModule;