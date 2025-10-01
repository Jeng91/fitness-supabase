-- Fix RLS policies for partner functionality
-- Based on actual database structure and error analysis

-- ===================================================================
-- 1. Drop existing problematic policies
-- ===================================================================

-- Drop all existing policies for tbl_fitness
DROP POLICY IF EXISTS "Users can view own fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Users can insert own fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Users can update own fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Users can delete own fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Anonymous can view fitness data" ON tbl_fitness;
DROP POLICY IF EXISTS "Public can view fitness data" ON tbl_fitness;

-- Drop all existing policies for tbl_owner
DROP POLICY IF EXISTS "Users can view own owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Users can insert own owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Users can update own owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Users can delete own owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Anonymous can view owner data" ON tbl_owner;
DROP POLICY IF EXISTS "Public can view owner data" ON tbl_owner;

-- ===================================================================
-- 2. Create new policies for tbl_fitness
-- ===================================================================

-- Allow anonymous users to view all fitness data (like booking.com)
CREATE POLICY "Anonymous can view fitness data"
ON tbl_fitness
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert fitness data with their auth.uid() as fit_user
CREATE POLICY "Users can insert fitness data"
ON tbl_fitness
FOR INSERT
TO authenticated
WITH CHECK (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid()
);

-- Allow users to update their own fitness data (check both fit_user and created_by)
-- Handle both owner_id and owner_uid cases
CREATE POLICY "Users can update own fitness data"
ON tbl_fitness
FOR UPDATE
TO authenticated
USING (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid() OR
  fit_user IN (
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_owner' AND column_name = 'owner_id')
        THEN owner_id::text
        ELSE owner_uid::text
      END
    FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid() OR
  fit_user IN (
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_owner' AND column_name = 'owner_id')
        THEN owner_id::text
        ELSE owner_uid::text
      END
    FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
);

-- Allow users to delete their own fitness data
CREATE POLICY "Users can delete own fitness data"
ON tbl_fitness
FOR DELETE
TO authenticated
USING (
  fit_user = auth.uid()::text OR 
  created_by = auth.uid() OR
  fit_user IN (
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tbl_owner' AND column_name = 'owner_id')
        THEN owner_id::text
        ELSE owner_uid::text
      END
    FROM tbl_owner 
    WHERE auth_user_id = auth.uid()
  )
);

-- ===================================================================
-- 3. Create new policies for tbl_owner
-- ===================================================================

-- Allow anonymous users to view owner data (for showing owner names)
CREATE POLICY "Anonymous can view owner data"
ON tbl_owner
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated users to insert their own owner record
CREATE POLICY "Users can insert own owner data"
ON tbl_owner
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Allow users to update their own owner data
CREATE POLICY "Users can update own owner data"
ON tbl_owner
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Allow users to delete their own owner data
CREATE POLICY "Users can delete own owner data"
ON tbl_owner
FOR DELETE
TO authenticated
USING (auth_user_id = auth.uid());

-- ===================================================================
-- 4. Create policies for tbl_equipment (if exists)
-- ===================================================================

-- Drop existing equipment policies
DROP POLICY IF EXISTS "Users can view own equipment data" ON tbl_equipment;
DROP POLICY IF EXISTS "Users can insert own equipment data" ON tbl_equipment;
DROP POLICY IF EXISTS "Users can update own equipment data" ON tbl_equipment;
DROP POLICY IF EXISTS "Users can delete own equipment data" ON tbl_equipment;

-- Allow users to view equipment for their fitness centers
CREATE POLICY "Users can view equipment data"
ON tbl_equipment
FOR SELECT
TO anon, authenticated
USING (
  fitness_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE fit_user = auth.uid()::text OR 
          created_by = auth.uid() OR
          fit_user IN (
            SELECT owner_id::text 
            FROM tbl_owner 
            WHERE auth_user_id = auth.uid()
          )
  ) OR
  true -- Allow anonymous to view for public browsing
);

-- Allow authenticated users to insert equipment for their fitness centers
CREATE POLICY "Users can insert equipment data"
ON tbl_equipment
FOR INSERT
TO authenticated
WITH CHECK (
  fitness_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE fit_user = auth.uid()::text OR 
          created_by = auth.uid() OR
          fit_user IN (
            SELECT owner_id::text 
            FROM tbl_owner 
            WHERE auth_user_id = auth.uid()
          )
  )
);

-- Allow users to update equipment for their fitness centers
CREATE POLICY "Users can update equipment data"
ON tbl_equipment
FOR UPDATE
TO authenticated
USING (
  fitness_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE fit_user = auth.uid()::text OR 
          created_by = auth.uid() OR
          fit_user IN (
            SELECT owner_id::text 
            FROM tbl_owner 
            WHERE auth_user_id = auth.uid()
          )
  )
)
WITH CHECK (
  fitness_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE fit_user = auth.uid()::text OR 
          created_by = auth.uid() OR
          fit_user IN (
            SELECT owner_id::text 
            FROM tbl_owner 
            WHERE auth_user_id = auth.uid()
          )
  )
);

-- Allow users to delete equipment for their fitness centers
CREATE POLICY "Users can delete equipment data"
ON tbl_equipment
FOR DELETE
TO authenticated
USING (
  fitness_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE fit_user = auth.uid()::text OR 
          created_by = auth.uid() OR
          fit_user IN (
            SELECT owner_id::text 
            FROM tbl_owner 
            WHERE auth_user_id = auth.uid()
          )
  )
);

-- ===================================================================
-- 5. Test queries
-- ===================================================================

-- Test current user
-- SELECT auth.uid() as current_user_id;

-- Test owner lookup
-- SELECT * FROM tbl_owner WHERE auth_user_id = auth.uid();

-- Test fitness data access
-- SELECT * FROM tbl_fitness WHERE fit_user = auth.uid()::text OR created_by = auth.uid();