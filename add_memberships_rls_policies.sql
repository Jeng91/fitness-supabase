-- เพิ่ม RLS policies สำหรับตาราง tbl_memberships และ tbl_class_enrollments ที่มีอยู่แล้ว

-- เปิด RLS สำหรับ tbl_memberships
ALTER TABLE public.tbl_memberships ENABLE ROW LEVEL SECURITY;

-- เปิด RLS สำหรับ tbl_class_enrollments (ถ้ามีอยู่แล้ว)
ALTER TABLE public.tbl_class_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ tbl_memberships
CREATE POLICY "Users can view their own memberships" ON public.tbl_memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Fitness owners can view their gym memberships" ON public.tbl_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tbl_fitness f
            WHERE f.fit_id = tbl_memberships.fitness_id
            AND f.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.tbl_fitness f
            JOIN public.tbl_owner o ON f.fit_user = o.owner_name
            WHERE f.fit_id = tbl_memberships.fitness_id
            AND o.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own memberships" ON public.tbl_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memberships" ON public.tbl_memberships
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies สำหรับ tbl_class_enrollments (ถ้าตารางมีอยู่แล้ว)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_class_enrollments') THEN
        -- สร้าง policies สำหรับ class enrollments
        EXECUTE 'CREATE POLICY "Users can view their own enrollments" ON public.tbl_class_enrollments
            FOR SELECT USING (auth.uid() = user_id)';

        EXECUTE 'CREATE POLICY "Fitness owners can view their class enrollments" ON public.tbl_class_enrollments
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.tbl_fitness f
                    WHERE f.fit_id = tbl_class_enrollments.fitness_id
                    AND f.created_by = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.tbl_fitness f
                    JOIN public.tbl_owner o ON f.fit_user = o.owner_name
                    WHERE f.fit_id = tbl_class_enrollments.fitness_id
                    AND o.auth_user_id = auth.uid()
                )
            )';

        EXECUTE 'CREATE POLICY "Users can insert their own enrollments" ON public.tbl_class_enrollments
            FOR INSERT WITH CHECK (auth.uid() = user_id)';

        EXECUTE 'CREATE POLICY "Users can update their own enrollments" ON public.tbl_class_enrollments
            FOR UPDATE USING (auth.uid() = user_id)';
    END IF;
END $$;

-- เพิ่ม comments (ถ้าต้องการ)
COMMENT ON TABLE public.tbl_memberships IS 'ตารางเก็บข้อมูลสมาชิกฟิตเนส';

COMMENT ON COLUMN public.tbl_memberships.membership_type IS 'ประเภทสมาชิก: monthly, yearly';
COMMENT ON COLUMN public.tbl_memberships.amount IS 'จำนวนเงินที่ชำระ';
COMMENT ON COLUMN public.tbl_memberships.start_date IS 'วันที่เริ่มสมาชิก';
COMMENT ON COLUMN public.tbl_memberships.end_date IS 'วันที่สิ้นสุดสมาชิก';
COMMENT ON COLUMN public.tbl_memberships.status IS 'สถานะสมาชิก: active, expired, cancelled';