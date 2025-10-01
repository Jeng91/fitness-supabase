-- Check Database Schema before creating RLS Policies
-- Run this first to understand your table structure

-- ===================================================================
-- 1. Check if tables exist
-- ===================================================================

-- List all tables in public schema
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'tbl_%'
ORDER BY table_name;

-- ===================================================================
-- 2. Check tbl_owner structure
-- ===================================================================

-- Check if tbl_owner table exists and its columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tbl_owner'
ORDER BY ordinal_position;

-- ===================================================================
-- 3. Check tbl_fitness structure
-- ===================================================================

-- Check if tbl_fitness table exists and its columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tbl_fitness'
ORDER BY ordinal_position;

-- ===================================================================
-- 4. Check other fitness-related tables
-- ===================================================================

-- Check tbl_equipment (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tbl_equipment'
ORDER BY ordinal_position;

-- Check tbl_activity (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tbl_activity'
ORDER BY ordinal_position;

-- Check tbl_booking (if exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'tbl_booking'
ORDER BY ordinal_position;

-- ===================================================================
-- 5. Check for user/owner relationship columns
-- ===================================================================

-- Look for any column that might be used for user identification
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name LIKE 'tbl_%'
  AND (
    column_name ILIKE '%user%' OR 
    column_name ILIKE '%owner%' OR 
    column_name ILIKE '%uid%' OR 
    column_name ILIKE '%id%'
  )
ORDER BY table_name, column_name;

-- ===================================================================
-- 6. Check current RLS status
-- ===================================================================

-- Check if RLS is already enabled on any tables
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'tbl_%'
ORDER BY tablename;

-- ===================================================================
-- 7. Check existing policies
-- ===================================================================

-- Check if there are any existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename LIKE 'tbl_%'
ORDER BY tablename, policyname;

-- ===================================================================
-- 8. Check auth function availability
-- ===================================================================

-- Check if auth.uid() function exists and works
SELECT auth.uid() as current_user_id;

-- Check current user info (if available)
SELECT 
    id,
    email,
    created_at,
    updated_at
FROM auth.users 
WHERE id = auth.uid();

-- ===================================================================
-- 9. Sample data check (if tables exist)
-- ===================================================================

-- Check sample data in tbl_owner (limit 5 rows)
-- SELECT * FROM tbl_owner LIMIT 5;

-- Check sample data in tbl_fitness (limit 5 rows)  
-- SELECT * FROM tbl_fitness LIMIT 5;

-- ===================================================================
-- Instructions:
-- ===================================================================
-- 1. Run this script first to understand your database structure
-- 2. Look at the column names and data types
-- 3. Identify which columns are used for user/owner relationships
-- 4. Use the results to create proper RLS policies
-- 5. Update the setup_rls_policies.sql file based on actual column names
-- ===================================================================