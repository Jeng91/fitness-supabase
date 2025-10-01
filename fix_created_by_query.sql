-- แก้ไข RLS policies เพื่อรองรับ created_by query
-- Fix RLS policies to support created_by queries

-- ลบ policies เก่า
DROP POLICY IF EXISTS "fitness_public_read" ON tbl_fitness;
DROP POLICY IF EXISTS "fitness_owner_insert" ON tbl_fitness;
DROP POLICY IF EXISTS "fitness_owner_update" ON tbl_fitness;
DROP POLICY IF EXISTS "fitness_owner_delete" ON tbl_fitness;

-- สร้าง policies ใหม่ที่รองรับทั้ง fit_user และ created_by
CREATE POLICY "fitness_public_read"
ON tbl_fitness
FOR SELECT
TO public
USING (true);

CREATE POLICY "fitness_owner_insert"
ON tbl_fitness
FOR INSERT
TO authenticated
WITH CHECK (
  fit_user IN (
    SELECT owner_name FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

CREATE POLICY "fitness_owner_update"
ON tbl_fitness
FOR UPDATE
TO authenticated
USING (
  fit_user IN (
    SELECT owner_name FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
  OR created_by = auth.uid()
)
WITH CHECK (
  fit_user IN (
    SELECT owner_name FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

CREATE POLICY "fitness_owner_delete"
ON tbl_fitness
FOR DELETE
TO authenticated
USING (
  fit_user IN (
    SELECT owner_name FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

-- ทดสอบ query ที่มีปัญหา
SELECT 'Testing created_by query:' as test;
SELECT fit_id, fit_name, created_by 
FROM tbl_fitness 
WHERE created_by = 'f8712319-8405-4342-b735-1a7dc7c48b4c';

-- ทดสอบ query fit_user
SELECT 'Testing fit_user query:' as test;
SELECT fit_id, fit_name, fit_user 
FROM tbl_fitness 
WHERE fit_user = 'jeng';

-- แสดง policies ปัจจุบัน
SELECT 'Current policies:' as status;
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'tbl_fitness'
ORDER BY cmd, policyname;