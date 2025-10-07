# Thai QR Payment Integration Guide

## 🇹🇭 Thai QR Payment คืออะไร?

Thai QR Payment เป็นมาตรฐาน QR Code Payment ของประเทศไทยที่ใช้กันอย่างแพร่หลาย:
- **PromptPay QR Code** - รองรับทุกธนาคารในไทย
- **Thai QR Standard** - ตาม EMVCo specification
- **Real-time Payment** - เงินเข้าทันที
- **No Transaction Fees** - สำหรับผู้ใช้ทั่วไป

## 🏦 ช่องทางการรับชำระเงิน

### 1. **PromptPay (แนะนำ)**
- ใช้เบอร์โทรศัพท์หรือเลขบัตรประชาชน
- ฟรี! ไม่มีค่าธรรมเนียม
- รองรับทุกธนาคารไทย

### 2. **Thai QR API Providers**
- **2C2P Thailand**
- **Omise (โอมิเซ่)**
- **SCB Easy API**
- **KBank Open API**

## 🚀 Setup Instructions

### 1. ตั้งค่า PromptPay
1. เปิดบัญชีธนาคารที่รองรับ PromptPay
2. ลงทะเบียน PromptPay ด้วยเบอร์โทรหรือเลขบัตรประชาชน
3. รับ PromptPay ID จากธนาคาร

### 2. อัปเดต Environment Variables

แก้ไขไฟล์ `.env`:

```bash
# Thai QR / PromptPay Configuration
REACT_APP_PROMPTPAY_ID=0812345678          # เบอร์โทร PromptPay ของคุณ
REACT_APP_MERCHANT_NAME=PJ Fitness         # ชื่อร้านค้า

# Environment
REACT_APP_ENVIRONMENT=development          # เปลี่ยนเป็น production เมื่อ deploy
```

## 📱 QR Code Structure

### PromptPay QR Format (EMVCo Standard)
```
00020101                    # Payload Format Indicator
021102                      # Point of Initiation Method  
16                          # Merchant Account Information
0004                        # PromptPay Identifier
123456789012345678901234567890  # PromptPay ID
2703                        # Transaction Currency
764                         # Currency Code (764 = THB)
54042.99                    # Transaction Amount (54 + length + amount)
5802TH                      # Country Code
6304ABCD                    # CRC
```

## 🔧 Technical Implementation

### Mock Mode (Development)
```javascript
// ใน qrPaymentAPI.js
is_development: true  // จะสร้าง Mock QR Code
```

### Production Mode
```javascript
// ใช้ API จริงเมื่อพร้อม
is_development: false
```

## 💰 Features Support

### ✅ ใน Development Mode (Mock)
- ✅ QR Code Generation (Mock)
- ✅ Thai QR Format Structure
- ✅ Database Integration
- ✅ UI Display
- ✅ PromptPay QR String Generation

### 🔄 Production Mode (ต้องมี API Integration)
- 🔄 Real Thai QR API calls
- 🔄 Bank Integration
- 🔄 Payment Verification
- 🔄 Real-time Notifications

## 🎯 ข้อดีของ Thai QR

### **สำหรับผู้ใช้:**
- 📱 **สะดวก** - สแกน QR ด้วยแอพธนาคาร
- 💸 **ฟรี** - ไม่มีค่าธรรมเนียม
- ⚡ **เร็ว** - เงินเข้าทันที
- 🔒 **ปลอดภัย** - มาตรฐานธนาคาร

### **สำหรับร้านค้า:**
- 🆓 **ไม่มีค่าใช้จ่าย** Setup
- 🏦 **รองรับทุกธนาคาร**
- 📊 **ตรวจสอบได้** Real-time
- 🇹🇭 **มาตรฐานไทย**

## 🔍 Testing

### Mock QR Code
ระบบจะสร้าง QR Code จำลองที่:
- แสดงข้อมูลจำนวนเงิน
- มีรูปแบบเหมือน Thai QR จริง
- ใช้สำหรับทดสอบ UI/UX

### Production Testing
เมื่อใช้จริง ลูกค้าสามารถ:
1. สแกน QR Code ด้วยแอพธนาคาร
2. ยืนยันการชำระเงิน
3. เงินเข้าบัญชีทันที

## 🛡️ Security

1. **QR Code Expiration** - QR หมดอายุใน 15 นาที
2. **Amount Verification** - ตรวจสอบจำนวนเงิน
3. **Transaction Tracking** - ติดตามสถานะการชำระ
4. **Database Logging** - บันทึกทุกการทำงาน

## 📞 Support

### Technical Support
- ดู `src/utils/qrPaymentAPI.js` สำหรับ implementation
- ดู `src/components/QRPayment.jsx` สำหรับ UI
- ตรวจสอบ Console สำหรับ debugging

### PromptPay Support
- **ธนาคารแห่งประเทศไทย**: [https://www.bot.or.th](https://www.bot.or.th)
- **PromptPay หลักการทำงาน**: สอบถามธนาคารที่เปิดบัญชี

## 💡 Tips & Best Practices

1. **ใช้เบอร์โทรศัพท์** ที่ลงทะเบียน PromptPay แล้ว
2. **ตรวจสอบยอดเงิน** ให้ถูกต้องก่อนสร้าง QR
3. **กำหนดเวลาหมดอายุ** ที่เหมาะสม (15 นาที)
4. **เก็บ Transaction Log** สำหรับตรวจสอบ
5. **Test ใน Development** ก่อนใช้จริง