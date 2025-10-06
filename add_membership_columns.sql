-- เพิ่ม columns ใหม่สำหรับราคาสมาชิกรายเดือนและรายปี
-- fit_price_memberM = ราคาการสมัครสมาชิกฟิตเนส รายเดือน
-- fit_price_memberY = ราคาการสมัครสมาชิกฟิตเนส รายปี

ALTER TABLE public.tbl_fitness 
ADD COLUMN IF NOT EXISTS fit_price_memberM DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.tbl_fitness 
ADD COLUMN IF NOT EXISTS fit_price_memberY DECIMAL(10,2) DEFAULT 0;

-- เพิ่ม index สำหรับประสิทธิภาพในการค้นหา
CREATE INDEX IF NOT EXISTS idx_tbl_fitness_memberM_price ON public.tbl_fitness(fit_price_memberM);
CREATE INDEX IF NOT EXISTS idx_tbl_fitness_memberY_price ON public.tbl_fitness(fit_price_memberY);

-- แสดงความคิดเห็นสำหรับ columns ใหม่
COMMENT ON COLUMN public.tbl_fitness.fit_price_memberM IS 'ราคาการสมัครสมาชิกฟิตเนส รายเดือน (บาท)';
COMMENT ON COLUMN public.tbl_fitness.fit_price_memberY IS 'ราคาการสมัครสมาชิกฟิตเนส รายปี (บาท)';