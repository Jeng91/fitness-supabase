-- ทดสอบการสร้างตาราง bookings และ payments
-- รันทีละส่วนเพื่อตรวจสอบข้อผิดพลาด

-- ลบตารางเก่าก่อน (ถ้ามี)
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS booking_history CASCADE;
DROP TABLE IF EXISTS payment_splits CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

-- สร้างตาราง bookings
CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fitness_id INTEGER REFERENCES tbl_fitness(fit_id) ON DELETE CASCADE,
    owner_uid INTEGER REFERENCES tbl_owner(owner_uid) ON DELETE CASCADE,
    
    -- ข้อมูลการจอง
    booking_date DATE NOT NULL,
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- สถานะการจอง
    booking_status VARCHAR(20) DEFAULT 'pending' CHECK (booking_status IN (
        'pending', 'confirmed', 'cancelled', 'completed', 'expired'
    )),
    
    -- ข้อมูลเพิ่มเติม
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ทดสอบการ insert
INSERT INTO bookings (user_id, fitness_id, owner_uid, booking_date, total_amount, notes) 
VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT fit_id FROM tbl_fitness LIMIT 1),
    (SELECT owner_uid FROM tbl_owner LIMIT 1),
    CURRENT_DATE,
    100.00,
    'Test booking'
);

-- ตรวจสอบผลลัพธ์
SELECT * FROM bookings;

-- ลบข้อมูลทดสอบ
DELETE FROM bookings WHERE notes = 'Test booking';