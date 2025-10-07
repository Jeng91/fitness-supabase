# GBPrimePay QR Payment Integration Guide

## 🏦 GBPrimePay คืออะไร?

GBPrimePay เป็นบริการ Payment Gateway ชั้นนำของไทย ที่ให้บริการ:
- **QR Code Payment** (PromptPay, Thai QR)
- **Credit/Debit Card Processing**
- **Mobile Banking Integration**
- **Real-time Payment Notifications**

## 🚀 Setup Instructions

### 1. สมัครบัญชี GBPrimePay
1. ไปที่ [https://www.gbprimepay.com](https://www.gbprimepay.com)
2. สมัครบัญชี Merchant
3. รอการอนุมัติจาก GBPrimePay (1-3 วันทำการ)

### 2. รับ API Credentials
หลังจากบัญชีได้รับการอนุมัติ คุณจะได้รับ:
- **Public Key**: สำหรับ Frontend integration
- **Secret Key**: สำหรับ Backend/Server-side operations  
- **Token**: สำหรับ API authentication
- **Merchant ID**: รหัสร้านค้าของคุณ

### 3. อัปเดต Environment Variables

แก้ไขไฟล์ `.env`:

```bash
# GBPrimePay API Credentials (แทนค่าด้วยข้อมูลจริงของคุณ)
REACT_APP_GBPRIMEPAY_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
REACT_APP_GBPRIMEPAY_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
REACT_APP_GBPRIMEPAY_TOKEN=token_xxxxxxxxxxxxxxxx
REACT_APP_GBPRIMEPAY_MERCHANT_ID=merchant_xxxxxxxx

# Environment
REACT_APP_ENVIRONMENT=development  # เปลี่ยนเป็น production เมื่อ deploy

# Webhook URL
REACT_APP_WEBHOOK_URL=http://localhost:3001/webhook/gbprimepay
```

## 🔧 API Endpoints

### Sandbox (Testing)
- **Base URL**: `https://api.globalprimepay.com/v2`
- **QR Code**: `POST /qrcode`
- **Payment Status**: `GET /check_status/{referenceNo}`

### Production
- **Base URL**: `https://api.gbprimepay.com/v3`
- **QR Code**: `POST /qrcode`
- **Payment Status**: `GET /check_status/{referenceNo}`

## 📱 QR Code API

### Request
```json
{
  "amount": 299.00,
  "currency": "THB",
  "referenceNo": "TXN_1759819925623_451741",
  "backgroundUrl": "http://localhost:3001/webhook/gbprimepay",
  "detail": "Payment for JM FITNESS - รายเดือน"
}
```

### Response
```json
{
  "success": true,
  "referenceNo": "TXN_1759819925623_451741",
  "gbpReferenceNo": "GB1759819925623",
  "qrCode": "00020101021102160004123456789012345678901234567890",
  "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "amount": 299.00,
  "currency": "THB",
  "expires_at": "2025-10-07T15:06:43.408Z"
}
```

## 🎯 Features ที่ Support

### ✅ ใน Development Mode (Mock)
- ✅ QR Code Generation
- ✅ Payment Status Checking  
- ✅ Database Integration
- ✅ UI Display

### 🔄 Production Mode (จำเป็นต้องมี API Keys จริง)
- 🔄 Real GBPrimePay API calls
- 🔄 Webhook notifications
- 🔄 Payment verification
- 🔄 Transaction tracking

## 🧪 Testing

### Mock Mode (Development)
```javascript
// ใน qrPaymentAPI.js
is_development: true  // จะใช้ Mock response
```

### Live Mode (Production)
```javascript
// ใน qrPaymentAPI.js
is_development: false  // จะเรียก GBPrimePay API จริง
```

## 📞 Support

### GBPrimePay Support
- **Website**: [https://www.gbprimepay.com](https://www.gbprimepay.com)
- **Email**: support@gbprimepay.com
- **Phone**: 02-xxx-xxxx
- **Documentation**: [https://docs.gbprimepay.com](https://docs.gbprimepay.com)

### Code Support
- ดู `src/utils/qrPaymentAPI.js` สำหรับ implementation
- ดู `src/components/QRPayment.jsx` สำหรับ UI component
- ตรวจสอบ Console สำหรับ debugging

## 🚨 Security Notes

1. **ห้ามใส่ Secret Key ใน Frontend**
2. **ใช้ HTTPS ใน Production**
3. **Validate Webhook signatures**
4. **เก็บ API credentials ใน environment variables**
5. **ใช้ Sandbox สำหรับ testing**

## 💰 Pricing

GBPrimePay มีค่าธรรมเนียม:
- **QR Payment**: ~1.5-2.0% ต่อธุรกรรม
- **Credit Card**: ~2.5-3.0% ต่อธุรกรรม
- **Setup Fee**: อาจมีค่าใช้จ่ายในการติดตั้งเริ่มต้น

ตรวจสอบอัตราล่าสุดกับ GBPrimePay ก่อนใช้งานจริง