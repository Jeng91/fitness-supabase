-- แก้ไข RLS สำหรับตาราง tbl_admin เร่งด่วน
-- รันใน Supabase SQL Editor เพื่อแก้ไข 401 error

-- ==============================================
-- วิธีที่ 1: ปิด RLS ชั่วคราว (ง่ายที่สุด)
-- ==============================================

-- ปิด Row Level Security สำหรับ tbl_admin
ALTER TABLE tbl_admin DISABLE ROW LEVEL SECURITY;

-- ตรวจสอบสถานะ
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tbl_admin';

-- ==============================================
-- วิธีที่ 2: เปิด RLS และสร้าง Policy (แนะนำ)
-- ==============================================

-- เปิด RLS
-- ALTER TABLE tbl_admin ENABLE ROW LEVEL SECURITY;

-- ลบ policy เก่าถ้ามี
-- DROP POLICY IF EXISTS "Allow anon access" ON tbl_admin;

-- สร้าง policy ใหม่ให้ anon role เข้าถึงได้
-- CREATE POLICY "Allow anon access" ON tbl_admin
--     FOR ALL 
--     TO anon
--     USING (true)
--     WITH CHECK (true);

-- ==============================================
-- ทดสอบการเข้าถึง
-- ==============================================

-- ทดสอบ SELECT
SELECT * FROM tbl_admin LIMIT 1;

-- ทดสอบ INSERT
INSERT INTO tbl_admin (admin_name, admin_password, created_at) 
VALUES ('test@admin.com', 'test123', NOW())
ON CONFLICT DO NOTHING;

-- ลบข้อมูลทดสอบ
DELETE FROM tbl_admin WHERE admin_name = 'test@admin.com';

-- ==============================================
-- ข้อมูล Admin หลัก
-- ==============================================

-- ลบข้อมูลเก่า
DELETE FROM tbl_admin WHERE admin_name = 'admin@pjfitness.com';

-- Insert ข้อมูล admin ใหม่
INSERT INTO tbl_admin (
    admin_name,
    admin_password,
    created_at
) VALUES (
    'admin@pjfitness.com',
    'PJFitness@2025!',
    NOW()
);

-- ตรวจสอบผลลัพธ์
SELECT * FROM tbl_admin WHERE admin_name = 'admin@pjfitness.com';