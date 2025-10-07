# 🏋️‍♂️ Fitness Management System with QR Payment

ระบบจัดการศูนย์ออกกำลังกายที่รองรับการชำระเงินผ่าน QR Code โดยใช้ AppzStory Studio API

## 🚀 Features

### 💳 ระบบการชำระเงิน
- **QR Payment Integration**: เชื่อมต่อกับ AppzStory Studio API
- **Real-time Payment Status**: ตรวจสอบสถานะการชำระเงินแบบ real-time
- **Webhook Support**: รับการแจ้งเตือนจาก payment gateway
- **Security**: มีระบบตรวจสอบ signature สำหรับความปลอดภัย

### 🎯 ระบบสมาชิก
- **Membership Plans**: รายวัน, รายเดือน, รายปี
- **Date Selection**: เลือกวันเริ่มต้นสมาชิก
- **Auto Calculate**: คำนวณวันสิ้นสุดอัตโนมัติ
- **Status Tracking**: ติดตามสถานะสมาชิกแบบ real-time

### 🏃‍♀️ ระบบจัดการกิจกรรม
- **Class Management**: จัดการคลาสออกกำลังกาย
- **Equipment Booking**: จองอุปกรণ์ออกกำลังกาย
- **Activity Tracking**: ติดตามกิจกรรมของสมาชิก

### 👥 ระบบจัดการ Admin
- **Member Management**: จัดการข้อมูลสมาชิก
- **Payment Reports**: รายงานการชำระเงิน
- **Analytics Dashboard**: แดชบอร์ดสถิติ

## 🛠️ เทคโนโลยีที่ใช้

- **Frontend**: React.js, CSS3, React Router
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Payment Gateway**: AppzStory Studio API
- **Webhook Server**: Express.js, Node.js
- **Styling**: Custom CSS with Glass Morphism Design

## 📦 การติดตั้ง

### 1. Clone Repository
```bash
git clone <repository-url>
cd fitness-supabase
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` จาก `.env.example`:
```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```bash
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AppzStory Studio API
REACT_APP_APPZSTORY_API_KEY=your_api_key_here
REACT_APP_APPZSTORY_SECRET_KEY=your_secret_key_here
REACT_APP_APPZSTORY_MERCHANT_ID=your_merchant_id_here

# Webhook Server
APPZSTORY_SECRET_KEY=your_secret_key_here
PORT=3001
```

### 4. ตั้งค่า Database
รันคำสั่ง SQL ต่อไปนี้ใน Supabase:
```sql
-- สร้างตาราง qr_payments
\i create_qr_payments_table.sql

-- สร้างตาราง memberships
\i create_memberships_table.sql

-- เพิ่มคอลัมน์ราคาสมาชิก
\i add_membership_columns.sql
```

## 🚀 การใช้งาน

### 1. เริ่ม React App
```bash
npm start
# หรือ
npm run dev
```

### 2. เริ่ม Webhook Server
```bash
# Terminal แยก
npm run webhook

# หรือใช้ batch file (Windows)
start-webhook.bat
```

### 3. เปิดเบราว์เซอร์
- Frontend: `http://localhost:3000`
- Webhook Health Check: `http://localhost:3001/health`

## 🔄 Workflow การชำระเงิน

### 1. User เลือกแพ็คเกจ
```
HomePage → FitnessDetailPage → FitnessDetailModal
```

### 2. เลือกวิธีการชำระเงิน
```
PaymentPage → เลือก QR Payment → QRPayment Component
```

### 3. สร้าง QR Code
```javascript
// qrPaymentAPI.js
const qrData = await generatePaymentQR({
  amount: 299,
  description: "Fitness Membership",
  transaction_id: "TXN_123"
});
```

### 4. ตรวจสอบสถานะ
```javascript
// Auto-check ทุก 3 วินาที
const status = await checkQRPaymentStatus(transaction_id);
```

### 5. Webhook Notification
```javascript
// webhook-server.js
app.post('/webhook/appzstory', async (req, res) => {
  const { payment_id, status, reference_id } = req.body;
  // อัปเดตฐานข้อมูล
});
```

## 📊 Database Schema

### qr_payments
```sql
CREATE TABLE qr_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  qr_code_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  gateway_response JSONB
);
```

### tbl_memberships
```sql
CREATE TABLE tbl_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  fitness_id UUID REFERENCES tbl_fitness(id),
  membership_type TEXT, -- 'daily', 'monthly', 'yearly'
  start_date DATE,
  end_date DATE,
  amount DECIMAL(10,2),
  transaction_id TEXT,
  status TEXT DEFAULT 'pending'
);
```

## 🔐 Security Features

### 1. Signature Verification
```javascript
const verifySignature = (data, signature) => {
  const secretKey = process.env.APPZSTORY_SECRET_KEY;
  const expectedSignature = crypto
    .createHash('sha256')
    .update(data + secretKey)
    .digest('hex');
  return expectedSignature === signature;
};
```

### 2. RLS Policies
```sql
-- User สามารถดูเฉพาะข้อมูลของตัวเอง
CREATE POLICY "Users can view own payments" 
ON qr_payments FOR SELECT 
USING (auth.uid() = user_id);
```

## 🧪 การทดสอบ

### 1. Unit Tests
```bash
npm test
```

### 2. Mock Webhook
```bash
curl -X POST http://localhost:3001/webhook/appzstory \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "test", "status": "success"}'
```

### 3. QR Payment Flow
1. เลือกแพ็คเกจในหน้า Fitness Detail
2. คลิก "จองบริการ" 
3. เลือก "QR Payment"
4. สแกน QR Code ด้วยแอปธนาคาร
5. ตรวจสอบการอัปเดตสถานะ

## 📱 UI/UX Features

### Glass Morphism Design
```css
.glass-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
}
```

### Responsive Design
- ✅ Mobile First
- ✅ Tablet Optimized  
- ✅ Desktop Responsive

### Real-time Updates
- ✅ Payment Status
- ✅ Countdown Timer
- ✅ Auto Refresh

## 🚨 Troubleshooting

### QR Code ไม่แสดง
1. ตรวจสอบ API Key ใน `.env`
2. ตรวจสอบ network connection
3. ดู console errors

### Webhook ไม่ทำงาน
1. ตรวจสอบ webhook server: `http://localhost:3001/health`
2. ตรวจสอบ AppzStory Dashboard
3. ตรวจสอบ signature verification

### Database Error
1. ตรวจสอบ Supabase connection
2. ตรวจสอบ RLS policies
3. ตรวจสอบ table permissions

## 📚 เอกสารเพิ่มเติม

- [Webhook Setup Guide](WEBHOOK_GUIDE.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Admin System Guide](ADMIN_SYSTEM.md)
- [RLS Setup Guide](RLS_SETUP_GUIDE.md)

## 🎯 Roadmap

- [ ] Push Notifications
- [ ] Multi-language Support
- [ ] Advanced Analytics
- [ ] Mobile App Integration
- [ ] Loyalty Points System
- [ ] Social Features

## 👥 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

หากมีคำถามหรือต้องการความช่วยเหลือ:
- Email: support@example.com
- Line: @fitness-support
- Phone: 02-xxx-xxxx