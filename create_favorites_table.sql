-- สร้างตาราง tbl_favorites สำหรับเก็บรายการโปรดของผู้ใช้
CREATE TABLE IF NOT EXISTS public.tbl_favorites (
    favorite_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fitness_id int4 NOT NULL REFERENCES public.tbl_fitness(fit_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- ป้องกันการเพิ่มรายการโปรดซ้ำ
    UNIQUE(user_id, fitness_id)
);

-- สร้าง index เพื่อเพิ่มประสิทธิภาพการค้นหา
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.tbl_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_fitness_id ON public.tbl_favorites(fitness_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.tbl_favorites(created_at);

-- เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE public.tbl_favorites ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS Policies
-- ผู้ใช้สามารถดูเฉพาะรายการโปรดของตนเอง
CREATE POLICY "Users can view their own favorites"
ON public.tbl_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- ผู้ใช้สามารถเพิ่มรายการโปรดของตนเอง
CREATE POLICY "Users can insert their own favorites"
ON public.tbl_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ผู้ใช้สามารถลบรายการโปรดของตนเอง
CREATE POLICY "Users can delete their own favorites"
ON public.tbl_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- ผู้ใช้สามารถอัพเดทรายการโปรดของตนเอง
CREATE POLICY "Users can update their own favorites"
ON public.tbl_favorites
FOR UPDATE
USING (auth.uid() = user_id);

-- เพิ่ม comment อธิบายตาราง
COMMENT ON TABLE public.tbl_favorites IS 'ตารางเก็บรายการฟิตเนสโปรดของผู้ใช้';
COMMENT ON COLUMN public.tbl_favorites.favorite_id IS 'รหัสรายการโปรด (Primary Key)';
COMMENT ON COLUMN public.tbl_favorites.user_id IS 'รหัสผู้ใช้ (Foreign Key)';
COMMENT ON COLUMN public.tbl_favorites.fitness_id IS 'รหัสฟิตเนส (Foreign Key)';
COMMENT ON COLUMN public.tbl_favorites.created_at IS 'วันที่เพิ่มรายการโปรด';
COMMENT ON COLUMN public.tbl_favorites.updated_at IS 'วันที่อัพเดทล่าสุด';

-- ตัวอย่างการใช้งาน:
-- INSERT INTO tbl_favorites (user_id, fitness_id) VALUES ('user-uuid', 1);
-- SELECT * FROM tbl_favorites WHERE user_id = 'user-uuid';
-- DELETE FROM tbl_favorites WHERE user_id = 'user-uuid' AND fitness_id = 1;