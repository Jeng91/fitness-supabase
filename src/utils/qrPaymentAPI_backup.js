import { supabase } from '../supabaseClient';

// AppzStory Studio QR Payment Configuration
const QR_PAYMENT_CONFIG = {
  // AppzStory Studio API Configuration
  appzstory: {
    api_url: 'https://api.appzstory.studio/v1',
    merchant_id: process.env.REACT_APP_APPZSTORY_MERCHANT_ID || 'MERCHANT_TEST_001',
    api_key: process.env.REACT_APP_APPZSTORY_API_KEY || 'appz_test_key_123456',
    secret_key: process.env.REACT_APP_APPZSTORY_SECRET_KEY || 'appz_secret_789',
    // Webhook URL for payment notifications
    webhook_url: `${window.location.origin}/api/payment/webhook`,
    // Return URL after payment
    return_url: `${window.location.origin}/payment/success`
  }
};

// ฟังก์ชันสร้าง QR Code สำหรับการชำระเงิน
export const generatePaymentQR = async (paymentData) => {
  try {
    console.log('🔄 Generating QR Payment with AppzStory...', paymentData);

    // เรียก AppzStory Studio API สำหรับสร้าง QR Payment
    const qrResponse = await callAppzStoryAPI({
      amount: paymentData.total_amount,
      currency: 'THB',
      reference: paymentData.transaction_id,
      description: paymentData.description || 'Fitness Booking Payment',
      merchant_id: QR_PAYMENT_CONFIG.appzstory.merchant_id,
      webhook_url: QR_PAYMENT_CONFIG.appzstory.webhook_url,
      return_url: QR_PAYMENT_CONFIG.appzstory.return_url
    });

    if (!qrResponse.success) {
      throw new Error(qrResponse.error || 'Failed to generate QR code');
    }

    // บันทึกข้อมูล QR Payment ในฐานข้อมูล
    const { error: dbError } = await supabase
      .from('qr_payments')
      .insert({
        transaction_id: paymentData.transaction_id,
        qr_code: qrResponse.qr_code,
        qr_image_url: qrResponse.qr_image_url,
        amount: paymentData.total_amount,
        currency: 'THB',
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // หมดอายุใน 15 นาที
        payment_method: 'qr_appzstory',
        gateway_response: qrResponse,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

    if (dbError) {
      console.error('❌ Failed to save QR payment record:', dbError);
    }

    return {
      success: true,
      data: {
        qr_code: qrResponse.qr_code,
        qr_image_url: qrResponse.qr_image_url,
        transaction_id: paymentData.transaction_id,
        amount: paymentData.total_amount,
        expires_at: qrResponse.expires_at,
        payment_url: qrResponse.payment_url,
        appzstory_payment_id: qrResponse.payment_id
      }
    };

  } catch (error) {
    console.error('❌ generatePaymentQR error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันตรวจสอบสถานะการชำระเงิน QR
export const checkQRPaymentStatus = async (transactionId) => {
  try {
    console.log('🔍 Checking QR payment status for:', transactionId);

    // ตรวจสอบจากฐานข้อมูลก่อน
    const { data: qrPayment, error: dbError } = await supabase
      .from('qr_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // ถ้าพบข้อมูลและสถานะเป็น success แล้ว
    if (qrPayment && qrPayment.status === 'success') {
      return {
        success: true,
        data: {
          status: 'success',
          transaction_id: transactionId,
          paid_at: qrPayment.paid_at,
          amount: qrPayment.amount
        }
      };
    }

    // เรียก AppzStory Studio API เพื่อตรวจสอบสถานะ
    const statusResponse = await checkAppzStoryPaymentStatus(transactionId, qrPayment?.gateway_response?.payment_id);

    // อัปเดตสถานะในฐานข้อมูล
    if (statusResponse.success && statusResponse.data.status === 'success') {
      await supabase
        .from('qr_payments')
        .update({
          status: 'success',
          paid_at: new Date().toISOString(),
          gateway_response: statusResponse.data
        })
        .eq('transaction_id', transactionId);
    }

    return statusResponse;

  } catch (error) {
    console.error('❌ checkQRPaymentStatus error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันยกเลิก QR Payment
export const cancelQRPayment = async (transactionId) => {
  try {
    console.log('❌ Canceling QR payment:', transactionId);

    // อัปเดตสถานะในฐานข้อมูล
    const { error: updateError } = await supabase
      .from('qr_payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('transaction_id', transactionId);

    if (updateError) {
      throw new Error(`Failed to cancel payment: ${updateError.message}`);
    }

    return {
      success: true,
      data: {
        status: 'cancelled',
        transaction_id: transactionId
      }
    };

  } catch (error) {
    console.error('❌ cancelQRPayment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// AppzStory Studio API Functions
const callAppzStoryAPI = async (paymentData) => {
  try {
    const config = QR_PAYMENT_CONFIG.appzstory;
    
    // สร้าง request body ตาม AppzStory Studio API format
    const requestBody = {
      merchant_id: config.merchant_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      reference_id: paymentData.reference,
      description: paymentData.description,
      webhook_url: paymentData.webhook_url,
      return_url: paymentData.return_url,
      payment_method: 'qr_code',
      expires_in: 900 // 15 minutes
    };

    // สร้าง signature สำหรับ security
    const signature = await generateSignature(requestBody, config.secret_key);

    const response = await fetch(`${config.api_url}/payments/qr/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`,
        'X-Signature': signature,
        'X-Merchant-ID': config.merchant_id
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        success: true,
        qr_code: data.qr_code,
        qr_image_url: data.qr_image_url,
        payment_id: data.payment_id,
        payment_url: data.payment_url,
        expires_at: data.expires_at
      };
    } else {
      throw new Error(data.message || 'Failed to create QR payment');
    }

  } catch (error) {
    console.error('❌ AppzStory API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const checkAppzStoryPaymentStatus = async (transactionId, paymentId) => {
  try {
    const config = QR_PAYMENT_CONFIG.appzstory;
    
    const response = await fetch(`${config.api_url}/payments/${paymentId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'X-Merchant-ID': config.merchant_id
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: {
        status: data.payment_status, // 'pending', 'success', 'failed', 'expired'
        transaction_id: transactionId,
        payment_id: paymentId,
        paid_at: data.paid_at,
        amount: data.amount,
        gateway_reference: data.gateway_reference
      }
    };

  } catch (error) {
    console.error('❌ AppzStory Status Check Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสร้าง signature สำหรับ AppzStory API security
const generateSignature = async (data, secretKey) => {
  try {
    // สร้าง string จาก data object
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    const fullString = `${signString}&secret=${secretKey}`;
    
    // สร้าง SHA-256 hash
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(fullString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('❌ Signature generation error:', error);
    return '';
  }
};

// ฟังก์ชันสำหรับสร้าง Transaction ID
export const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN_${timestamp}_${random}`.toUpperCase();
};

// ฟังก์ชันแปลงจำนวนเงินเป็นรูปแบบ QR Code
export const formatAmountForQR = (amount) => {
  return parseFloat(amount).toFixed(2);
};

// ฟังก์ชันตรวจสอบความถูกต้องของ QR Code
export const validateQRCode = (qrCode) => {
  try {
    // ตรวจสอบรูปแบบพื้นฐานของ QR Code
    if (!qrCode || typeof qrCode !== 'string') {
      return false;
    }

    // ตรวจสอบว่าเป็น PromptPay QR Code หรือไม่
    return qrCode.startsWith('00020101') && qrCode.length >= 100;
  } catch (error) {
    console.error('QR Code validation error:', error);
    return false;
  }
};

const qrPaymentAPI = {
  generatePaymentQR,
  checkQRPaymentStatus,
  cancelQRPayment,
  generateTransactionId,
  formatAmountForQR,
  validateQRCode
};

export default qrPaymentAPI;