-- ตรวจสอบข้อมูลจริงใน database
-- Check actual data in database

-- ดูข้อมูล fitness ทั้งหมด
SELECT 'All fitness data:' as debug;
SELECT fit_id, fit_name, fit_user, created_by, created_at
FROM tbl_fitness
ORDER BY created_at DESC;

-- ดูข้อมูล owner ทั้งหมด
SELECT 'All owner data:' as debug;
SELECT owner_uid, owner_name, owner_email, auth_user_id, created_at
FROM tbl_owner
ORDER BY created_at DESC;

-- เช็คว่า user jeng มี fitness หรือไม่
SELECT 'Jeng fitness data:' as debug;
SELECT f.*, o.owner_name, o.auth_user_id
FROM tbl_fitness f
LEFT JOIN tbl_owner o ON f.fit_user = o.owner_name
WHERE o.owner_name = 'jeng' OR o.auth_user_id = 'f8712319-8405-4342-b735-1a7dc7c48b4c';

-- เช็คว่ามีข้อมูลที่ created_by = user id หรือไม่
SELECT 'Created by user:' as debug;
SELECT * FROM tbl_fitness 
WHERE created_by = 'f8712319-8405-4342-b735-1a7dc7c48b4c';

-- Count ทั้งหมด
SELECT 'Total counts:' as debug;
SELECT 
  (SELECT COUNT(*) FROM tbl_fitness) as total_fitness,
  (SELECT COUNT(*) FROM tbl_owner) as total_owners;