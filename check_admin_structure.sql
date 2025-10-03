-- ทดสอบการสร้าง RLS Policies ที่ถูกต้อง
-- ใช้โครงสร้างฐานข้อมูลที่มีอยู่จริง

-- ตรวจสอบโครงสร้างตาราง admin และ owner
SELECT 'tbl_admin columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tbl_admin' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'tbl_owner columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tbl_owner' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'profiles columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ตรวจสอบข้อมูลตัวอย่าง
SELECT 'Sample tbl_admin data:' as info;
SELECT * FROM tbl_admin LIMIT 3;

SELECT 'Sample tbl_owner data:' as info;
SELECT owner_uid, owner_name, auth_user_id FROM tbl_owner LIMIT 3;

SELECT 'Sample profiles data:' as info;
SELECT user_id, username, useremail FROM profiles LIMIT 3;