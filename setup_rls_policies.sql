-- S-- Table Structure Reference:
-- tbl_owner: owner_uid (int4), owner_name, owner_email, owner_password, 
--           created_at, updated_at
-- tbl_fitness: created_by (uuid) references auth.users.id directlyp Row Level Security (RLS) Policies for Fitness Management System
-- Based on actual database schema from tbl_owner table

-- ===================================================================
-- Table Structure Reference:
-- tbl_owner: owner_id (int4), owner_name, owner_email, owner_password, 
--           created_at, updated_at
-- ===================================================================

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
-- 2. Create policies for tbl_owner table
-- ===================================================================

-- Policy: Users can view their own owner record using email
CREATE POLICY "Users can view own owner data"
ON tbl_owner
FOR SELECT
USING (
  auth_user_id = auth.uid()
);

-- Policy: Users can insert their own owner record
CREATE POLICY "Users can insert own owner data"
ON tbl_owner
FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Policy: Users can update their own owner record
CREATE POLICY "Users can update own owner data" 
ON tbl_owner 
FOR UPDATE 
USING (
  owner_email = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  owner_email = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- Policy: Users can delete their own owner record
CREATE POLICY "Users can delete own owner data" 
ON tbl_owner 
FOR DELETE 
USING (
  owner_email = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- ===================================================================
-- 3. Create policies for tbl_fitness table
-- ===================================================================

-- Policy: Users can view fitness data they own
CREATE POLICY "Users can view own fitness data" 
ON tbl_fitness 
FOR SELECT 
USING (created_by = auth.uid());

-- Policy: Users can insert fitness data for themselves
CREATE POLICY "Users can insert own fitness data" 
ON tbl_fitness 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own fitness data
CREATE POLICY "Users can update own fitness data" 
ON tbl_fitness 
FOR UPDATE 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own fitness data
CREATE POLICY "Users can delete own fitness data" 
ON tbl_fitness 
FOR DELETE 
USING (created_by = auth.uid());

-- ===================================================================
-- 4. Create policies for tbl_equipment table (if exists)
-- ===================================================================

-- Uncomment these if you have tbl_equipment table
/*
CREATE POLICY "Users can view own equipment data" 
ON tbl_equipment 
FOR SELECT 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert own equipment data" 
ON tbl_equipment 
FOR INSERT 
WITH CHECK (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update own equipment data" 
ON tbl_equipment 
FOR UPDATE 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete own equipment data" 
ON tbl_equipment 
FOR DELETE 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);
*/

-- ===================================================================
-- 5. Create policies for tbl_activity table (if exists)
-- ===================================================================

-- Uncomment these if you have tbl_activity table
/*
CREATE POLICY "Users can view own activity data" 
ON tbl_activity 
FOR SELECT 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert own activity data" 
ON tbl_activity 
FOR INSERT 
WITH CHECK (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update own activity data" 
ON tbl_activity 
FOR UPDATE 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can delete own activity data" 
ON tbl_activity 
FOR DELETE 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);
*/

-- ===================================================================
-- 6. Create policies for booking-related tables
-- ===================================================================

-- Policy for users to view bookings for their fitness centers
/*
CREATE POLICY "Owners can view bookings for their fitness centers" 
ON tbl_booking 
FOR SELECT 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);

-- Policy for users to update booking status for their fitness centers
CREATE POLICY "Owners can update bookings for their fitness centers" 
ON tbl_booking 
FOR UPDATE 
USING (
  fit_id IN (
    SELECT fit_id 
    FROM tbl_fitness 
    WHERE owner_uid IN (
      SELECT owner_uid 
      FROM tbl_owner 
      WHERE owner_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  )
);
*/

-- ===================================================================
-- 7. Grant necessary permissions
-- ===================================================================

-- Grant usage on auth schema (if needed)
-- GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant select on auth.users (if needed for user info)
-- GRANT SELECT ON auth.users TO authenticated;

-- ===================================================================
-- 8. Test queries to verify policies work
-- ===================================================================

-- Test: Check current authenticated user
-- SELECT auth.uid() as current_user_id;

-- Test: Check if user exists in tbl_owner
-- SELECT * FROM tbl_owner WHERE owner_email = (
--   SELECT email FROM auth.users WHERE id = auth.uid()
-- );

-- Test: Check fitness data for current user
-- SELECT * FROM tbl_fitness WHERE created_by = auth.uid();

-- ===================================================================
-- Equipment Table RLS Policies
-- ===================================================================

-- Policy: Users can view equipment for their own fitness centers
CREATE POLICY "Users can view own equipment data"
ON tbl_equipment
FOR SELECT
USING (
  fitness_id IN (
    SELECT fit_id FROM tbl_fitness WHERE created_by = auth.uid()
  )
);

-- Policy: Users can insert equipment for their own fitness centers
