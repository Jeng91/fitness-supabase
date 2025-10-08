# 📊 ข้อมูลตัวอย่างสำหรับระบบ Partner Dashboard

## 🎯 ภาพรวม
ไฟล์นี้มีข้อมูลตัวอย่างสำหรับการทดสอบระบบ Partner Dashboard ครอบคลุม:
- เจ้าของฟิตเนส (Partners) 3 ราย
- ฟิตเนสเซ็นเตอร์ 3 แห่ง  
- อุปกรณ์ออกกำลังกาย 10 ชิ้น
- กิจกรรม/คลาส 6 คลาส
- แพ็คเกจราคา 7 แพ็คเกจ

## 📋 รายละเอียดข้อมูล

### 👥 เจ้าของฟิตเนส (tbl_owner)
1. **สมชาย ฟิตเนส** - somchai.fitness@demo.com
2. **สมหญิง เฮลท์ตี้** - somying.healthy@demo.com  
3. **ปิยะ สปอร์ต** - piya.sport@demo.com

### 🏢 ฟิตเนสเซ็นเตอร์ (tbl_fitness)
1. **PJ Fitness Center สาขาสีลม**
   - ที่อยู่: 123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ
   - เวลาเปิด-ปิด: 06:00-22:00
   - เจ้าของ: สมชาย ฟิตเนส

2. **Healthy Life Gym อารีย์**
   - ที่อยู่: 456 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ
   - เวลาเปิด-ปิด: 05:30-23:00
   - เจ้าของ: สมหญิง เฮลท์ตี้

3. **Champion Sport Club**
   - ที่อยู่: 789 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ
   - เวลาเปิด-ปิด: 06:00-24:00
   - เจ้าของ: ปิยะ สปอร์ต

### 🏋️ อุปกรณ์ออกกำลังกาย (tbl_equipment)
**PJ Fitness Center สาขาสีลม:**
- ลู่วิ่งไฟฟ้า TechnoGym Run Race 1400
- เครื่องจักรยานนั่งปั่น Life Fitness IC7
- เครื่องดันทรวงอก Hammer Strength
- ชุดดัมเบล York Fitness (5-50 กก.)

**Healthy Life Gym อารีย์:**
- เครื่องเอลลิปติคัล Precor EFX 885
- เครื่องพัลเลย์ปรับระดับ Matrix
- ชุด Kettlebell Dragon Door

**Champion Sport Club:**
- Smith Machine Body Solid Series 7
- Cable Crossover Machine HUR
- ลู่วิ่งในสระน้ำ HydroWorx

### 🎯 กิจกรรม/คลาส (tbl_activities)
**PJ Fitness Center สาขาสีลม:**
- Yoga Flow สำหรับผู้เริ่มต้น (จ/พ/ศ 18:00) - 250 บาท
- HIIT Workout (อ/พฤ 19:00) - 300 บาท

**Healthy Life Gym อารีย์:**
- Pilates Core Strengthening (จ/พ/ศ 17:30) - 280 บาท
- Functional Training (อ/พฤ/ส 07:00) - 320 บาท

**Champion Sport Club:**
- Aqua Aerobics (จ/พ/ศ 09:00) - 200 บาท
- CrossFit WOD (จ-ศ 18:30) - 400 บาท

### 💰 แพ็คเกจราคา (tbl_pricing)
**PJ Fitness Center สาขาสีลม:**
- รายวัน: 150 บาท
- รายเดือน: 1,500 บาท
- รายปี VIP: 15,000 บาท

**Healthy Life Gym อารีย์:**
- ทดลอง 3 วัน: 300 บาท
- รายเดือน Premium: 1,800 บาท

**Champion Sport Club:**
- All Access รายเดือน: 2,500 บาท
- Elite Membership รายปี: 25,000 บาท

## 🚀 วิธีการใช้งาน

### 1. เพิ่มข้อมูลตัวอย่าง
```bash
# เข้าสู่ Supabase SQL Editor หรือ psql
psql -h [your-host] -d [your-database] -U [your-user]

# รันสคริปต์เพิ่มข้อมูล
\i sample_data_insert.sql
```

### 2. ตรวจสอบข้อมูล
```sql
-- ดูข้อมูลเจ้าของฟิตเนส
SELECT * FROM tbl_owner WHERE owner_email LIKE '%demo%';

-- ดูข้อมูลฟิตเนส
SELECT f.*, o.owner_name 
FROM tbl_fitness f 
JOIN tbl_owner o ON f.owner_uid = o.owner_uid 
WHERE o.owner_email LIKE '%demo%';

-- ดูข้อมูลอุปกรณ์
SELECT e.*, f.fit_name 
FROM tbl_equipment e 
JOIN tbl_fitness f ON e.fitness_id = f.fit_id 
JOIN tbl_owner o ON f.owner_uid = o.owner_uid 
WHERE o.owner_email LIKE '%demo%';
```

### 3. ลบข้อมูลตัวอย่าง (เมื่อต้องการ)
```bash
# รันสคริปต์ลบข้อมูล
\i cleanup_sample_data.sql
```

## 🔧 การใช้งานใน Application

### เข้าสู่ระบบ Partner Dashboard
1. สร้างบัญชี Auth ใน Supabase สำหรับ demo users
2. เชื่อมโยง `auth_user_id` ใน `tbl_owner` กับ user ID จาก Supabase Auth
3. Login เข้าระบบด้วย email: `somchai.fitness@demo.com`

### ตัวอย่างการเชื่อมโยง Auth
```sql
-- อัปเดต auth_user_id ใน tbl_owner
UPDATE tbl_owner 
SET auth_user_id = '[supabase-auth-user-id]'
WHERE owner_email = 'somchai.fitness@demo.com';
```

## 📊 สถิติข้อมูลที่สร้าง
- **เจ้าของฟิตเนส**: 3 ราย
- **ฟิตเนสเซ็นเตอร์**: 3 แห่ง
- **อุปกรณ์**: 10 ชิ้น
- **กิจกรรม**: 6 คลาส
- **แพ็คเกจราคา**: 7 แพ็คเกจ

## ⚠️ หมายเหตุ
- ข้อมูลนี้เป็นข้อมูลตัวอย่างเท่านั้น
- ใช้ email ที่มี `@demo.com` เพื่อง่ายต่อการจัดการ
- ข้อมูลสามารถลบได้ง่ายโดยใช้ `cleanup_sample_data.sql`
- ก่อนใช้งานจริง ควรลบข้อมูลตัวอย่างออกก่อน

## 🔗 ไฟล์ที่เกี่ยวข้อง
- `sample_data_insert.sql` - สคริปต์เพิ่มข้อมูล
- `cleanup_sample_data.sql` - สคริปต์ลบข้อมูล
- `verify_database_structure.sql` - ตรวจสอบโครงสร้างฐานข้อมูล