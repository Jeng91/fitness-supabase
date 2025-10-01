# 📝 ระบบสมัครสมาชิก PJ Fitness

## 🎯 คุณสมบัติของระบบ

### **2 ประเภทผู้ใช้งาน**

#### 1. 👤 **ผู้ใช้ทั่วไป (User)**
- เก็บข้อมูลในตาราง `profiles`
- ข้อมูลที่เก็บ:
  - `username` - ชื่อผู้ใช้ (จากอีเมล)
  - `useremail` - อีเมล
  - `full_name` - ชื่อ-นามสกุล
  - `userage` - อายุ (null ในการสมัคร)
  - `usertel` - เบอร์โทร (null ในการสมัคร)
  - `profile_image` - รูปโปรไฟล์ (null ในการสมัคร)
  - `auth_user_id` - ID จาก Supabase Auth

#### 2. 🤝 **พาร์ทเนอร์ (Partner)**
- เก็บข้อมูลในตาราง `tbl_owner`
- ข้อมูลที่เก็บ:
  - `owner_name` - ชื่อ-นามสกุล
  - `owner_email` - อีเมล
  - `owner_password` - null (ใช้ Supabase Auth)
  - `auth_user_id` - ID จาก Supabase Auth

#### 3. 👑 **แอดมิน (Admin)**
- **ไม่สามารถสมัครผ่านหน้า Register ได้**
- ต้องเข้าถึงผ่าน `/admin` route เท่านั้น
- เก็บข้อมูลในตาราง `tbl_admin`
- สร้างโดยระบบ หรือผ่านการจัดการแยกต่างหาก

## 🔧 การทำงานของระบบ

### **ขั้นตอนการสมัครสมาชิก**

1. **ตรวจสอบข้อมูล** - ตรวจสอบรหัสผ่านตรงกัน
2. **สร้างบัญชี Auth** - ใช้ Supabase Authentication
3. **เก็บข้อมูลเพิ่มเติม** - เก็บลงในตารางที่เหมาะสมตาม role
4. **ส่งอีเมลยืนยัน** - Supabase จะส่งอีเมลยืนยันอัตโนมัติ
5. **รีไดเร็กต์** - เปลี่ยนไปหน้าเข้าสู่ระบบ

### **ระบบความปลอดภัย**

- ✅ **Password Hashing** - Supabase จัดการอัตโนมัติ
- ✅ **Email Verification** - ยืนยันอีเมลก่อนใช้งาน
- ✅ **Role-based Access** - แยกสิทธิ์ตาม role
- ✅ **Input Validation** - ตรวจสอบข้อมูลก่อนส่ง
- ✅ **SQL Injection Protection** - ใช้ Supabase Client

## 🚀 การใช้งาน

### **ฟอร์มสมัครสมาชิก**
```
📝 ชื่อ-นามสกุล     [Required]
📧 อีเมล           [Required, Email Format]
🔒 รหัสผ่าน        [Required, Min 6 chars]
🔒 ยืนยันรหัสผ่าน   [Required, Must Match]
👥 ประเภทผู้ใช้     [Dropdown: User/Partner เท่านั้น]
```

### **หมายเหตุสำคัญ**
- 🚫 **แอดมินไม่สามารถสมัครผ่านหน้านี้ได้**
- 🔐 **แอดมินต้องเข้าผ่าน `/admin` route เท่านั้น**
- ✅ **ผู้ใช้ทั่วไปและพาร์ทเนอร์สมัครได้ปกติ**

### **การตรวจสอบข้อผิดพลาด**
- รหัสผ่านไม่ตรงกัน
- อีเมลซ้ำในระบบ
- ข้อมูลไม่ครบถ้วน
- รหัสผ่านสั้นเกินไป
- ประเภทผู้ใช้ไม่ถูกต้อง (เฉพาะ user/partner)

## 📱 UI/UX Features

### **การแสดงผล**
- 🎨 **Modern Gradient Design**
- 📱 **Responsive Layout**
- ⚡ **Loading States**
- 💬 **Success/Error Messages**
- 🎯 **Role Selection with Icons (User/Partner เท่านั้น)**

### **การนำทาง**
- Navbar มีเมนู "สมัครสมาชิก"
- ลิงก์เชื่อมโยงระหว่างหน้า Login/Register
- Auto-redirect หลังสมัครสำเร็จ

## 🔍 การแก้ไขปัญหา

### **ปัญหาที่อาจเจอ**
1. **"Email already registered"** - อีเมลถูกใช้แล้ว
2. **"Password too weak"** - รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร
3. **"Network error"** - ตรวจสอบการเชื่อมต่อ Supabase
4. **"Invalid role"** - role ต้องเป็น user/partner เท่านั้น (ไม่มี admin)

### **การตรวจสอบ Database**
```sql
-- ตรวจสอบผู้ใช้ทั่วไป
SELECT * FROM profiles WHERE auth_user_id = 'user-uuid';

-- ตรวจสอบพาร์ทเนอร์
SELECT * FROM tbl_owner WHERE auth_user_id = 'user-uuid';

-- หมายเหตุ: แอดมินไม่สามารถสมัครผ่านหน้านี้ได้
```

## 🎉 คุณสมบัติที่เพิ่มแล้ว

- ✅ หน้าสมัครสมาชิกครบถ้วน
- ✅ ระบบ 2 roles (User/Partner) แยกตารางเก็บข้อมูล
- ✅ การตรวจสอบข้อมูล (Validation)
- ✅ ความปลอดภัยด้วย Supabase Auth
- ✅ UI/UX ที่สวยงามและใช้งานง่าย
- ✅ Responsive Design
- ✅ Loading states และ Error handling
- ✅ การนำทางที่สะดวก
- 🚫 **แอดมินถูกเอาออกจากการสมัครสมาชิกแล้ว** (ต้องเข้าผ่าน /admin)