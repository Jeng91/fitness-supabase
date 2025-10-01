-- Setup Row Level Security (RLS) Policies for Fitness Management System
-- Updated version - Please check your actual database schema first
-- Run check_database_schema.sql to identify correct column names

-- ===================================================================
-- IMPORTANT: Update column names based on your actual schema
-- ===================================================================
-- Common variations found in fitness databases:
-- owner_uid, owner_id, user_id, created_by, owner_email
-- fit_owner_id, fitness_owner_id, etc.

-- ===================================================================
-- 1. Enable RLS on all relevant tables
-- ===================================================================

-- Enable RLS on owner table
ALTER TABLE tbl_owner ENABLE ROW LEVEL SECURITY;

-- Enable RLS on fitness table  
ALTER TABLE tbl_fitness ENABLE ROW LEVEL SECURITY;

-- Enable RLS on equipment table (uncomment if exists)
-- ALTER TABLE tbl_equipment ENABLE ROW LEVEL SECURITY;

-- Enable RLS on activity table (uncomment if exists)
-- ALTER TABLE tbl_activity ENABLE ROW LEVEL SECURITY;

-- Enable RLS on booking table (uncomment if exists)
-- ALTER TABLE tbl_booking ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 2. Policies for tbl_owner table
-- ===================================================================

-- OPTION A: If your owner table uses 'id' column as primary key
-- and links to auth.users through email or another field

-- View own owner data by email match
CREATE POLICY "Users can view own owner data by email" 
ON tbl_owner 
FOR SELECT 
USING (
  owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Insert own owner data by email match
CREATE POLICY "Users can insert own owner data by email" 
ON tbl_owner 
FOR INSERT 
WITH CHECK (
  owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Update own owner data by email match
CREATE POLICY "Users can update own owner data by email" 
ON tbl_owner 
FOR UPDATE 
USING (
  owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Delete own owner data by email match
CREATE POLICY "Users can delete own owner data by email" 
ON tbl_owner 
FOR DELETE 
USING (
  owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- ===================================================================
-- ALTERNATIVE OPTION B: If you have a direct user_id column
-- ===================================================================

-- Uncomment these if your tbl_owner has user_id, owner_id, or similar
/*
-- Replace 'user_id' with your actual column name (could be owner_id, created_by, etc.)
CREATE POLICY "Users can view own owner data by user_id" 
ON tbl_owner 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own owner data by user_id" 
ON tbl_owner 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own owner data by user_id" 
ON tbl_owner 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own owner data by user_id" 
ON tbl_owner 
FOR DELETE 
USING (user_id = auth.uid());
*/

-- ===================================================================
-- 3. Policies for tbl_fitness table
-- ===================================================================

-- OPTION A: If tbl_fitness links to tbl_owner via owner_email or owner_id

-- View fitness data owned by current user (via email)
CREATE POLICY "Users can view own fitness data" 
ON tbl_fitness 
FOR SELECT 
USING (
  owner_email IN (
    SELECT owner_email 
    FROM tbl_owner 
    WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Insert fitness data for current user (via email)
CREATE POLICY "Users can insert own fitness data" 
ON tbl_fitness 
FOR INSERT 
WITH CHECK (
  owner_email IN (
    SELECT owner_email 
    FROM tbl_owner 
    WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Update fitness data for current user (via email)
CREATE POLICY "Users can update own fitness data" 
ON tbl_fitness 
FOR UPDATE 
USING (
  owner_email IN (
    SELECT owner_email 
    FROM tbl_owner 
    WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  owner_email IN (
    SELECT owner_email 
    FROM tbl_owner 
    WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Delete fitness data for current user (via email)
CREATE POLICY "Users can delete own fitness data" 
ON tbl_fitness 
FOR DELETE 
USING (
  owner_email IN (
    SELECT owner_email 
    FROM tbl_owner 
    WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- ===================================================================
-- ALTERNATIVE OPTION C: If tbl_fitness has direct user_id reference
-- ===================================================================

/*
-- If tbl_fitness has user_id, owner_id, created_by, etc.
CREATE POLICY "Users can view own fitness data direct" 
ON tbl_fitness 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own fitness data direct" 
ON tbl_fitness 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own fitness data direct" 
ON tbl_fitness 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own fitness data direct" 
ON tbl_fitness 
FOR DELETE 
USING (user_id = auth.uid());
*/

-- ===================================================================
-- 4. Policies for equipment table (if exists)
-- ===================================================================

/*
-- Uncomment and adjust based on your tbl_equipment structure
CREATE POLICY "Users can view own equipment data" 
ON tbl_equipment 
FOR SELECT 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_email IN (
      SELECT owner_email 
      FROM tbl_owner 
      WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

-- Add similar INSERT, UPDATE, DELETE policies for equipment
*/

-- ===================================================================
-- 5. Policies for booking table (if exists)
-- ===================================================================

/*
-- Uncomment and adjust based on your tbl_booking structure
CREATE POLICY "Owners can view bookings for their fitness centers" 
ON tbl_booking 
FOR SELECT 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_email IN (
      SELECT owner_email 
      FROM tbl_owner 
      WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Owners can update bookings for their fitness centers" 
ON tbl_booking 
FOR UPDATE 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_email IN (
      SELECT owner_email 
      FROM tbl_owner 
      WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);
*/

-- ===================================================================
-- 6. Test queries (adjust column names as needed)
-- ===================================================================

-- Test current user
-- SELECT auth.uid() as current_user_id;

-- Test owner data access
-- SELECT * FROM tbl_owner WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid());

-- Test fitness data access
-- SELECT * FROM tbl_fitness WHERE owner_email IN (
--   SELECT owner_email FROM tbl_owner 
--   WHERE owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
-- );

-- ===================================================================
-- INSTRUCTIONS FOR CUSTOMIZATION:
-- ===================================================================
-- 1. First run check_database_schema.sql to see your actual table structure
-- 2. Find the column names that link users to their data:
--    - In tbl_owner: might be user_id, owner_id, id, owner_email, etc.
--    - In tbl_fitness: might be owner_id, user_id, owner_email, created_by, etc.
-- 3. Replace the column names in this file with your actual column names
-- 4. Uncomment the sections that match your database structure
-- 5. Test the policies with the test queries at the bottom
-- 6. Adjust as needed based on your specific requirements

-- Common column name patterns to look for:
-- - user_id (links to auth.uid())
-- - owner_id (links to auth.uid() or tbl_owner.id)  
-- - owner_email (links to auth.users.email)
-- - created_by (links to auth.uid())
-- - fit_owner_id (links to owner table)
-- ===================================================================