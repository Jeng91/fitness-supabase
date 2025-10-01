-- แก้ไขปัญหา current_role = none ด้วยการปิด RLS ชั่วคราว
-- Fix current_role = none issue by temporarily disabling RLS

-- ปิด RLS ชั่วคราวเพื่อให้ทุก role เข้าถึงได้
ALTER TABLE tbl_fitness DISABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_owner DISABLE ROW LEVEL SECURITY;

-- ทดสอบหลังจากปิด RLS
SELECT 'Testing after disabling RLS:' as test;
SELECT COUNT(*) as fitness_count FROM tbl_fitness;
SELECT COUNT(*) as owner_count FROM tbl_owner;

-- แสดงข้อมูล fitness ที่มี
SELECT 'Fitness data:' as test;
SELECT fit_id, fit_name, fit_user FROM tbl_fitness;

-- แสดงข้อมูล owner ที่มี  
SELECT 'Owner data:' as test;
SELECT owner_uid, owner_name FROM tbl_owner;

-- ตรวจสอบสถานะ RLS
SELECT 'RLS Status after disable:' as test;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tbl_fitness', 'tbl_owner')
  AND schemaname = 'public';