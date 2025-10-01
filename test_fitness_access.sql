-- ทดสอบการเข้าถึงข้อมูล tbl_fitness แบบตรงๆ
-- Test direct access to tbl_fitness

-- Test 1: Count all records
SELECT 'Total fitness records:' as test;
SELECT COUNT(*) FROM tbl_fitness;

-- Test 2: Show all fitness data
SELECT 'All fitness data:' as test;
SELECT fit_id, fit_name, fit_user, created_by, created_at 
FROM tbl_fitness 
ORDER BY created_at DESC;

-- Test 3: Test specific query like the app uses
SELECT 'Query for fit_user = jeng:' as test;
SELECT * FROM tbl_fitness WHERE fit_user = 'jeng';

-- Test 4: Test with owner data
SELECT 'Join fitness with owner:' as test;
SELECT 
    f.fit_id,
    f.fit_name,
    f.fit_user,
    o.owner_name,
    o.owner_uid
FROM tbl_fitness f
LEFT JOIN tbl_owner o ON f.fit_user = o.owner_name
WHERE f.fit_user = 'jeng';

-- Test 5: Check RLS policies for current user
SELECT 'Current user and role:' as test;
SELECT current_user, current_setting('role') as current_role;