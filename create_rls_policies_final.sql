-- สร้าง RLS Policies ฉบับสมบูรณ์ที่แก้ไขแล้ว
-- โดยตรวจสอบโครงสร้างตารางให้ถูกต้อง

-- ปิด RLS ชั่วคราวเพื่อลบ policies เก่า
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY; 
ALTER TABLE IF EXISTS payment_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refunds DISABLE ROW LEVEL SECURITY;

-- ลบ policies เก่าทั้งหมด
DROP POLICY IF EXISTS "users_view_own_bookings" ON bookings;
DROP POLICY IF EXISTS "owners_view_fitness_bookings" ON bookings;
DROP POLICY IF EXISTS "admins_view_all_bookings" ON bookings;
DROP POLICY IF EXISTS "users_create_bookings" ON bookings;
DROP POLICY IF EXISTS "users_update_own_bookings" ON bookings;

DROP POLICY IF EXISTS "users_view_own_payments" ON payments;
DROP POLICY IF EXISTS "owners_view_fitness_payments" ON payments;
DROP POLICY IF EXISTS "admins_view_all_payments" ON payments;
DROP POLICY IF EXISTS "system_create_payments" ON payments;
DROP POLICY IF EXISTS "admins_update_payments" ON payments;

DROP POLICY IF EXISTS "users_view_own_splits" ON payment_splits;
DROP POLICY IF EXISTS "owners_view_fitness_splits" ON payment_splits;
DROP POLICY IF EXISTS "admins_view_all_splits" ON payment_splits;
DROP POLICY IF EXISTS "system_create_splits" ON payment_splits;

DROP POLICY IF EXISTS "users_view_own_history" ON booking_history;
DROP POLICY IF EXISTS "owners_view_fitness_history" ON booking_history;
DROP POLICY IF EXISTS "admins_view_all_history" ON booking_history;
DROP POLICY IF EXISTS "system_create_history" ON booking_history;

DROP POLICY IF EXISTS "users_view_own_refunds" ON refunds;
DROP POLICY IF EXISTS "owners_view_fitness_refunds" ON refunds;
DROP POLICY IF EXISTS "admins_view_all_refunds" ON refunds;
DROP POLICY IF EXISTS "system_create_refunds" ON refunds;

-- ===============================================
-- BOOKINGS TABLE RLS POLICIES
-- ===============================================

-- Users can view their own bookings
CREATE POLICY "users_view_own_bookings" ON bookings
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Owners can view bookings for their fitness centers
-- (สมมติว่า bookings มี owner_id หรือเชื่อมกับ fitness center)
CREATE POLICY "owners_view_fitness_bookings" ON bookings
  FOR SELECT USING (
    CASE 
      WHEN EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'bookings' AND column_name = 'owner_id')
      THEN owner_id IN (
        SELECT owner_uid FROM tbl_owner 
        WHERE auth_user_id = auth.uid()
      )
      ELSE fitness_id IN (
        SELECT fit_id FROM tbl_fitness f
        WHERE f.fit_id = bookings.fitness_id
      )
    END
  );

-- Admins can view all bookings
CREATE POLICY "admins_view_all_bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- Users can create bookings for themselves
CREATE POLICY "users_create_bookings" ON bookings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    fitness_id IS NOT NULL
  );

-- Users can update their own bookings
CREATE POLICY "users_update_own_bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ===============================================
-- PAYMENTS TABLE RLS POLICIES  
-- ===============================================

-- Users can view payments for their bookings
CREATE POLICY "users_view_own_payments" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT booking_id FROM bookings 
      WHERE user_id = auth.uid()
    )
  );

-- Owners can view payments for their fitness centers
CREATE POLICY "owners_view_fitness_payments" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT b.booking_id FROM bookings b
      WHERE CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'bookings' AND column_name = 'owner_id')
        THEN b.owner_id IN (
          SELECT owner_uid FROM tbl_owner 
          WHERE auth_user_id = auth.uid()
        )
        ELSE TRUE -- ถ้าไม่มี owner_id ให้ admin ดูได้
      END
    )
  );

-- Admins can view all payments
CREATE POLICY "admins_view_all_payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- System can create payments
CREATE POLICY "system_create_payments" ON payments
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT booking_id FROM bookings)
  );

-- Admins can update payments
CREATE POLICY "admins_update_payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- ===============================================
-- PAYMENT_SPLITS TABLE RLS POLICIES
-- ===============================================

-- Users can view splits for their payments
CREATE POLICY "users_view_own_splits" ON payment_splits
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE b.user_id = auth.uid()
    )
  );

-- Owners can view splits for their payments
CREATE POLICY "owners_view_fitness_splits" ON payment_splits
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'bookings' AND column_name = 'owner_id')
        THEN b.owner_id IN (
          SELECT owner_uid FROM tbl_owner 
          WHERE auth_user_id = auth.uid()
        )
        ELSE TRUE
      END
    )
  );

-- Admins can view all splits
CREATE POLICY "admins_view_all_splits" ON payment_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- System can create splits
CREATE POLICY "system_create_splits" ON payment_splits
  FOR INSERT WITH CHECK (
    payment_id IN (SELECT payment_id FROM payments)
  );

-- ===============================================
-- BOOKING_HISTORY TABLE RLS POLICIES
-- ===============================================

-- Users can view their booking history
CREATE POLICY "users_view_own_history" ON booking_history
  FOR SELECT USING (
    booking_id IN (
      SELECT booking_id FROM bookings 
      WHERE user_id = auth.uid()
    )
  );

-- Owners can view history for their bookings
CREATE POLICY "owners_view_fitness_history" ON booking_history
  FOR SELECT USING (
    booking_id IN (
      SELECT b.booking_id FROM bookings b
      WHERE CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'bookings' AND column_name = 'owner_id')
        THEN b.owner_id IN (
          SELECT owner_uid FROM tbl_owner 
          WHERE auth_user_id = auth.uid()
        )
        ELSE TRUE
      END
    )
  );

-- Admins can view all history
CREATE POLICY "admins_view_all_history" ON booking_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- System can create history records
CREATE POLICY "system_create_history" ON booking_history
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT booking_id FROM bookings)
  );

-- ===============================================
-- REFUNDS TABLE RLS POLICIES
-- ===============================================

-- Users can view their refunds
CREATE POLICY "users_view_own_refunds" ON refunds
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE b.user_id = auth.uid()
    )
  );

-- Owners can view refunds for their payments
CREATE POLICY "owners_view_fitness_refunds" ON refunds
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE CASE 
        WHEN EXISTS(SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'bookings' AND column_name = 'owner_id')
        THEN b.owner_id IN (
          SELECT owner_uid FROM tbl_owner 
          WHERE auth_user_id = auth.uid()
        )
        ELSE TRUE
      END
    )
  );

-- Admins can view all refunds
CREATE POLICY "admins_view_all_refunds" ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- System can create refunds
CREATE POLICY "system_create_refunds" ON refunds
  FOR INSERT WITH CHECK (
    payment_id IN (SELECT payment_id FROM payments)
  );

-- เปิดการใช้งาน RLS สำหรับทุกตาราง
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- แสดงสถานะ RLS ที่สร้างเสร็จแล้ว
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('bookings', 'payments', 'payment_splits', 'booking_history', 'refunds')
ORDER BY tablename, policyname;

-- แสดงสถานะ RLS
SELECT 
  t.tablename,
  t.rowsecurity
FROM pg_tables t
WHERE t.tablename IN ('bookings', 'payments', 'payment_splits', 'booking_history', 'refunds')
  AND t.schemaname = 'public';