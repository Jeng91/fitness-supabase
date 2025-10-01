-- ทดสอบข้อมูลและ debug การเชื่อมต่อ
-- Debug data access and mapping

-- 1. ตรวจสอบข้อมูล tbl_fitness ทั้งหมด
SELECT 'All fitness data:' as debug_section;
SELECT 
    fit_id,
    fit_name, 
    fit_user,
    created_by,
    fit_address,
    fit_phone,
    created_at
FROM tbl_fitness 
ORDER BY created_at DESC;

-- 2. ตรวจสอบข้อมูล tbl_owner ทั้งหมด  
SELECT 'All owner data:' as debug_section;
SELECT 
    owner_uid,
    owner_name,
    owner_email,
    auth_user_id,
    created_at
FROM tbl_owner
ORDER BY created_at DESC;

-- 3. ทดสอบการ Join ข้อมูล
SELECT 'Fitness with owner info:' as debug_section;
SELECT 
    f.fit_id,
    f.fit_name,
    f.fit_user,
    f.created_by,
    o.owner_uid,
    o.owner_name,
    o.auth_user_id,
    CASE 
        WHEN f.fit_user = o.owner_name THEN 'Matched by name'
        WHEN f.fit_user::text = o.owner_uid::text THEN 'Matched by uid'  
        WHEN f.created_by = o.auth_user_id THEN 'Matched by auth_user_id'
        ELSE 'No match found'
    END as match_status
FROM tbl_fitness f
LEFT JOIN tbl_owner o ON (
    f.fit_user = o.owner_name OR
    f.fit_user::text = o.owner_uid::text OR  
    f.created_by = o.auth_user_id
);

-- 4. ตรวจสอบ Anonymous access
SELECT 'Testing anonymous access:' as debug_section;
SET ROLE anon;
SELECT COUNT(*) as anon_fitness_count FROM tbl_fitness;
SELECT COUNT(*) as anon_owner_count FROM tbl_owner;
SET ROLE postgres;