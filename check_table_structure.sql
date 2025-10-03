-- ตรวจสอบโครงสร้างตารางที่มีอยู่จริง
-- ตรวจสอบตาราง bookings ที่เราจะใช้
SELECT 'bookings table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ตรวจสอบข้อมูลตัวอย่าง
SELECT 'Sample bookings data:' as info;
SELECT * FROM bookings LIMIT 2;

-- ตรวจสอบ profiles table structure
SELECT 'profiles table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ตรวจสอบ tbl_owner table structure  
SELECT 'tbl_owner table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tbl_owner' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ตรวจสอบ tbl_admin table structure
SELECT 'tbl_admin table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tbl_admin' 
  AND table_schema = 'public'
ORDER BY ordinal_position;