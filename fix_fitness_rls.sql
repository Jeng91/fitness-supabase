-- ตรวจสอบ RLS policies สำหรับ tbl_fitness
-- เปิดใช้งาน RLS
ALTER TABLE tbl_fitness ENABLE ROW LEVEL SECURITY;

-- ลบ policies เดิม (ถ้ามี)
DROP POLICY IF EXISTS "Enable read access for all users" ON tbl_fitness;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON tbl_fitness;
DROP POLICY IF EXISTS "Enable update for users based on created_by" ON tbl_fitness;
DROP POLICY IF EXISTS "Enable delete for users based on created_by" ON tbl_fitness;

-- สร้าง policies ใหม่
-- 1. อนุญาตให้ทุกคนอ่านข้อมูลฟิตเนส (สำหรับแสดงในหน้าหลัก)
CREATE POLICY "Public read access for fitness" ON tbl_fitness
    FOR SELECT 
    USING (true);

-- 2. อนุญาตให้ผู้ใช้ที่เข้าสู่ระบบเพิ่มข้อมูลฟิตเนส
CREATE POLICY "Authenticated users can insert fitness" ON tbl_fitness
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. อนุญาตให้เจ้าของแก้ไขข้อมูลตัวเอง
CREATE POLICY "Users can update own fitness" ON tbl_fitness
    FOR UPDATE 
    USING (auth.uid()::text = created_by)
    WITH CHECK (auth.uid()::text = created_by);

-- 4. อนุญาตให้เจ้าของลบข้อมูลตัวเอง
CREATE POLICY "Users can delete own fitness" ON tbl_fitness
    FOR DELETE 
    USING (auth.uid()::text = created_by);

-- ตรวจสอบ policies ที่สร้างแล้ว
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'tbl_fitness';