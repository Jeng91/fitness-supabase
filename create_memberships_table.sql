-- สร้างตารางสำหรับเก็บข้อมูลสมาชิกฟิตเนส
CREATE TABLE IF NOT EXISTS public.tbl_memberships (
    membership_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fitness_id INTEGER NOT NULL REFERENCES public.tbl_fitness(fit_id) ON DELETE CASCADE,
    membership_type VARCHAR(20) NOT NULL CHECK (membership_type IN ('monthly', 'yearly')),
    amount DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    payment_id UUID REFERENCES public.payments(payment_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางสำหรับเก็บข้อมูลการสมัครคลาส
CREATE TABLE IF NOT EXISTS public.tbl_class_enrollments (
    enrollment_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES public.tbl_classes(class_id) ON DELETE CASCADE,
    fitness_id INTEGER NOT NULL REFERENCES public.tbl_fitness(fit_id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled')),
    payment_id UUID REFERENCES public.payments(payment_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่ม indexes สำหรับประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.tbl_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_fitness_id ON public.tbl_memberships(fitness_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.tbl_memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON public.tbl_memberships(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_user_id ON public.tbl_class_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON public.tbl_class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_fitness_id ON public.tbl_class_enrollments(fitness_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_status ON public.tbl_class_enrollments(status);

-- เพิ่ม RLS policies
ALTER TABLE public.tbl_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tbl_class_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ memberships
CREATE POLICY "Users can view their own memberships" ON public.tbl_memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Fitness owners can view their gym memberships" ON public.tbl_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tbl_fitness f
            JOIN public.tbl_owner o ON f.fit_user = o.owner_name
            WHERE f.fit_id = tbl_memberships.fitness_id
            AND o.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own memberships" ON public.tbl_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies สำหรับ class enrollments
CREATE POLICY "Users can view their own enrollments" ON public.tbl_class_enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Fitness owners can view their class enrollments" ON public.tbl_class_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tbl_fitness f
            JOIN public.tbl_owner o ON f.fit_user = o.owner_name
            WHERE f.fit_id = tbl_class_enrollments.fitness_id
            AND o.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own enrollments" ON public.tbl_class_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- เพิ่ม triggers สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON public.tbl_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_enrollments_updated_at
    BEFORE UPDATE ON public.tbl_class_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- เพิ่ม comments
COMMENT ON TABLE public.tbl_memberships IS 'ตารางเก็บข้อมูลสมาชิกฟิตเนส';
COMMENT ON TABLE public.tbl_class_enrollments IS 'ตารางเก็บข้อมูลการสมัครคลาส';

COMMENT ON COLUMN public.tbl_memberships.membership_type IS 'ประเภทสมาชิก: monthly, yearly';
COMMENT ON COLUMN public.tbl_memberships.amount IS 'จำนวนเงินที่ชำระ';
COMMENT ON COLUMN public.tbl_memberships.start_date IS 'วันที่เริ่มสมาชิก';
COMMENT ON COLUMN public.tbl_memberships.end_date IS 'วันที่สิ้นสุดสมาชิก';
COMMENT ON COLUMN public.tbl_memberships.status IS 'สถานะสมาชิก: active, expired, cancelled';