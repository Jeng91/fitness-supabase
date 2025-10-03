-- สร้างตาราง tbl_fitness_requests สำหรับเก็บคำขอสร้างฟิตเนสที่รออนุมัติ
CREATE TABLE IF NOT EXISTS public.tbl_fitness_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fit_name VARCHAR(255) NOT NULL,
    fit_type VARCHAR(100),
    fit_description TEXT,
    fit_price DECIMAL(10, 2),
    fit_duration INTEGER, -- ระยะเวลาเป็นนาที
    fit_location VARCHAR(500),
    fit_contact VARCHAR(255),
    fit_image TEXT, -- URL ของรูปภาพ
    owner_id INTEGER REFERENCES public.tbl_owner(owner_uid) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER REFERENCES public.tbl_admin(admin_id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by INTEGER REFERENCES public.tbl_admin(admin_id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง RLS policies สำหรับ tbl_fitness_requests
ALTER TABLE public.tbl_fitness_requests ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับ partners (เจ้าของสามารถ CRUD ข้อมูลของตัวเอง)
CREATE POLICY "Partners can manage their own fitness requests" ON public.tbl_fitness_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tbl_owner 
            WHERE tbl_owner.owner_uid = tbl_fitness_requests.owner_id 
            AND tbl_owner.owner_email = auth.jwt() ->> 'email'
        )
    );

-- Policy สำหรับ admins (สามารถดูและจัดการทุกอย่าง)
CREATE POLICY "Admins can manage all fitness requests" ON public.tbl_fitness_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tbl_admin 
            WHERE tbl_admin.admin_name = auth.jwt() ->> 'email'
        )
    );

-- Policy สำหรับการอ่านแบบสาธารณะ (สำหรับแสดงผลข้อมูลที่อนุมัติแล้ว)
CREATE POLICY "Public read approved fitness requests" ON public.tbl_fitness_requests
    FOR SELECT USING (status = 'approved');

-- สร้าง indexes เพื่อประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_fitness_requests_owner_id ON public.tbl_fitness_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_fitness_requests_status ON public.tbl_fitness_requests(status);
CREATE INDEX IF NOT EXISTS idx_fitness_requests_created_at ON public.tbl_fitness_requests(created_at);

-- สร้าง trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fitness_requests_updated_at 
    BEFORE UPDATE ON public.tbl_fitness_requests 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- เพิ่มข้อมูลทดสอบ (ตัวอย่างคำขอรอการอนุมัติ)
-- ต้องแน่ใจว่ามี owner_uid ในตาราง tbl_owner ก่อน
-- ให้ตรวจสอบข้อมูล owner ที่มีอยู่ด้วยคำสั่ง: SELECT owner_uid FROM tbl_owner;

-- สร้างข้อมูล owner ทดสอบก่อน (ถ้ายังไม่มี)
INSERT INTO public.tbl_owner (owner_name, owner_email, owner_password) 
VALUES ('Partner Test', 'partner@test.com', 'password123')
ON CONFLICT (owner_email) DO NOTHING;

-- หาค่า owner_uid ที่เพิ่งสร้างหรือที่มีอยู่แล้ว
DO $$
DECLARE
    test_owner_id INTEGER;
BEGIN
    -- หา owner_uid ของ partner ทดสอบ
    SELECT owner_uid INTO test_owner_id 
    FROM public.tbl_owner 
    WHERE owner_email = 'partner@test.com' 
    LIMIT 1;
    
    -- ถ้าไม่มี ให้ใช้ owner_uid แรกที่มีในตาราง
    IF test_owner_id IS NULL THEN
        SELECT owner_uid INTO test_owner_id 
        FROM public.tbl_owner 
        LIMIT 1;
    END IF;
    
    -- เพิ่มข้อมูลทดสอบถ้ามี owner_uid
    IF test_owner_id IS NOT NULL THEN
        INSERT INTO public.tbl_fitness_requests (
            fit_name, fit_type, fit_description, fit_price, fit_duration, 
            fit_location, fit_contact, owner_id, status
        ) VALUES 
        (
            'CrossFit Downtown', 
            'CrossFit', 
            'โปรแกรม CrossFit สำหรับผู้เริ่มต้นถึงระดับสูง พร้อมอุปกรณ์ครบครันและโค้ชมืออาชีพ', 
            1500.00, 
            60, 
            'สาขาดาวน์ทาวน์ กรุงเทพฯ', 
            'tel:02-123-4567', 
            test_owner_id, 
            'pending'
        ),
        (
            'Yoga Harmony Studio', 
            'Yoga', 
            'คลาสโยคะสำหรับผู้ที่ต้องการความสงบและยืดหยุ่นของร่างกาย', 
            800.00, 
            90, 
            'ห้องออกกำลังกาย เยาวราช', 
            'tel:02-987-6543', 
            test_owner_id, 
            'pending'
        );
        
        RAISE NOTICE 'เพิ่มข้อมูลทดสอบสำเร็จ สำหรับ owner_uid: %', test_owner_id;
    ELSE
        RAISE NOTICE 'ไม่สามารถเพิ่มข้อมูลทดสอบได้ เนื่องจากไม่มีข้อมูล owner ในระบบ';
    END IF;
END $$;

COMMENT ON TABLE public.tbl_fitness_requests IS 'ตารางเก็บคำขอสร้างฟิตเนสที่รอการอนุมัติจากแอดมิน';