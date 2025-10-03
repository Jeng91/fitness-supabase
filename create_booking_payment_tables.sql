-- ========================================
-- สร้าง Tables สำหรับระบบการจองและชำระเงิน
-- ========================================

-- 1. ตาราง bookings (การจอง)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fitness_id UUID REFERENCES tbl_fitness(fit_id) ON DELETE CASCADE,
    owner_id UUID REFERENCES tbl_owner(ow_id) ON DELETE CASCADE,
    
    -- ข้อมูลการจอง
    booking_date DATE NOT NULL,
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- สถานะการจอง
    booking_status VARCHAR(20) DEFAULT 'pending' CHECK (booking_status IN (
        'pending',      -- รอการชำระเงิน
        'confirmed',    -- ยืนยันแล้ว (ชำระเงินแล้ว)
        'cancelled',    -- ยกเลิก
        'completed',    -- เสร็จสิ้น (ใช้บริการแล้ว)
        'expired'       -- หมดอายุ
    )),
    
    -- ข้อมูลเพิ่มเติม
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ตาราง payments (การชำระเงิน)
CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- ข้อมูลการชำระเงิน
    total_amount DECIMAL(10,2) NOT NULL,
    system_fee DECIMAL(10,2) NOT NULL,      -- ค่าธรรมเนียมระบบ 20%
    fitness_amount DECIMAL(10,2) NOT NULL,  -- ยอดที่ฟิตเนสได้รับ 80%
    
    -- ช่องทางการชำระเงิน
    payment_method VARCHAR(50) DEFAULT 'credit_card' CHECK (payment_method IN (
        'credit_card',
        'debit_card', 
        'promptpay',
        'bank_transfer',
        'wallet'
    )),
    
    -- สถานะการชำระเงิน
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending',      -- รอการชำระ
        'processing',   -- กำลังดำเนินการ
        'completed',    -- ชำระสำเร็จ
        'failed',       -- ชำระไม่สำเร็จ
        'refunded',     -- คืนเงินแล้ว
        'cancelled'     -- ยกเลิก
    )),
    
    -- ข้อมูล API Payment Gateway
    transaction_id VARCHAR(255) UNIQUE,     -- ID จาก Payment Gateway
    gateway_response JSONB,                 -- Response จาก Gateway
    gateway_reference VARCHAR(255),         -- Reference จาก Gateway
    
    -- เวลา
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ตาราง payment_splits (การแบ่งเงิน)
CREATE TABLE IF NOT EXISTS payment_splits (
    split_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(payment_id) ON DELETE CASCADE,
    
    -- การแบ่งเงินให้ระบบ
    system_split_amount DECIMAL(10,2) NOT NULL,
    system_split_status VARCHAR(20) DEFAULT 'pending' CHECK (system_split_status IN (
        'pending',
        'completed',
        'failed'
    )),
    
    -- การแบ่งเงินให้ฟิตเนส
    fitness_split_amount DECIMAL(10,2) NOT NULL,
    fitness_split_status VARCHAR(20) DEFAULT 'pending' CHECK (fitness_split_status IN (
        'pending',
        'completed', 
        'failed'
    )),
    
    -- ข้อมูลการโอนเงิน
    fitness_transfer_ref VARCHAR(255),      -- เลขอ้างอิงการโอนให้ฟิตเนส
    system_fee_ref VARCHAR(255),            -- เลขอ้างอิงค่าธรรมเนียมระบบ
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ตาราง booking_history (ประวัติการเปลี่ยนแปลงสถานะ)
CREATE TABLE IF NOT EXISTS booking_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE CASCADE,
    
    -- การเปลี่ยนแปลงสถานะ
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ตาราง refunds (การคืนเงิน)
CREATE TABLE IF NOT EXISTS refunds (
    refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(payment_id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE CASCADE,
    
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_reason TEXT,
    refund_status VARCHAR(20) DEFAULT 'pending' CHECK (refund_status IN (
        'pending',
        'processing',
        'completed',
        'failed'
    )),
    
    refund_reference VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- สร้าง Indexes เพื่อประสิทธิภาพ
-- ========================================

-- Indexes สำหรับ bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_fitness_id ON bookings(fitness_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);

-- Indexes สำหรับ payments  
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Indexes สำหรับ payment_splits
CREATE INDEX IF NOT EXISTS idx_payment_splits_payment_id ON payment_splits(payment_id);

-- ========================================
-- สร้าง Functions และ Triggers
-- ========================================

-- Function สำหรับ update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers สำหรับ auto-update timestamps
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_splits_updated_at BEFORE UPDATE ON payment_splits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS Policies
-- ========================================

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;  
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin access (สำหรับ admin ดูข้อมูลทั้งหมด)
CREATE POLICY "Admins can view all bookings" ON bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Owner access (เจ้าของฟิตเนสดูการจองของตนเอง)
CREATE POLICY "Owners can view their fitness bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tbl_owner 
            WHERE ow_id = owner_id 
            AND ow_user_id = auth.uid()
        )
    );

COMMENT ON TABLE bookings IS 'ตารางเก็บข้อมูลการจองฟิตเนส';
COMMENT ON TABLE payments IS 'ตารางเก็บข้อมูลการชำระเงิน';
COMMENT ON TABLE payment_splits IS 'ตารางเก็บข้อมูลการแบ่งเงินระหว่างระบบและฟิตเนส';
COMMENT ON TABLE booking_history IS 'ตารางเก็บประวัติการเปลี่ยนแปลงสถานะการจอง';
COMMENT ON TABLE refunds IS 'ตารางเก็บข้อมูลการคืนเงิน';