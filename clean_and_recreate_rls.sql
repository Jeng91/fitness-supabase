-- ลบ RLS policies เก่าที่มี error และสร้างใหม่ให้ถูกต้อง
-- Clean up and recreate RLS policies

\echo "=== Dropping existing policies with errors ==="

-- Drop all existing policies on tbl_fitness
DROP POLICY IF EXISTS "Anonymous can view fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Users can delete own fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Users can insert fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Users can update own fitness data" ON tbl_fitness;

-- Drop all existing policies on tbl_owner
DROP POLICY IF EXISTS "Anonymous can view owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Users can delete own owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Users can insert own owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Users can update own owner data" ON tbl_owner;

\echo "=== Creating new correct RLS policies ==="

-- Enable RLS on tables
ALTER TABLE tbl_fitness ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_owner ENABLE ROW LEVEL SECURITY;

-- ===== tbl_fitness policies =====

-- Allow anonymous users to view all fitness data (like booking.com)
CREATE POLICY "fitness_anonymous_select"
ON tbl_fitness
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert fitness data
CREATE POLICY "fitness_authenticated_insert"
ON tbl_fitness
FOR INSERT
TO authenticated
WITH CHECK (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid()
);

-- Allow users to update their own fitness data
CREATE POLICY "fitness_authenticated_update"
ON tbl_fitness
FOR UPDATE
TO authenticated
USING (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid()
)
WITH CHECK (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid()
);

-- Allow users to delete their own fitness data
CREATE POLICY "fitness_authenticated_delete"
ON tbl_fitness
FOR DELETE
TO authenticated
USING (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid()
);

-- ===== tbl_owner policies =====

-- Allow anonymous users to view owner data (for fitness center info)
CREATE POLICY "owner_anonymous_select"
ON tbl_owner
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert owner data
CREATE POLICY "owner_authenticated_insert"
ON tbl_owner
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Allow users to update their own owner data
CREATE POLICY "owner_authenticated_update"
ON tbl_owner
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Allow users to delete their own owner data
CREATE POLICY "owner_authenticated_delete"
ON tbl_owner
FOR DELETE
TO authenticated
USING (auth_user_id = auth.uid());

\echo "=== RLS policies created successfully ==="

-- Show new policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('tbl_fitness', 'tbl_owner')
ORDER BY tablename, policyname;