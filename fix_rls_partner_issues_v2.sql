-- Fix RLS policies for partner fitness management
-- This addresses PATCH 400 errors when partners try to update fitness data

-- 1. Drop existing policies
DROP POLICY IF EXISTS "fitness_insert_for_authenticated" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_update_for_authenticated" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_delete_for_authenticated" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_select_for_authenticated" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_insert_policy" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_update_policy" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_delete_policy" ON public.tbl_fitness;
DROP POLICY IF EXISTS "fitness_select_policy" ON public.tbl_fitness;

-- 2. Create comprehensive policies for INSERT operations
CREATE POLICY "fitness_insert_policy" ON public.tbl_fitness
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        (
            -- Allow insert if fit_user matches authenticated user's profile
            fit_user IN (
                SELECT owner_id FROM public.tbl_owner 
                WHERE owner_uid = auth.uid()
            )
            OR
            -- Allow insert if created_by matches authenticated user
            created_by = auth.uid()
        )
    );

-- 3. Create comprehensive policies for UPDATE operations  
CREATE POLICY "fitness_update_policy" ON public.tbl_fitness
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated' AND 
        (
            -- Allow update if fit_user matches authenticated user's profile
            fit_user IN (
                SELECT owner_id FROM public.tbl_owner 
                WHERE owner_uid = auth.uid()
            )
            OR
            -- Allow update if created_by matches authenticated user
            created_by = auth.uid()
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        (
            -- Ensure updated fit_user still matches authenticated user
            fit_user IN (
                SELECT owner_id FROM public.tbl_owner 
                WHERE owner_uid = auth.uid()
            )
            OR
            -- Ensure created_by still matches authenticated user
            created_by = auth.uid()
        )
    );

-- 4. Create comprehensive policies for DELETE operations
CREATE POLICY "fitness_delete_policy" ON public.tbl_fitness
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' AND 
        (
            -- Allow delete if fit_user matches authenticated user's profile
            fit_user IN (
                SELECT owner_id FROM public.tbl_owner 
                WHERE owner_uid = auth.uid()
            )
            OR
            -- Allow delete if created_by matches authenticated user
            created_by = auth.uid()
        )
    );

-- 5. Create comprehensive policies for SELECT operations
CREATE POLICY "fitness_select_policy" ON public.tbl_fitness
    FOR SELECT 
    USING (
        -- Public read access for anonymous users
        auth.role() = 'anon'
        OR
        -- Authenticated users can read all
        auth.role() = 'authenticated'
    );

-- 6. Create policy for service role (if needed for admin operations)
CREATE POLICY "fitness_service_role_policy" ON public.tbl_fitness
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Verification queries to check the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tbl_fitness'
ORDER BY policyname;