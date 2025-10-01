-- Test RLS Policies for Fitness Management System
-- Updated based on ac-- Test DELETE: Try to delete own fitness data (should work)
-- DELETE FROM tbl_fitness 
-- WHERE fit_name = 'Test Fitness' 
--   AND owner_uid IN (
--     SELECT owner_uid 
--     FROM tbl_owner 
--     WHERE owner_email = (
--       SELECT email FROM auth.users WHERE id = auth.uid()
--     )
--   );bl_owner schema

-- ===================================================================
-- 1. Test Basic Authentication
-- ===================================================================

-- Check current authenticated user
SELECT auth.uid() as current_user_id;

-- Check if user exists in tbl_owner using owner_email
SELECT * FROM tbl_owner WHERE owner_email = (
  SELECT email FROM auth.users WHERE id = auth.uid()
);

-- ===================================================================
-- 2. Test Owner Table Policies
-- ===================================================================

-- Test SELECT: Should only see own data
SELECT owner_uid, owner_email, owner_name
FROM tbl_owner 
WHERE owner_email = (
  SELECT email FROM auth.users WHERE id = auth.uid()
);

-- Test INSERT: Try to insert owner data (should work for own email)
-- INSERT INTO tbl_owner (owner_name, owner_email) 
-- VALUES ('Test User', (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Test UPDATE: Try to update own data (should work)
-- UPDATE tbl_owner 
-- SET owner_name = 'Updated Name' 
-- WHERE owner_email = (
--   SELECT email FROM auth.users WHERE id = auth.uid()
-- );

-- ===================================================================
-- 3. Test Fitness Table Policies
-- ===================================================================

-- Test SELECT: Should only see fitness data owned by current user
SELECT fit_id, fit_name, created_by 
FROM tbl_fitness 
WHERE created_by = auth.uid();

-- Test INSERT: Try to insert fitness data (should work)
-- INSERT INTO tbl_fitness (created_by, fit_name, fit_user, fit_price) 
-- VALUES (
--   auth.uid(), 
--   'Test Fitness', 
--   'Test Description', 
--   '1000'
-- );

-- Test UPDATE: Try to update own fitness data (should work)
-- UPDATE tbl_fitness 
-- SET fit_name = 'Updated Fitness Name' 
-- WHERE created_by = auth.uid();

-- Test DELETE: Try to delete own fitness data (should work)
-- DELETE FROM tbl_fitness 
-- WHERE fit_name = 'Test Fitness' 
--   AND owner_uid IN (
--     SELECT owner_uid 
--     FROM tbl_owner 
--     WHERE owner_email = (
--       SELECT email FROM auth.users WHERE id = auth.uid()
--     )
--   );

-- ===================================================================
-- 4. Test Cross-User Access (Should Fail)
-- ===================================================================

-- These queries should return no results or fail due to RLS
-- SELECT * FROM tbl_owner WHERE owner_email != (
--   SELECT email FROM auth.users WHERE id = auth.uid()
-- );
-- SELECT * FROM tbl_fitness WHERE created_by != auth.uid();

-- ===================================================================
-- 5. Check Policy Status
-- ===================================================================

-- Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('tbl_owner', 'tbl_fitness', 'tbl_equipment', 'tbl_activity', 'tbl_booking')
  AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('tbl_owner', 'tbl_fitness', 'tbl_equipment', 'tbl_activity', 'tbl_booking')
  AND schemaname = 'public';

-- ===================================================================
-- 6. Test Equipment Access (if tbl_equipment exists)
-- ===================================================================

-- Should only see equipment for fitness centers owned by current user
-- SELECT e.*, f.fit_name, f.owner_uid
-- FROM tbl_equipment e
-- JOIN tbl_fitness f ON e.fit_id = f.fit_id
-- WHERE f.owner_uid IN (
--   SELECT owner_uid 
--   FROM tbl_owner 
--   WHERE owner_email = (
--     SELECT email FROM auth.users WHERE id = auth.uid()
--   )
-- );

-- ===================================================================
-- 7. Test Booking Access (if tbl_booking exists)
-- ===================================================================

-- Should only see bookings for fitness centers owned by current user
-- SELECT b.*, f.fit_name, f.owner_uid
-- FROM tbl_booking b
-- JOIN tbl_fitness f ON b.fit_id = f.fit_id
-- WHERE f.owner_uid IN (
--   SELECT owner_uid 
--   FROM tbl_owner 
--   WHERE owner_email = (
--     SELECT email FROM auth.users WHERE id = auth.uid()
--   )
-- );

-- ===================================================================
-- 8. Clean Up Test Data
-- ===================================================================

-- Remove any test data created during testing
-- DELETE FROM tbl_fitness 
-- WHERE fit_name LIKE 'Test%' 
--   AND created_by = auth.uid();

-- ===================================================================
-- Expected Results:
-- ===================================================================

-- ✅ Users should be able to:
-- 1. View only their own owner data (linked by auth_user_id)
-- 2. Create/update/delete their own fitness centers
-- 3. Create/update/delete equipment for their fitness centers
-- 4. View and manage bookings for their fitness centers
-- 5. Create/update/delete activities for their fitness centers

-- ❌ Users should NOT be able to:
-- 1. View other users' data
-- 2. Modify other users' fitness centers
-- 3. Access equipment from other fitness centers
-- 4. View bookings from other fitness centers

-- ===================================================================
-- Troubleshooting:
-- ===================================================================

-- If policies are not working:
-- 1. Check if auth.uid() returns correct user ID
-- 2. Verify RLS is enabled on tables
-- 3. Check policy definitions are correct
-- 4. Ensure user is properly authenticated
-- 5. Make sure owner_email matches the email in auth.users