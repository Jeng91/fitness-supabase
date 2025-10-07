-- ตรวจสอบและแก้ไข RLS สำหรับ qr_payments table

-- 1. ตรวจสอบสถานะ RLS ปัจจุบัน
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'qr_payments';

-- 2. ดู policies ที่มีอยู่
SELECT * FROM pg_policies WHERE tablename = 'qr_payments';

-- 3. ลบ policies เก่าที่อาจจะมีปัญหา (ถ้ามี)
DROP POLICY IF EXISTS "Users can view their own QR payments" ON qr_payments;
DROP POLICY IF EXISTS "Users can create their own QR payments" ON qr_payments;
DROP POLICY IF EXISTS "Users can update their own QR payments" ON qr_payments;
DROP POLICY IF EXISTS "Fitness owners can view related QR payments" ON qr_payments;

-- 4. ปิด RLS ชั่วคราวเพื่อทดสอบ
ALTER TABLE qr_payments DISABLE ROW LEVEL SECURITY;

-- 5. หรือเปิด RLS กับ policies ใหม่ที่ง่ายกว่า
-- ALTER TABLE qr_payments ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow authenticated users full access" ON qr_payments
--     FOR ALL 
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

-- 6. ตรวจสอบผลลัพธ์
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'qr_payments';