# 🔔 Webhook Setup Guide สำหรับ AppzStory Studio

## 📋 ภาพรวม
คู่มือนี้จะแนะนำวิธีการตั้งค่า webhook สำหรับรับการแจ้งเตือนจาก AppzStory Studio เมื่อมีการชำระเงินผ่าน QR Code

## 🛠️ การติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install express cors
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` และเพิ่มตัวแปรต่อไปนี้:
```bash
# สำหรับ webhook server
APPZSTORY_SECRET_KEY=your_secret_key_here
PORT=3001

# สำหรับ React app
REACT_APP_WEBHOOK_URL=http://localhost:3001/webhook/appzstory
```

## 🚀 การเริ่มต้นใช้งาน

### 1. เริ่ม Webhook Server
```bash
# วิธีที่ 1: ใช้ npm script
npm run webhook

# วิธีที่ 2: ใช้ batch file (Windows)
start-webhook.bat

# วิธีที่ 3: เริ่มด้วยมือ
node webhook-server.js
```

### 2. ตรวจสอบ Server
เปิดเบราว์เซอร์และไปที่: `http://localhost:3001/health`

คุณควรเห็น response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "AppzStory Webhook Server"
}
```

## 🔧 การตั้งค่าใน AppzStory Studio

### 1. เข้าสู่ Dashboard
- เข้าสู่ระบบ AppzStory Studio Dashboard
- ไปที่หน้า Settings > Webhooks

### 2. เพิ่ม Webhook URL
- URL: `http://your-domain.com/webhook/appzstory`
- สำหรับ development: `http://localhost:3001/webhook/appzstory`
- เลือก Events: Payment Success, Payment Failed, Payment Expired

### 3. ตั้งค่า ngrok สำหรับ Development
```bash
# ติดตั้ง ngrok
npm install -g ngrok

# เปิด tunnel
ngrok http 3001

# ใช้ URL ที่ได้จาก ngrok
https://abc123.ngrok.io/webhook/appzstory
```

## 📡 Webhook Events

### Payment Success
```json
{
  "payment_id": "pay_123456789",
  "reference_id": "TXN_20240101_001",
  "status": "success",
  "amount": 299.00,
  "currency": "THB",
  "paid_at": "2024-01-01T10:30:00Z",
  "gateway_reference": "appz_ref_123",
  "customer_info": {
    "name": "John Doe",
    "phone": "0812345678"
  }
}
```

### Payment Failed
```json
{
  "payment_id": "pay_123456789",
  "reference_id": "TXN_20240101_001",
  "status": "failed",
  "amount": 299.00,
  "currency": "THB",
  "failed_at": "2024-01-01T10:35:00Z",
  "error_code": "INSUFFICIENT_FUNDS",
  "error_message": "เงินในบัญชีไม่เพียงพอ"
}
```

### Payment Expired
```json
{
  "payment_id": "pay_123456789",
  "reference_id": "TXN_20240101_001",
  "status": "expired",
  "amount": 299.00,
  "currency": "THB",
  "expired_at": "2024-01-01T10:45:00Z"
}
```

## 🔐 Security & Signature Verification

### การตรวจสอบ Signature
Webhook ทุกครั้งจะมาพร้อมกับ signature สำหรับตรวจสอบความปลอดภัย:

```javascript
const verifySignature = (data, receivedSignature) => {
  const secretKey = process.env.APPZSTORY_SECRET_KEY;
  const sortedKeys = Object.keys(data).sort();
  const signString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  const fullString = `${signString}&secret=${secretKey}`;
  
  const expectedSignature = crypto.createHash('sha256')
    .update(fullString)
    .digest('hex');
  
  return expectedSignature === receivedSignature;
};
```

### Headers ที่ส่งมาจาก AppzStory
```
Content-Type: application/json
X-Signature: sha256_hash_of_payload
User-Agent: AppzStory-Webhook/1.0
```

## 📊 Database Updates

เมื่อได้รับ webhook จะมีการอัปเดตข้อมูลในตาราง:

### 1. qr_payments table
```sql
UPDATE qr_payments 
SET 
  status = 'success',
  paid_at = NOW(),
  gateway_response = '...'
WHERE transaction_id = 'reference_id';
```

### 2. tbl_memberships table (ถ้าเป็นการซื้อสมาชิก)
```sql
UPDATE tbl_memberships 
SET 
  status = 'active',
  payment_status = 'paid',
  paid_at = NOW()
WHERE transaction_id = 'reference_id';
```

## 🐛 Troubleshooting

### 1. Webhook ไม่ได้รับ
- ตรวจสอบว่า server ทำงานอยู่: `http://localhost:3001/health`
- ตรวจสอบ URL ใน AppzStory Dashboard
- ตรวจสอบ firewall settings

### 2. Signature Verification ล้มเหลว
- ตรวจสอบ `APPZSTORY_SECRET_KEY` ใน .env
- ตรวจสอบ format ของ signature ใน header

### 3. Database Update ล้มเหลว
- ตรวจสอบการเชื่อมต่อ Supabase
- ตรวจสอบ RLS policies
- ตรวจสอบ permission ของ service role key

## 🧪 การทดสอบ

### 1. Mock Webhook Data
```bash
curl -X POST http://localhost:3001/webhook/appzstory \
  -H "Content-Type: application/json" \
  -H "X-Signature: test_signature" \
  -d '{
    "payment_id": "pay_test_123",
    "reference_id": "TXN_TEST_001",
    "status": "success",
    "amount": 299.00,
    "paid_at": "2024-01-01T10:30:00Z"
  }'
```

### 2. Logs Monitoring
```bash
# ดู logs แบบ real-time
tail -f webhook.log

# หรือ console logs
npm run webhook
```

## 📝 Production Checklist

- [ ] ตั้งค่า HTTPS สำหรับ webhook URL
- [ ] เพิ่ม rate limiting
- [ ] ตั้งค่า monitoring และ alerting
- [ ] ทดสอบ failover scenario
- [ ] เตรียม backup plan สำหรับ webhook downtime
- [ ] ตั้งค่า log rotation
- [ ] ทดสอบ load testing

## 📞 Support

หากมีปัญหาในการใช้งาน:
1. ตรวจสอบ logs ใน console
2. ตรวจสอบ AppzStory Studio Dashboard
3. ติดต่อ AppzStory Support Team