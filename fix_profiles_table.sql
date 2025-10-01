-- ตรวจสอบและแก้ไขโครงสร้างตาราง profiles
-- รันใน Supabase SQL Editor

-- ==============================================
-- 1. ตรวจสอบโครงสร้างตาราง profiles ปัจจุบัน
-- ==============================================

-- ดูโครงสร้างตาราง
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ดูข้อมูลที่มีอยู่
SELECT * FROM profiles LIMIT 5;

-- ==============================================
-- 2. ตรวจสอบ RLS สำหรับ profiles
-- ==============================================

-- ดูสถานะ RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- ปิด RLS ชั่วคราวเพื่อให้การสมัครสมาชิกทำงานได้
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- 3. ตรวจสอบ Foreign Key กับ auth.users
-- ==============================================

-- ตรวจสอบ constraints
SELECT constraint_name, constraint_type, table_name, column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'profiles';

-- ==============================================
-- 4. แก้ไขข้อมูลทดสอบ (ถ้าต้องการ)
-- ==============================================

-- ลบข้อมูลทดสอบเก่า
-- DELETE FROM profiles WHERE useremail LIKE '%test%';

-- ทดสอบ INSERT ข้อมูลใหม่
-- INSERT INTO profiles (
--     user_uid,
--     username, 
--     useremail,
--     full_name,
--     created_at,
--     updated_at
-- ) VALUES (
--     gen_random_uuid(),
--     'testuser',
--     'test@example.com',
--     'Test User',
--     NOW(),
--     NOW()
-- );

-- ==============================================
-- 5. สร้าง Policy ใหม่สำหรับ RLS (แนะนำ)
-- ==============================================

-- เปิด RLS กลับ
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- สร้าง policy ให้ authenticated users สร้างข้อมูลตัวเองได้
-- CREATE POLICY "Users can insert own profile" ON profiles
--     FOR INSERT 
--     TO authenticated 
--     WITH CHECK (auth.uid() = user_uid);

-- สร้าง policy ให้ users อ่านข้อมูลตัวเองได้
-- CREATE POLICY "Users can view own profile" ON profiles
--     FOR SELECT 
--     TO authenticated 
--     USING (auth.uid() = user_uid);

-- สร้าง policy ให้ users อัปเดตข้อมูลตัวเองได้
-- CREATE POLICY "Users can update own profile" ON profiles
--     FOR UPDATE 
--     TO authenticated 
--     USING (auth.uid() = user_uid);

-- ==============================================
-- 6. ทดสอบการทำงาน
-- ==============================================

-- ทดสอบ SELECT
SELECT COUNT(*) as total_profiles FROM profiles;

-- ดูข้อมูลล่าสุด
SELECT 
    username,
    useremail,
    full_name,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;