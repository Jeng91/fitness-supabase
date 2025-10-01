-- SQL สำหรับสร้างข้อมูล Admin สำหรับ PJ Fitness
-- ใช้ใน Supabase SQL Editor หลังจากสร้าง Auth User แล้ว

-- ==============================================
-- 1. ตรวจสอบและตั้งค่า RLS สำหรับ tbl_admin
-- ==============================================

-- ดูสถานะ RLS ปัจจุบัน
SELECT schemaname, tablename, rowsecurity, enablerls 
FROM pg_tables 
LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename 
LEFT JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
WHERE tablename = 'tbl_admin';

-- ปิด RLS สำหรับ tbl_admin (เพื่อให้ anon role เข้าถึงได้)
ALTER TABLE tbl_admin DISABLE ROW LEVEL SECURITY;

-- หรือ เปิด RLS และสร้าง policy ให้ anon role เข้าถึงได้
-- ALTER TABLE tbl_admin ENABLE ROW LEVEL SECURITY;

-- สร้าง policy ให้ anon role สามารถทำทุกอย่างได้ (ไม่แนะนำสำหรับ production)
-- CREATE POLICY "Allow anon access to tbl_admin" ON tbl_admin
--     FOR ALL USING (true)
--     WITH CHECK (true);

-- หรือ สร้าง policy เฉพาะสำหรับ INSERT และ SELECT
-- CREATE POLICY "Allow anon insert to tbl_admin" ON tbl_admin
--     FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Allow anon select from tbl_admin" ON tbl_admin
--     FOR SELECT USING (true);

-- ==============================================
-- 2. ตรวจสอบตาราง tbl_admin ที่มีอยู่
-- ==============================================

-- ดูโครงสร้างตารางปัจจุบัน
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tbl_admin' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ดูข้อมูลที่มีอยู่ในตาราง
SELECT * FROM tbl_admin;

-- ==============================================
-- 2. ตรวจสอบ Auth User
-- ==============================================

-- ดู auth users ที่มีอยู่
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@pjfitness.com';

-- ==============================================
-- 3. Insert ข้อมูล Admin (ตามโครงสร้างที่มีอยู่)
-- ==============================================

-- Insert admin record ลงในตารางที่มีอยู่
INSERT INTO tbl_admin (
    admin_name,
    admin_password,
    created_at
) VALUES (
    'admin@pjfitness.com',
    'PJFitness@2025!',
    NOW()
)
ON CONFLICT ON CONSTRAINT tbl_admin_pkey DO UPDATE SET
    admin_name = EXCLUDED.admin_name,
    admin_password = EXCLUDED.admin_password,
    created_at = NOW();

-- หรือถ้าไม่มี constraint ให้ใช้แบบนี้                           
-- หรือลบข้อมูลเก่าก่อน
DELETE FROM tbl_admin WHERE admin_name = 'admin@pjfitness.com';

-- แล้วค่อย insert ใหม่
INSERT INTO tbl_admin (
    admin_name,
    admin_password,
    created_at
) VALUES (
    'admin@pjfitness.com',
    'PJFitness@2025!',
    NOW()
);

-- ==============================================
-- 4. ตรวจสอบผลลัพธ์
-- ==============================================

-- ดูข้อมูล admin ที่สร้างแล้ว
SELECT 
    admin_id,
    admin_name,
    admin_password,
    created_at
FROM tbl_admin 
WHERE admin_name = 'admin@pjfitness.com';

-- ดูข้อมูล admin ทั้งหมด
SELECT * FROM tbl_admin ORDER BY created_at DESC;

-- ==============================================
-- 5. ข้อมูล Admin ที่สร้าง
-- ==============================================

/*
ข้อมูล Admin ที่ใช้ในระบบ:
📧 Email: admin@pjfitness.com
🔑 Password: PJFitness@2025!
👤 ชื่อ: System Administrator
🔐 สิทธิ์: Super Admin (ครบทุก permissions)
📱 เบอร์โทร: +66-80-000-0001

การใช้งาน:
1. กดปุ่ม "🛠️ สร้างข้อมูล Admin" ในหน้าแอป
2. รอระบบสร้าง Auth User และ Admin Record
3. เข้าสู่ระบบด้วยข้อมูลข้างต้น
*/

-- ==============================================
-- 6. คำสั่งสำรอง (ถ้าต้องการ)
-- ==============================================

-- ลบข้อมูล admin (ระวัง!)
-- DELETE FROM tbl_admin WHERE admin_name = 'admin@pjfitness.com';

-- อัปเดตรหัสผ่าน admin
-- UPDATE tbl_admin 
-- SET admin_password = 'NewPassword123!'
-- WHERE admin_name = 'admin@pjfitness.com';

-- ดูจำนวน admin ทั้งหมด
SELECT COUNT(*) as total_admins FROM tbl_admin;

-- ดูข้อมูล admin ทั้งหมด
SELECT 
    admin_id,
    admin_name,
    created_at
FROM tbl_admin 
ORDER BY created_at DESC;