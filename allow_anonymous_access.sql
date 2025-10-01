-- Allow anonymous (public) access to view fitness data
-- Similar to booking.com where users can browse without logging in

-- ===================================================================
-- Allow anonymous read access to tbl_fitness
-- ===================================================================

-- Drop existing policy and create new one for anonymous access
DROP POLICY IF EXISTS "Public can view fitness data" ON tbl_fitness;

-- Create policy to allow anonymous users to view fitness data
CREATE POLICY "Anonymous can view fitness data"
ON tbl_fitness
FOR SELECT
TO anon, authenticated
USING (true);

-- ===================================================================
-- Allow anonymous read access to tbl_owner
-- ===================================================================

-- Drop existing policy and create new one for anonymous access
DROP POLICY IF EXISTS "Public can view owner data" ON tbl_owner;

-- Create policy to allow anonymous users to view owner data
CREATE POLICY "Anonymous can view owner data"
ON tbl_owner
FOR SELECT
TO anon, authenticated
USING (true);

-- Keep existing insert/update/delete policies for authenticated users only
-- (these policies should already exist from previous setup)