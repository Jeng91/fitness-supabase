-- สร้างตาราง qr_payments สำหรับจัดเก็บข้อมูล QR Payment
CREATE TABLE IF NOT EXISTS qr_payments (
    qr_payment_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    qr_code TEXT NOT NULL,
    qr_image_url TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'THB',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired', 'cancelled')),
    payment_method VARCHAR(50) DEFAULT 'qr_promptpay',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_qr_payments_transaction_id ON qr_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_qr_payments_user_id ON qr_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_payments_status ON qr_payments(status);
CREATE INDEX IF NOT EXISTS idx_qr_payments_expires_at ON qr_payments(expires_at);

-- สร้าง trigger สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_qr_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qr_payments_updated_at
    BEFORE UPDATE ON qr_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_payments_updated_at();

-- ตั้งค่า Row Level Security (RLS)
ALTER TABLE qr_payments ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับผู้ใช้สามารถดูข้อมูล QR Payment ของตัวเองเท่านั้น
CREATE POLICY "Users can view their own QR payments" ON qr_payments
    FOR SELECT USING (auth.uid() = user_id);

-- Policy สำหรับผู้ใช้สามารถสร้าง QR Payment ของตัวเองเท่านั้น
CREATE POLICY "Users can create their own QR payments" ON qr_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy สำหรับผู้ใช้สามารถอัปเดต QR Payment ของตัวเองเท่านั้น
CREATE POLICY "Users can update their own QR payments" ON qr_payments
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy สำหรับเจ้าของฟิตเนสสามารถดู QR payments ที่เกี่ยวข้องกับฟิตเนสของตน
CREATE POLICY "Fitness owners can view related QR payments" ON qr_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tbl_fitness tf 
            WHERE tf.created_by = auth.uid()
            AND EXISTS (
                SELECT 1 FROM bookings b 
                WHERE b.fitness_id = tf.fit_id 
                AND b.booking_id::text = qr_payments.transaction_id
            )
        )
        OR 
        EXISTS (
            SELECT 1 FROM tbl_owner o
            WHERE o.auth_user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM bookings b 
                WHERE b.owner_uid = o.owner_uid
                AND b.booking_id::text = qr_payments.transaction_id
            )
        )
    );

-- เพิ่มความคิดเห็นสำหรับตาราง
COMMENT ON TABLE qr_payments IS 'ตารางสำหรับจัดเก็บข้อมูล QR Code Payment';
COMMENT ON COLUMN qr_payments.transaction_id IS 'รหัสอ้างอิงการทำรายการที่ไม่ซ้ำ';
COMMENT ON COLUMN qr_payments.qr_code IS 'ข้อมูล QR Code สำหรับการชำระเงิน';
COMMENT ON COLUMN qr_payments.qr_image_url IS 'URL ของรูป QR Code';
COMMENT ON COLUMN qr_payments.status IS 'สถานะการชำระเงิน (pending, success, failed, expired, cancelled)';
COMMENT ON COLUMN qr_payments.expires_at IS 'วันที่และเวลาที่ QR Code หมดอายุ';
COMMENT ON COLUMN qr_payments.gateway_response IS 'ข้อมูลตอบกลับจาก Payment Gateway';