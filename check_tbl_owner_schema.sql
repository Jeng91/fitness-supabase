-- Check actual column names in tbl_owner table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tbl_owner' 
  AND table_schema = 'public'
ORDER BY ordinal_position;