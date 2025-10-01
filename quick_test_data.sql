-- Quick test data access for debugging
-- Run this to check if data can be accessed

-- Test raw data access
SELECT 'Testing tbl_fitness access...' as test;
SELECT COUNT(*) as total_fitness FROM tbl_fitness;

SELECT 'Testing tbl_owner access...' as test;  
SELECT COUNT(*) as total_owners FROM tbl_owner;

-- Show first few records
SELECT 'First 3 fitness records:' as test;
SELECT fit_id, fit_name, fit_address, fit_user 
FROM tbl_fitness 
LIMIT 3;

SELECT 'First 3 owner records:' as test;
SELECT owner_uid, owner_name, owner_email, auth_user_id 
FROM tbl_owner 
LIMIT 3;

-- Check RLS status
SELECT 'RLS Status:' as test;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tbl_fitness', 'tbl_owner')
  AND schemaname = 'public';