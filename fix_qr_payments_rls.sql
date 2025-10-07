-- เพิ่ม RLS Policy ชั่วคราวสำหรับ Development
-- ใช้เมื่อต้องการทดสอบระบบโดยไม่มีข้อจำกัด

-- ปิด RLS ชั่วคราวสำหรับ qr_payments (สำหรับ development เท่านั้น)
ALTER TABLE qr_payments DISABLE ROW LEVEL SECURITY;

-- หรือเพิ่ม policy ที่เปิดกว้างสำหรับ authenticated users
-- ALTER TABLE qr_payments ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Authenticated users can insert QR payments" ON qr_payments
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Authenticated users can select QR payments" ON qr_payments  
--     FOR SELECT USING (auth.role() = 'authenticated');
-- 
-- CREATE POLICY "Authenticated users can update QR payments" ON qr_payments
--     FOR UPDATE USING (auth.role() = 'authenticated');