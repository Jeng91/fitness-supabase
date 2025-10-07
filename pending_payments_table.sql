-- สร้างตารางการชำระเงินรออนุมัติ
CREATE TABLE pending_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  slip_url TEXT, -- URL ของไฟล์สลิป
  slip_filename VARCHAR(255),
  payment_type VARCHAR(50) DEFAULT 'qr_payment',
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  booking_id UUID, -- อ้างอิงถึงการจอง
  membership_id UUID, -- อ้างอิงถึงสมาชิกภาพ
  admin_notes TEXT, -- หมายเหตุจาก admin
  approved_by UUID REFERENCES auth.users(id), -- admin ที่อนุมัติ
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับการค้นหา
CREATE INDEX idx_pending_payments_status ON pending_payments(status);
CREATE INDEX idx_pending_payments_user_id ON pending_payments(user_id);
CREATE INDEX idx_pending_payments_transaction_id ON pending_payments(transaction_id);
CREATE INDEX idx_pending_payments_created_at ON pending_payments(created_at);

-- RLS (Row Level Security)
ALTER TABLE pending_payments ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับ users: ดูได้เฉพาะข้อมูลของตัวเอง
CREATE POLICY "Users can view their own pending payments" 
ON pending_payments FOR SELECT 
USING (auth.uid() = user_id);

-- Policy สำหรับ users: สร้างข้อมูลได้เฉพาะของตัวเอง
CREATE POLICY "Users can create their own pending payments" 
ON pending_payments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy สำหรับ admins: ดูและแก้ไขได้ทุกอัน
CREATE POLICY "Admins can view all pending payments" 
ON pending_payments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all pending payments" 
ON pending_payments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Function สำหรับอัปเดต updated_at
CREATE OR REPLACE FUNCTION update_pending_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger สำหรับอัปเดต updated_at
CREATE TRIGGER update_pending_payments_updated_at
  BEFORE UPDATE ON pending_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_payments_updated_at();