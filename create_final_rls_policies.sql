-- สร้าง RLS Policies ฉบับสมบูรณ์
-- ใช้งานกับระบบจองและชำระเงิน PJ Fitness

-- ก่อนสร้าง policies ให้ปิดการใช้งาน RLS ชั่วคราว
ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refunds DISABLE ROW LEVEL SECURITY;

-- ลบ policies เก่าทั้งหมด
DROP POLICY IF EXISTS "users_select_own_bookings" ON bookings;
DROP POLICY IF EXISTS "owners_select_fitness_bookings" ON bookings;
DROP POLICY IF EXISTS "admins_select_all_bookings" ON bookings;
DROP POLICY IF EXISTS "users_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "users_update_own_bookings" ON bookings;

DROP POLICY IF EXISTS "users_select_own_payments" ON payments;
DROP POLICY IF EXISTS "owners_select_fitness_payments" ON payments;
DROP POLICY IF EXISTS "admins_select_all_payments" ON payments;
DROP POLICY IF EXISTS "system_insert_payments" ON payments;
DROP POLICY IF EXISTS "admins_update_payments" ON payments;

DROP POLICY IF EXISTS "users_select_own_splits" ON payment_splits;
DROP POLICY IF EXISTS "owners_select_fitness_splits" ON payment_splits;
DROP POLICY IF EXISTS "admins_select_all_splits" ON payment_splits;
DROP POLICY IF EXISTS "system_insert_splits" ON payment_splits;

DROP POLICY IF EXISTS "users_select_own_history" ON booking_history;
DROP POLICY IF EXISTS "owners_select_fitness_history" ON booking_history;
DROP POLICY IF EXISTS "admins_select_all_history" ON booking_history;
DROP POLICY IF EXISTS "system_insert_history" ON booking_history;

DROP POLICY IF EXISTS "users_select_own_refunds" ON refunds;
DROP POLICY IF EXISTS "owners_select_fitness_refunds" ON refunds;
DROP POLICY IF EXISTS "admins_select_all_refunds" ON refunds;
DROP POLICY IF EXISTS "system_insert_refunds" ON refunds;

-- สร้าง RLS Policies ใหม่สำหรับตาราง bookings
CREATE POLICY "users_view_own_bookings" ON bookings
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "owners_view_fitness_bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_owner o 
      WHERE o.owner_uid = bookings.owner_uid 
      AND o.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

CREATE POLICY "users_create_bookings" ON bookings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    fitness_id IN (SELECT fit_id FROM tbl_fitness)
  );

CREATE POLICY "users_update_own_bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- สร้าง RLS Policies สำหรับตาราง payments
CREATE POLICY "users_view_own_payments" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT booking_id FROM bookings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "owners_view_fitness_payments" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT b.booking_id FROM bookings b
      JOIN tbl_owner o ON b.owner_uid = o.owner_uid
      WHERE o.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

CREATE POLICY "system_create_payments" ON payments
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT booking_id FROM bookings)
  );

CREATE POLICY "admins_update_payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

-- สร้าง RLS Policies สำหรับตาราง payment_splits
CREATE POLICY "users_view_own_splits" ON payment_splits
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "owners_view_fitness_splits" ON payment_splits
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN tbl_owner o ON b.owner_uid = o.owner_uid
      WHERE o.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_splits" ON payment_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

CREATE POLICY "system_create_splits" ON payment_splits
  FOR INSERT WITH CHECK (
    payment_id IN (SELECT payment_id FROM payments)
  );

-- สร้าง RLS Policies สำหรับตาราง booking_history
CREATE POLICY "users_view_own_history" ON booking_history
  FOR SELECT USING (
    booking_id IN (
      SELECT booking_id FROM bookings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "owners_view_fitness_history" ON booking_history
  FOR SELECT USING (
    booking_id IN (
      SELECT b.booking_id FROM bookings b
      JOIN tbl_owner o ON b.owner_uid = o.owner_uid
      WHERE o.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_history" ON booking_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

CREATE POLICY "system_create_history" ON booking_history
  FOR INSERT WITH CHECK (
    booking_id IN (SELECT booking_id FROM bookings)
  );

-- สร้าง RLS Policies สำหรับตาราง refunds
CREATE POLICY "users_view_own_refunds" ON refunds
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "owners_view_fitness_refunds" ON refunds
  FOR SELECT USING (
    payment_id IN (
      SELECT p.payment_id FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN tbl_owner o ON b.owner_uid = o.owner_uid
      WHERE o.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_refunds" ON refunds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tbl_admin ta
      JOIN profiles p ON ta.admin_name = p.username
      WHERE p.user_uid = auth.uid()
    )
  );

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