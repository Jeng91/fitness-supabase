-- ตรวจสอบชื่อ column ที่ถูกต้องใน tbl_owner เพื่อแก้ error 400
-- Quick test to determine correct column name

\echo "=== Testing tbl_owner table structure ==="

-- Test if owner_id exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_owner' AND column_name = 'owner_id') THEN
        RAISE NOTICE 'Column owner_id EXISTS in tbl_owner';
    ELSE
        RAISE NOTICE 'Column owner_id DOES NOT EXIST in tbl_owner';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_owner' AND column_name = 'owner_uid') THEN
        RAISE NOTICE 'Column owner_uid EXISTS in tbl_owner';
    ELSE
        RAISE NOTICE 'Column owner_uid DOES NOT EXIST in tbl_owner';
    END IF;
END $$;

-- Show actual column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tbl_owner' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test basic select to see if table is accessible
SELECT COUNT(*) as total_rows FROM tbl_owner;

-- Show first few rows to see actual data structure
SELECT * FROM tbl_owner LIMIT 3;