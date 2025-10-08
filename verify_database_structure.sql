-- ตรวจสอบ database schema ครอบคลุมทุกตาราง
-- Run this first to verify actual column names before applying RLS policies

SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tbl_fitness', 'tbl_owner', 'tbl_equipment', 'tbl_activities')
GROUP BY table_name
ORDER BY table_name;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tbl_owner' 
  AND table_schema = 'public'
ORDER BY ordinal_position;


SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tbl_fitness' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

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


SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('tbl_fitness', 'tbl_owner')
ORDER BY tablename;


SELECT *
FROM tbl_owner
LIMIT 3;

SELECT *
FROM tbl_fitness
LIMIT 3;