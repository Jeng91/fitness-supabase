-- Fix RLS policies to allow public read access to fitness data
-- This will allow all users to view fitness listings

-- ===================================================================
-- Allow public read access to tbl_fitness for fitness listings
-- ===================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Users can view own fitness data" ON tbl_fitness;

-- Create new policy to allow all authenticated users to view fitness data
CREATE POLICY "Public can view fitness data"
ON tbl_fitness
FOR SELECT
TO authenticated
USING (true);

-- Keep other policies for owners to manage their own data
-- Policy: Users can insert fitness data for themselves
DROP POLICY IF EXISTS "Users can insert own fitness data" ON tbl_fitness;
CREATE POLICY "Users can insert own fitness data" 
ON tbl_fitness 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid() OR fit_user = auth.uid()::text);

-- Policy: Users can update their own fitness data
DROP POLICY IF EXISTS "Users can update own fitness data" ON tbl_fitness;
CREATE POLICY "Users can update own fitness data" 
ON tbl_fitness 
FOR UPDATE 
TO authenticated
USING (created_by = auth.uid() OR fit_user = auth.uid()::text)
WITH CHECK (created_by = auth.uid() OR fit_user = auth.uid()::text);

-- Policy: Users can delete their own fitness data
DROP POLICY IF EXISTS "Users can delete own fitness data" ON tbl_fitness;
CREATE POLICY "Users can delete own fitness data" 
ON tbl_fitness 
FOR DELETE 
TO authenticated
USING (created_by = auth.uid() OR fit_user = auth.uid()::text);

-- ===================================================================
-- Allow public read access to tbl_owner for partner information
-- ===================================================================

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Users can view own owner data" ON tbl_owner;

-- Create new policy to allow all authenticated users to view owner data
CREATE POLICY "Public can view owner data"
ON tbl_owner
FOR SELECT
TO authenticated
USING (true);

-- Keep insert/update policies for owners to manage their own data
DROP POLICY IF EXISTS "Users can insert own owner data" ON tbl_owner;
CREATE POLICY "Users can insert own owner data"
ON tbl_owner
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Policy: Users can update their own owner data
DROP POLICY IF EXISTS "Users can update own owner data" ON tbl_owner;
CREATE POLICY "Users can update own owner data"
ON tbl_owner
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());