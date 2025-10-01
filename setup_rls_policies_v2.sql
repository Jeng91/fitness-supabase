-- RLS Policies ใหม่ - เจ้าของ CRUD ได้ / คนอื่นดูได้อย่างเดียว
-- New RLS Policies - Owner can CRUD / Others can only view

-- ลบ policies เก่าทั้งหมด
DROP POLICY IF EXISTS "fitness_anonymous_select" ON tbl_fitness;
DROP POLICY IF EXISTS "fitness_authenticated_insert" ON tbl_fitness;
DROP POLICY IF EXISTS "fitness_authenticated_update" ON tbl_fitness;
DROP POLICY IF EXISTS "fitness_authenticated_delete" ON tbl_fitness;
DROP POLICY IF EXISTS "owner_anonymous_select" ON tbl_owner;
DROP POLICY IF EXISTS "owner_authenticated_insert" ON tbl_owner;
DROP POLICY IF EXISTS "owner_authenticated_update" ON tbl_owner;
DROP POLICY IF EXISTS "owner_authenticated_delete" ON tbl_owner;

-- เปิด RLS
ALTER TABLE tbl_fitness ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_owner ENABLE ROW LEVEL SECURITY;

-- ===== tbl_fitness policies =====

-- 1. ทุกคนดูได้ทุก role (public = anon + authenticated + postgres)
CREATE POLICY "fitness_public_read"
ON tbl_fitness
FOR SELECT
TO public
USING (true);

-- 2. เฉพาะเจ้าของ insert ได้
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

-- 3. เฉพาะเจ้าของ update ได้
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

-- 4. เฉพาะเจ้าของ delete ได้
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

-- ===== tbl_owner policies =====

-- 1. ทุกคนดูข้อมูล owner ได้
CREATE POLICY "owner_public_read"
ON tbl_owner
FOR SELECT
TO public
USING (true);

-- 2. Insert ข้อมูลตัวเองได้
CREATE POLICY "owner_self_insert"
ON tbl_owner
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- 3. Update ข้อมูลตัวเองได้
CREATE POLICY "owner_self_update"
ON tbl_owner
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- 4. Delete ข้อมูลตัวเองได้
CREATE POLICY "owner_self_delete"
ON tbl_owner
FOR DELETE
TO authenticated
USING (auth_user_id = auth.uid());

-- ทดสอบและแสดงผล
SELECT 'RLS Policies Updated!' as status;
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('tbl_fitness', 'tbl_owner')
ORDER BY tablename, cmd;