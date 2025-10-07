-- สร้างตาราง approved_payments สำหรับเก็บข้อมูลการชำระเงินที่อนุมัติแล้ว

CREATE TABLE IF NOT EXISTS approved_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  slip_url TEXT,
  slip_filename TEXT,
  payment_type TEXT DEFAULT 'qr_payment',
  original_payment_id UUID REFERENCES pending_payments(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  booking_id UUID,
  membership_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_approved_payments_user_id ON approved_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_approved_payments_transaction_id ON approved_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_approved_payments_approved_at ON approved_payments(approved_at);
CREATE INDEX IF NOT EXISTS idx_approved_payments_booking_id ON approved_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_approved_payments_membership_id ON approved_payments(membership_id);

-- เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE approved_payments ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับผู้ใช้ทั่วไป - ดูได้เฉพาะข้อมูลตัวเอง
CREATE POLICY "Users can view their own approved payments" ON approved_payments
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Policy สำหรับ Admin - ดูได้ทั้งหมด (ใช้ admin email)
CREATE POLICY "Admins can view all approved payments" ON approved_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.useremail IN (
        'sriwarinthep@gmail.com',
        'admin@jmfitness.com',
        'manager@jmfitness.com'
      )
    )
  );

-- Policy สำหรับ Admin - เพิ่มข้อมูลได้
CREATE POLICY "Admins can insert approved payments" ON approved_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.useremail IN (
        'sriwarinthep@gmail.com',
        'admin@jmfitness.com',
        'manager@jmfitness.com'
      )
    )
  );

-- Policy สำหรับ Admin - แก้ไขข้อมูลได้
CREATE POLICY "Admins can update approved payments" ON approved_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.useremail IN (
        'sriwarinthep@gmail.com',
        'admin@jmfitness.com',
        'manager@jmfitness.com'
      )
    )
  );

-- สร้าง trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_approved_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_approved_payments_updated_at
    BEFORE UPDATE ON approved_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_approved_payments_updated_at();

-- สร้าง view สำหรับดูข้อมูลที่ join กับ profiles
CREATE OR REPLACE VIEW approved_payments_with_profiles AS
SELECT 
  ap.*,
  p.full_name,
  p.useremail,
  p.usertel,
  admin_p.full_name as approved_by_name,
  admin_p.useremail as approved_by_email
FROM approved_payments ap
LEFT JOIN profiles p ON ap.user_id = p.id
LEFT JOIN profiles admin_p ON ap.approved_by = admin_p.id;

-- Grant permissions สำหรับ view
GRANT SELECT ON approved_payments_with_profiles TO authenticated;

-- เพิ่มข้อมูลตัวอย่าง (สำหรับทดสอบ)
-- INSERT INTO approved_payments (
--   transaction_id,
--   user_id,
--   amount,
--   description,
--   payment_type,
--   approved_by,
--   notes
-- ) VALUES (
--   'txn_example_approved_001',
--   (SELECT id FROM auth.users LIMIT 1),
--   1200.00,
--   'ค่าสมาชิกฟิตเนส 2 เดือน',
--   'qr_payment',
--   (SELECT id FROM auth.users LIMIT 1),
--   'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย'
-- );

-- แสดงข้อมูลสำหรับ debug
-- SELECT * FROM approved_payments_with_profiles ORDER BY approved_at DESC;