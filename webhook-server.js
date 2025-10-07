const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ฟังก์ชันตรวจสอบ signature
const verifySignature = (data, receivedSignature) => {
  try {
    const secretKey = process.env.APPZSTORY_SECRET_KEY;
    
    // สร้าง signature string
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    const fullString = `${signString}&secret=${secretKey}`;
    
    // สร้าง hash
    const expectedSignature = crypto.createHash('sha256')
      .update(fullString)
      .digest('hex');
    
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
};

// Webhook endpoint สำหรับ AppzStory Studio
app.post('/webhook/appzstory', async (req, res) => {
  try {
    console.log('🔔 Received AppzStory webhook:', req.body);
    
    const signature = req.headers['x-signature'] || req.body.signature;
    const webhookData = req.body;
    
    // ตรวจสอบ signature
    if (!verifySignature(webhookData, signature)) {
      console.log('❌ Invalid signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
    
    // ประมวลผล webhook
    await processWebhook(webhookData);
    
    console.log('✅ Webhook processed successfully');
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ฟังก์ชันประมวลผล webhook
const processWebhook = async (data) => {
  const { 
    payment_id, 
    reference_id, 
    status, 
    amount, 
    paid_at,
    gateway_reference 
  } = data;
  
  console.log(`📝 Processing payment: ${reference_id}, Status: ${status}`);
  
  // ที่นี่คุณสามารถเชื่อมต่อกับ Supabase หรือ database ของคุณ
  // เพื่ออัปเดตสถานะการชำระเงิน
  
  if (status === 'success') {
    console.log('✅ Payment successful, updating booking status...');
    // อัปเดตสถานะการจอง/สมาชิก
  } else if (status === 'failed') {
    console.log('❌ Payment failed');
  } else if (status === 'expired') {
    console.log('⏰ Payment expired');
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'AppzStory Webhook Server'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook/appzstory`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;