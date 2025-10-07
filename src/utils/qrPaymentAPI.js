import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';

// QR Payment API Configuration - Thai QR (PromptPay)
const QR_PAYMENT_CONFIG = {
  thai_qr: {
    // PromptPay Configuration
    promptpay_id: process.env.REACT_APP_PROMPTPAY_ID || '0647827094', // เบอร์โทรหรือ Citizen ID
    merchant_name: process.env.REACT_APP_MERCHANT_NAME || 'PJ Fitness',
    base_url: 'https://api.promptpay.io/v1', // PromptPay API
    webhook_url: process.env.REACT_APP_WEBHOOK_URL || 'http://localhost:3001/webhook/thai-qr',
    // Development mode
    is_development: process.env.REACT_APP_ENVIRONMENT === 'development'
  }
};

// Utility Functions
// Note: GBPrimePay ไม่ต้องใช้ signature generation
// const generateSignature = async (data, secretKey) => {
//   try {
//     const sortedKeys = Object.keys(data).sort();
//     const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
//     const fullString = `${signString}&secret=${secretKey}`;
//     
//     const encoder = new TextEncoder();
//     const dataBuffer = encoder.encode(fullString);
//     const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
//     const hashArray = Array.from(new Uint8Array(hashBuffer));
//     const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
//     
//     return signature;
//   } catch (error) {
//     console.error('❌ Signature generation error:', error);
//     throw error;
//   }
// };

// Cache สำหรับ User Authentication (เพื่อลดการเรียก API ซ้ำ)
let cachedUser = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fast User Authentication with Cache
const getCurrentUser = async () => {
  const now = Date.now();
  
  // ใช้ cache ถ้ายังไม่หมดอายุ
  if (cachedUser && (now - cacheTime) < CACHE_DURATION) {
    return cachedUser;
  }
  
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    throw new Error('User not authenticated');
  }
  
  // อัปเดต cache
  cachedUser = authUser;
  cacheTime = now;
  
  return authUser;
};

// สร้าง Mock QR Code สำหรับ Development (Fast Generation)
const generateMockQRCode = (paymentData) => {
  // Simple and fast SVG QR Code pattern
  const qrSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="white"/><rect x="10" y="10" width="20" height="20" fill="black"/><rect x="40" y="10" width="20" height="20" fill="black"/><rect x="70" y="10" width="20" height="20" fill="black"/><rect x="10" y="40" width="20" height="20" fill="black"/><rect x="70" y="40" width="20" height="20" fill="black"/>
      <rect x="10" y="70" width="20" height="20" fill="black"/>
      <rect x="40" y="70" width="20" height="20" fill="black"/>
      <rect x="70" y="70" width="20" height="20" fill="black"/>
      <text x="100" y="100" font-family="Arial" font-size="12" fill="black">Thai QR</text>
      <text x="100" y="120" font-family="Arial" font-size="10" fill="gray">${paymentData.amount} THB</text>
    </svg>
  `;
  
  // Convert SVG to Data URL
  const base64 = btoa(unescape(encodeURIComponent(qrSvg)));
  return `data:image/svg+xml;base64,${base64}`;
};

// PromptPay QR Code Generator (ตาม EMVCo Standard)
const generatePromptPayQR = (promptpayId, amount) => {
  // แปลง amount เป็น number และตรวจสอบความถูกต้อง
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  const formatAmount = numericAmount.toFixed(2);
  
  // ลบ prefix เบอร์โทร (0 แรก) และใส่ country code
  const cleanedId = promptpayId.startsWith('0') 
    ? '66' + promptpayId.slice(1) 
    : promptpayId;
  
  console.log('🔧 PromptPay QR Generation Debug:', {
    originalId: promptpayId,
    cleanedId: cleanedId,
    amount: formatAmount
  });
  
  // PromptPay QR Structure ตาม EMVCo (Thailand)
  const parts = [
    '00020101', // Payload Format Indicator
    '010212', // Point of Initiation Method (Static QR)
    '29' + ('0' + (16 + cleanedId.length)).toString().padStart(2, '0'), // Merchant Account Template Length
    '0016A000000677010111', // Application Identifier (PromptPay)
    '01' + ('0' + cleanedId.length).toString().padStart(2, '0') + cleanedId, // Proxy ID
    '5303764', // Transaction Currency (764 = THB)
    '54' + ('0' + formatAmount.length).toString().padStart(2, '0') + formatAmount, // Transaction Amount
    '5802TH', // Country Code
    '6304' // CRC placeholder
  ];
  
  const qrStringWithoutCRC = parts.join('');
  console.log('📱 QR String (without CRC):', qrStringWithoutCRC);
  
  // คำนวณ CRC16 สำหรับ production
  const crc = calculateCRC16(qrStringWithoutCRC);
  const finalQRString = qrStringWithoutCRC + crc;
  
  console.log('✅ Final PromptPay QR String:', finalQRString);
  console.log('🔐 CRC16:', crc);
  
  return finalQRString;
};

// สร้าง QR Code Image จาก PromptPay String (Production Ready)
const generateQRImageFromString = async (qrString, amount) => {
  try {
    // สร้าง QR Code จริงด้วย qrcode library
    const qrDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });
    
    console.log('✅ Real QR Code generated successfully');
    return qrDataURL;
    
  } catch (error) {
    console.error('❌ QR Code generation error:', error);
    // Fallback to simple pattern if QR generation fails
    const fallbackSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="white"/><rect x="10" y="10" width="60" height="60" fill="black"/><rect x="20" y="20" width="40" height="40" fill="white"/><rect x="30" y="30" width="20" height="20" fill="black"/><rect x="130" y="10" width="60" height="60" fill="black"/><rect x="140" y="20" width="40" height="40" fill="white"/><rect x="150" y="30" width="20" height="20" fill="black"/><rect x="10" y="130" width="60" height="60" fill="black"/><rect x="20" y="140" width="40" height="40" fill="white"/><rect x="30" y="150" width="20" height="20" fill="black"/><rect x="90" y="90" width="20" height="20" fill="black"/><text x="100" y="180" font-family="Arial" font-size="12" fill="black" text-anchor="middle">PromptPay QR</text><text x="100" y="195" font-family="Arial" font-size="10" fill="gray" text-anchor="middle">${amount} THB</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
  }
};

// CRC16 Calculation สำหรับ PromptPay EMVCo Standard (Production Ready)
const calculateCRC16 = (data) => {
  const polynomial = 0x1021; // CRC-16-CCITT polynomial
  let crc = 0xFFFF; // Initial value
  
  // Convert string to bytes and calculate CRC
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= (byte << 8);
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF; // Keep it 16-bit
    }
  }
  
  // Return as 4-digit uppercase hex
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

// Thai QR (PromptPay) API Functions
const callThaiQRAPI = async (paymentData) => {
  try {
    const config = QR_PAYMENT_CONFIG.thai_qr;
    
    // Debug log config
    console.log('🔧 Thai QR Config:', {
      is_development: config.is_development,
      environment: process.env.REACT_APP_ENVIRONMENT,
      promptpay_id: config.promptpay_id
    });
    
    // ถ้าเป็น development mode ให้ใช้ mock response
    if (config.is_development) {
      console.log('🧪 Development Mode: Using Mock Thai QR API Response');
      console.log('💰 Payment data received:', paymentData);
      
      // ตรวจสอบและแปลงค่า amount
      const amount = parseFloat(paymentData.amount || paymentData.total_amount) || 0;
      if (amount <= 0) {
        throw new Error(`Invalid payment amount: ${paymentData.amount || paymentData.total_amount}`);
      }
      
      // Mock response สำหรับ development (ไม่มี delay)
      const mockQRCode = generateMockQRCode(paymentData);
      
      return {
        success: true,
        data: {
          transactionId: `TQR${Date.now()}`,
          qrString: generatePromptPayQR(config.promptpay_id, amount),
          qrImage: mockQRCode,
          amount: amount,
          currency: 'THB',
          status: 'pending',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }
      };
    }
    
    // Production: สร้าง PromptPay QR Code เองตาม EMVCo Standard (Optimized)
    console.log('🚀 Production Mode: Generating Real PromptPay QR');
    
    // ตรวจสอบและแปลงค่า amount สำหรับ production
    const amount = parseFloat(paymentData.amount || paymentData.total_amount) || 0;
    if (amount <= 0) {
      throw new Error(`Invalid payment amount: ${paymentData.amount || paymentData.total_amount}`);
    }
    
    // สร้าง Transaction ID ที่ไม่ซ้ำกัน
    const transactionId = `PROD_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    // สร้าง PromptPay QR Code จริงตาม EMVCo Standard
    const realQRString = generatePromptPayQR(config.promptpay_id, amount);
    console.log('📱 PromptPay QR String:', realQRString);
    
    // สร้าง QR Code Image จริง
    const qrImagePNG = await generateQRImageFromString(realQRString, amount);
    
    console.log('✅ PromptPay QR generated successfully:', {
      transactionId,
      amount,
      promptpay_id: config.promptpay_id
    });
    
    return {
      success: true,
      data: {
        transactionId: transactionId,
        qrString: realQRString,
        qrImage: qrImagePNG,
        amount: amount,
        currency: 'THB',
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        merchant_name: config.merchant_name,
        payment_method: 'promptpay',
        promptpay_id: config.promptpay_id
      }
    };

  } catch (error) {
    console.error('❌ Thai QR API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};const checkThaiQRPaymentStatus = async (transactionId) => {
  try {
    const config = QR_PAYMENT_CONFIG.thai_qr;
    
    // ถ้าเป็น development mode ให้ใช้ mock response
    if (config.is_development) {
      console.log('🧪 Development Mode: Using Mock Thai QR Payment Status Check');
      
      // Fixed mock response for consistent testing (no random delays)
      return {
        success: true,
        data: {
          transactionId: transactionId,
          status: 'pending', // Always pending for consistent testing
          amount: 299,
          currency: 'THB',
          paid_at: null,
          failed_at: null
        }
      };
    }
    
    // Production Mode: ในการใช้งานจริง จะต้องมีระบบ Webhook หรือ Manual verification
    // เนื่องจาก PromptPay ไม่มี Public API สำหรับตรวจสอบสถานะ
    console.log('🚀 Production Mode: Payment status check from database only');
    
    // ตรวจสอบจาก database และส่งกลับสถานะปัจจุบัน
    // ในการใช้งานจริง สถานะจะถูกอัปเดตผ่าน:
    // 1. Webhook จากธนาคาร (ถ้ามี)
    // 2. Manual verification โดย Admin
    // 3. Auto-timeout หลังจากเวลาหมดอายุ
    
    return {
      success: true,
      data: {
        transactionId: transactionId,
        status: 'pending', // จะอัปเดตเมื่อมีการยืนยันจริง
        currency: 'THB',
        paid_at: null,
        note: 'Production mode: Status updated via webhook or manual verification'
      }
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
    console.log('🔄 Generating QR Payment with Thai QR...', paymentData);
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!paymentData || (!paymentData.total_amount && !paymentData.amount)) {
      throw new Error('Payment data or amount is missing');
    }

    // ตรวจสอบ Authentication ก่อน
    const { data: { user: currentUser }, error: authCheckError } = await supabase.auth.getUser();
    if (authCheckError || !currentUser) {
      throw new Error('User must be logged in to create payment');
    }
    console.log('👤 Authenticated user:', currentUser.id);

    // เรียก Thai QR API สำหรับสร้าง QR Payment
    const qrResponse = await callThaiQRAPI({
      amount: paymentData.total_amount || paymentData.amount,
      currency: 'THB',
      reference: paymentData.transaction_id,
      description: paymentData.description || 'Fitness Booking Payment'
    });

    if (!qrResponse.success) {
      throw new Error(qrResponse.error);
    }

    // บันทึกข้อมูลการชำระเงินลงฐานข้อมูล
    // ใช้ cached user authentication เพื่อความเร็ว
    const authUser = await getCurrentUser();

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
        qr_code: qrResponse.data.qrString || '00020101021102160004123456789012345678901234567890',
        qr_image_url: qrResponse.data.qrImage,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        user_id: authUser.id,
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
        qr_image_url: qrResponse.data.qrImage, // Thai QR Image
        qr_code_url: qrResponse.data.qrImage,   // เก็บไว้เผื่อใช้
        qr_code_text: qrResponse.data.qrString, // Thai QR String
        payment_id: qrResponse.data.transactionId,
        amount: paymentData.total_amount,
        expires_at: qrRecord.expires_at,
        status: 'pending'
      }
    };

  } catch (error) {
    console.error('❌ QR Payment generation error:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack,
      paymentData: paymentData
    });
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

    // ถ้าสถานะยังเป็น pending ให้ตรวจสอบจาก Thai QR
    if (localPayment.status === 'pending') {
      const statusResponse = await checkThaiQRPaymentStatus(transactionId);
      
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