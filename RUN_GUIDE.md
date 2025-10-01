# 🚀 วิธีการรันแอป PJ Fitness

## คำสั่งรันพื้นฐาน

### 1. รันด้วย npm (port เริ่มต้น 3000)
```bash
npm start
```

### 2. รันด้วย port ที่กำหนด
```bash
# PowerShell
$env:PORT=3001; npm start

# CMD
set PORT=3001 && npm start
```

## 📋 คำสั่งรันที่เตรียมไว้แล้ว

### NPM Scripts
```bash
npm run start        # รันที่ port เริ่มต้น (3000)
npm run start:3001   # รันที่ port 3001
npm run start:3002   # รันที่ port 3002
npm run start:3003   # รันที่ port 3003
npm run dev          # รันที่ port 3001 (สำหรับ development)
```

### PowerShell Script
```powershell
# รันที่ port เริ่มต้น (3001)
.\start-app.ps1

# รันที่ port ที่กำหนด
.\start-app.ps1 -Port 3002
```

### Batch Script (CMD)
```cmd
# รันที่ port เริ่มต้น (3001)
start-app.bat

# รันที่ port ที่กำหนด
start-app.bat 3002
```

## 🌐 URL การเข้าถึง

เมื่อรันแล้ว คุณสามารถเข้าถึงแอปได้ที่:
- **Local**: http://localhost:[PORT]
- **Network**: http://192.168.x.x:[PORT]

## ⚙️ การตั้งค่า Environment Variables

ไฟล์ `.env` มีการตั้งค่าดังนี้:
```
PORT=3001
REACT_APP_SUPABASE_URL=https://your-supabase-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
GENERATE_SOURCEMAP=false
BROWSER=none
```

## 🔧 การแก้ไขปัญหา Port ซ้ำ

หากเจอข้อความ "Something is already running on port 3000":
1. ใช้คำสั่งที่กำหนด port เฉพาะ
2. หรือตอบ `Y` เมื่อถูกถามให้ใช้ port อื่น
3. ใช้ `npm run start:3001` แทน `npm start`

## 📱 คุณสมบัติของแอป

- ✅ Navbar พร้อมเมนู "หน้าหลัก" และ "เข้าสู่ระบบ"
- ✅ หน้าหลักแสดงข้อมูล PJ Fitness
- ✅ หน้าเข้าสู่ระบบพร้อมฟอร์ม
- ✅ Responsive Design
- ✅ Modern UI/UX