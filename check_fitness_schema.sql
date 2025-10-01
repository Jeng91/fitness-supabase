-- Check tbl_fitness table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tbl_fitness' 
  AND table_schema = 'public'
ORDER BY ordinal_position;