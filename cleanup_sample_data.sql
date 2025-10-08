-- สคริปต์สำหรับลบข้อมูลตัวอย่าง
-- ใช้เมื่อต้องการล้างข้อมูล Demo ออกจากระบบ

BEGIN;

-- แสดงข้อมูลที่จะถูกลบก่อน
SELECT 'ข้อมูลที่จะถูกลบ:' as message;

SELECT 
  'Owners' as table_name,
  COUNT(*) as record_count
FROM tbl_owner
WHERE owner_email LIKE '%demo%'

UNION ALL

SELECT 
  'Fitness Centers' as table_name,
  COUNT(*) as record_count
FROM tbl_fitness
WHERE owner_uid IN (SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%')

UNION ALL

SELECT 
  'Equipment' as table_name,
  COUNT(*) as record_count
FROM tbl_equipment
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE owner_uid IN (
    SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
  )
)

UNION ALL

SELECT 
  'Activities' as table_name,
  COUNT(*) as record_count
FROM tbl_activities
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE owner_uid IN (
    SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
  )
)

UNION ALL

SELECT 
  'Pricing Plans' as table_name,
  COUNT(*) as record_count
FROM tbl_pricing
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE owner_uid IN (
    SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
  )
);

-- ลบข้อมูลตามลำดับ Foreign Key Dependencies
-- 1. ลบ Pricing ก่อน
DELETE FROM tbl_pricing
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE owner_uid IN (
    SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
  )
);

-- 2. ลบ Activities
DELETE FROM tbl_activities
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE owner_uid IN (
    SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
  )
);

-- 3. ลบ Equipment
DELETE FROM tbl_equipment
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE owner_uid IN (
    SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
  )
);

-- 4. ลบ Fitness Centers
DELETE FROM tbl_fitness
WHERE owner_uid IN (
  SELECT owner_uid FROM tbl_owner WHERE owner_email LIKE '%demo%'
);

-- 5. ลบ Owners
DELETE FROM tbl_owner
WHERE owner_email LIKE '%demo%';

COMMIT;

SELECT 'ลบข้อมูลตัวอย่างเสร็จสิ้น!' as status;