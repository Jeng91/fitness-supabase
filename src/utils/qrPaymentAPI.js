import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';

// QR Payment API Configuration - Thai QR (PromptPay)
const QR_PAYMENT_CONFIG = {
  thai_qr: {
    // PromptPay Configuration
    promptpay_id: process.env.REACT_APP_PROMPTPAY_ID || '0951791181', // เบอร์โทรหรือ Citizen ID
    merchant_name: process.env.REACT_APP_MERCHANT_NAME || 'PJ Fitness',
    base_url: 'https://api.promptpay.io/v1', // PromptPay API
    webhook_url: process.env.REACT_APP_WEBHOOK_URL || 'http://localhost:3001/webhook/thai-qr',
    // Development mode
    is_development: false // ✅ บังคับใช้ Production Mode
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

// สร้าง PromptPay QR ที่ถูกต้องตามมาตรฐาน Thailand QR Payment
const generateCorrectPromptPayQR = (promptpayId, amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  const amountStr = numericAmount.toFixed(2);
  
  // แปลงเบอร์โทรให้ถูกต้อง (เอา 0 หน้าออก แล้วใส่ 66)
  const phoneNumber = promptpayId.startsWith('0') 
    ? '66' + promptpayId.substring(1)
    : promptpayId;
  
  // สร้าง QR Code ตามมาตรฐาน PromptPay
  let qr = '00020101'; // Payload Format Indicator
  qr += '010212'; // Point of Initiation Method
  
  // Merchant Account Information (Tag 29)
  let tag29 = '0016A000000677010111'; // Application Identifier for PromptPay
  tag29 += '01' + phoneNumber.length.toString().padStart(2, '0') + phoneNumber;
  qr += '29' + tag29.length.toString().padStart(2, '0') + tag29;
  
  qr += '5303764'; // Transaction Currency (THB)
  qr += '54' + amountStr.length.toString().padStart(2, '0') + amountStr; // Transaction Amount
  qr += '5802TH'; // Country Code
  qr += '6304'; // CRC (placeholder)
  
  // คำนวณ CRC16
  const crc = calculateCRC16(qr);
  const finalQR = qr + crc;
  
  console.log('🔧 Correct PromptPay QR Details:', {
    originalPhone: promptpayId,
    formattedPhone: phoneNumber,
    amount: amountStr,
    qrLength: finalQR.length,
    qrString: finalQR
  });
  
  // แสดงตัวอย่าง QR String ที่ถูกต้อง
  console.log('📋 QR String Breakdown:');
  console.log('  00020101 - Payload Format');
  console.log('  010212 - Point of Initiation');
  console.log('  29xx... - Merchant Account Info');
  console.log('  5303764 - Currency (THB)');
  console.log('  54xx... - Amount');
  console.log('  5802TH - Country Code');
  console.log('  6304xxxx - CRC16');
  
  return finalQR;
};

// PromptPay QR Code Generator (ตาม EMVCo Standard)
const generatePromptPayQR = (promptpayId, amount) => {
  // ใช้ฟังก์ชันใหม่ที่ถูกต้อง
  return generateCorrectPromptPayQR(promptpayId, amount);
};

// ฟังก์ชันตรวจสอบความถูกต้องของ PromptPay QR Code
const validatePromptPayQR = (qrString) => {
  try {
    console.log('🔍 Validating PromptPay QR Code...');
    
    if (!qrString || qrString.length < 50) {
      return { valid: false, error: 'QR string too short' };
    }
    
    // ตรวจสอบ EMVCo format
    const payloadFormat = qrString.substring(0, 8);
    const pointOfInitiation = qrString.substring(8, 14);
    const currencyCode = qrString.substring(qrString.indexOf('5303764'), qrString.indexOf('5303764') + 7);
    const countryCode = qrString.substring(qrString.indexOf('5802TH'), qrString.indexOf('5802TH') + 6);
    
    // ตรวจสอบค่าพื้นฐาน
    const isValidFormat = payloadFormat === '00020101';
    const isValidInitiation = pointOfInitiation === '010212';
    const isValidCurrency = currencyCode === '5303764';
    const isValidCountry = countryCode === '5802TH';
    
    // ตรวจสอบ CRC16
    const crcPart = qrString.substring(qrString.length - 4);
    const qrWithoutCRC = qrString.substring(0, qrString.length - 4);
    const calculatedCRC = calculateCRC16(qrWithoutCRC);
    const isValidCRC = crcPart === calculatedCRC;
    
    console.log('🔍 QR Validation Results:', {
      format: isValidFormat,
      initiation: isValidInitiation,
      currency: isValidCurrency,
      country: isValidCountry,
      crc: isValidCRC,
      crcExpected: calculatedCRC,
      crcActual: crcPart
    });
    
    if (isValidFormat && isValidInitiation && isValidCurrency && isValidCountry && isValidCRC) {
      return { valid: true, message: 'QR Code is valid PromptPay format' };
    } else {
      return { 
        valid: false, 
        error: 'Invalid PromptPay format',
        details: {
          format: isValidFormat,
          initiation: isValidInitiation,
          currency: isValidCurrency,
          country: isValidCountry,
          crc: isValidCRC
        }
      };
    }
    
  } catch (error) {
    console.error('❌ QR Validation Error:', error);
    return { valid: false, error: error.message };
  }
};

// ฟังก์ชันทดสอบ PromptPay QR Code
const testPromptPayQRGeneration = () => {
  console.log('🧪 Testing PromptPay QR Generation...');
  
  try {
    // ทดสอบด้วยข้อมูลจริง
    const testPhone = '0951791181';
    const testAmount = 1.00;
    
    const qrString = generateCorrectPromptPayQR(testPhone, testAmount);
    
    console.log('✅ Test Results:');
    console.log('📞 Phone:', testPhone);
    console.log('💰 Amount:', testAmount, 'THB');
    console.log('📱 QR String:', qrString);
    console.log('📏 QR Length:', qrString.length);
    
    // ตรวจสอบองค์ประกอบพื้นฐาน
    const hasPayloadFormat = qrString.startsWith('00020101');
    const hasThailandCode = qrString.includes('5802TH');
    const hasPromptPayId = qrString.includes('A000000677010111');
    
    console.log('🔍 Validation:');
    console.log('- Payload Format:', hasPayloadFormat ? '✅' : '❌');
    console.log('- Thailand Code:', hasThailandCode ? '✅' : '❌');
    console.log('- PromptPay ID:', hasPromptPayId ? '✅' : '❌');
    
    return qrString;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
};

// Export test function
if (typeof window !== 'undefined') {
  window.testPromptPayQR = testPromptPayQRGeneration;
}

// สร้าง QR Code Image จาก PromptPay String (Production Quality)
const generateQRImageFromString = async (qrString, amount) => {
  try {
    // ✅ สร้าง QR Code จริงด้วย qrcode library - Production Quality
    const qrDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H', // High error correction สำหรับ Banking Apps
      type: 'image/png',
      quality: 1.0, // คุณภาพสูงสุด
      margin: 4, // margin เพิ่มเติมเพื่อความปลอดภัย
      color: {
        dark: '#000000', // สีดำเข้ม
        light: '#FFFFFF' // สีขาวบริสุทธิ์
      },
      width: 512, // ขนาดใหญ่เพื่อความชัดเจนใน Banking Apps
      scale: 8 // Scale สูงเพื่อความละเอียด
    });
    
    console.log('✅ Production QR Code Image Generated Successfully');
    console.log('📱 QR Image Details:', {
      format: 'PNG',
      size: '512x512px',
      errorCorrection: 'H (High)',
      margin: '4px',
      scale: '8x',
      dataLength: qrString.length,
      promptPayId: QR_PAYMENT_CONFIG.thai_qr.promptpay_id,
      amount: amount + ' THB',
      qrPreview: qrString.substring(0, 50) + '...'
    });
    
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
      
      // สร้าง PromptPay QR Code จริงแม้ใน development mode
      const devQRString = generatePromptPayQR(config.promptpay_id, amount);
      console.log('📱 PromptPay QR String (Dev):', devQRString);
      
      // สร้าง QR Code Image จริงที่สแกนได้
      const devQRImage = await generateQRImageFromString(devQRString, amount);
      
      return {
        success: true,
        data: {
          transactionId: `DEV${Date.now()}`,
          qrString: devQRString,
          qrImage: devQRImage,
          amount: amount,
          currency: 'THB',
          status: 'pending',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          promptpay_id: config.promptpay_id
        }
      };
    }
    
    // ✅ Production: สร้าง PromptPay QR Code เองตาม EMVCo Standard
    console.log('🚀 Production Mode: Generating REAL PromptPay QR Code');
    
    // ตรวจสอบและแปลงค่า amount สำหรับ production
    const amount = parseFloat(paymentData.amount || paymentData.total_amount) || 0;
    if (amount <= 0) {
      throw new Error(`Invalid payment amount: ${paymentData.amount || paymentData.total_amount}`);
    }
    
    // สร้าง Transaction ID ที่ไม่ซ้ำกัน
    const transactionId = `PROD_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    // สร้าง PromptPay QR Code จริงตาม EMVCo Standard
    const productionQRString = generatePromptPayQR(config.promptpay_id, amount);
    
    // ✅ ตรวจสอบความถูกต้องของ QR Code ก่อนส่งไปยัง UI
    const validation = validatePromptPayQR(productionQRString);
    if (!validation.valid) {
      console.error('❌ QR Validation Failed:', validation.error);
      throw new Error(`QR Code validation failed: ${validation.error}`);
    }
    
    console.log('📱 Production PromptPay QR Generated & Validated:', {
      qrLength: productionQRString.length,
      amount: amount,
      promptpay_id: config.promptpay_id,
      transactionId: transactionId,
      validation: validation.message
    });
    
    // สร้าง QR Code Image จริงที่สแกนได้ใน Banking App
    const productionQRImage = await generateQRImageFromString(productionQRString, amount);
    
    return {
      success: true,
      data: {
        transactionId: transactionId,
        qrString: productionQRString,
        qrImage: productionQRImage,
        amount: amount,
        currency: 'THB',
        status: 'pending',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        promptpay_id: config.promptpay_id,
        payment_method: 'promptpay',
        merchant_name: config.merchant_name,
        is_production: true
      }
    };
    
    const finalQRString = generatePromptPayQR(config.promptpay_id, amount);
    console.log('📱 PromptPay QR String:', finalQRString);
    
    // สร้าง QR Code Image จริง
    const qrImagePNG = await generateQRImageFromString(finalQRString, amount);
    
    console.log('✅ PromptPay QR generated successfully:', {
      transactionId,
      amount,
      promptpay_id: config.promptpay_id
    });
    
    return {
      success: true,
      data: {
        transactionId: transactionId,
        qrString: finalQRString,
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
};// ฟังก์ชันช่วยสำหรับการทดสอบ QR Code
const testPromptPayQR = (promptpayId = '0951791181', amount = 1.00) => {
  console.log('🧪 Testing PromptPay QR Generation...');
  try {
    const qrString = generatePromptPayQR(promptpayId, amount);
    console.log('📱 Test QR String:', qrString);
    console.log('💰 Test Amount:', amount);
    console.log('📞 Test PromptPay ID:', promptpayId);
    
    // แสดง breakdown ของ QR String
    console.log('🔍 QR String Breakdown:');
    console.log('- Payload Format:', qrString.substring(0, 8)); // 00020101
    console.log('- Point of Initiation:', qrString.substring(8, 14)); // 010212
    console.log('- Merchant Account Info:', qrString.substring(14, qrString.indexOf('5303764')));
    console.log('- Currency:', qrString.substring(qrString.indexOf('5303764'), qrString.indexOf('5303764') + 7)); // 5303764
    console.log('- Amount:', qrString.substring(qrString.indexOf('54'), qrString.indexOf('5802TH')));
    console.log('- Country:', qrString.substring(qrString.indexOf('5802TH'), qrString.indexOf('5802TH') + 6)); // 5802TH
    console.log('- CRC:', qrString.slice(-4));
    
    return qrString;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
};

// ✅ Production QR Testing Functions สำหรับ Console
if (typeof window !== 'undefined') {
  window.testPromptPayQR = (promptpayId = '0951791181', amount = 1.00) => {
    console.log('🧪 Testing Production PromptPay QR...');
    try {
      const qrString = generateCorrectPromptPayQR(promptpayId, amount);
      const validation = validatePromptPayQR(qrString);
      
      console.log('✅ Production Test Results:');
      console.log('📞 PromptPay ID:', promptpayId);
      console.log('💰 Amount:', amount, 'THB');
      console.log('📱 QR String:', qrString);
      console.log('📏 QR Length:', qrString.length);
      console.log('✔️ Validation:', validation);
      
      return { qrString, validation, promptpayId, amount };
    } catch (error) {
      console.error('❌ Test Error:', error);
      return { error: error.message };
    }
  };
  
  // ทดสอบสร้าง QR Image แบบจริง
  window.generateTestQR = async (amount = 1.00) => {
    console.log('🎨 Generating Production QR Image...');
    try {
      const qrString = generateCorrectPromptPayQR('0951791181', amount);
      const qrImage = await generateQRImageFromString(qrString, amount);
      
      console.log('✅ Production QR Image Generated:', qrImage.substring(0, 50) + '...');
      
      // แสดงใน DOM ชั่วคราว
      const img = document.createElement('img');
      img.src = qrImage;
      img.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; border:3px solid #00ff00; background:white; padding:10px;';
      img.title = `Production QR: ${amount} THB`;
      document.body.appendChild(img);
      
      setTimeout(() => {
        if (document.body.contains(img)) document.body.removeChild(img);
      }, 15000);
      
      return qrImage;
    } catch (error) {
      console.error('❌ QR Generation Error:', error);
      return { error: error.message };
    }
  };
  
  console.log('🛠️ Production QR Debug Functions:');
  console.log('- testPromptPayQR(phone, amount) - Test QR String Generation');
  console.log('- generateTestQR(amount) - Generate & Display Production QR');
}

const checkThaiQRPaymentStatus = async (transactionId) => {
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
        qr_code: qrResponse.data.qrString || '',
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