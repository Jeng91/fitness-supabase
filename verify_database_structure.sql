-- ตรวจสอบ database schema ครอบคลุมทุกตาราง
-- Run this first to verify actual column names before applying RLS policies

\echo "=== Checking database schema and table structure ==="

-- Check if tables exist
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tbl_fitness', 'tbl_owner', 'tbl_equipment', 'tbl_activities')
GROUP BY table_name
ORDER BY table_name;

-- Check all columns in tbl_owner
\echo "\n=== tbl_owner columns ==="
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tbl_owner' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check all columns in tbl_fitness
\echo "\n=== tbl_fitness columns ==="
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tbl_fitness' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current RLS policies
\echo "\n=== Current RLS policies ==="
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('tbl_fitness', 'tbl_owner')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
\echo "\n=== RLS status ==="
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('tbl_fitness', 'tbl_owner')
ORDER BY tablename;

-- Check sample data to verify column content
\echo "\n=== Sample data from tbl_owner (first 3 rows) ==="
SELECT *
FROM tbl_owner
LIMIT 3;

\echo "\n=== Sample data from tbl_fitness (first 3 rows) ==="
SELECT *
FROM tbl_fitness
LIMIT 3;