-- ทดสอบ RLS Policies ที่สร้างขึ้น
-- ตรวจสอบว่า policies ทำงานถูกต้อง

-- แสดง policies ทั้งหมดที่สร้าง
SELECT 'Current RLS Policies:' as status;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN length(qual) > 50 THEN left(qual, 50) || '...'
    ELSE qual
  END as policy_condition
FROM pg_policies 
WHERE tablename IN ('bookings', 'payments', 'payment_splits', 'booking_history', 'refunds')
ORDER BY tablename, policyname;

-- ตรวจสอบสถานะ RLS
SELECT 'RLS Status:' as status;
SELECT 
  t.tablename,
  CASE WHEN t.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables t
WHERE t.tablename IN ('bookings', 'payments', 'payment_splits', 'booking_history', 'refunds')
  AND t.schemaname = 'public'
ORDER BY t.tablename;

-- ตรวจสอบว่าตารางมีอยู่จริง
SELECT 'Table Existence Check:' as status;
SELECT 
  table_name,
  CASE 
    WHEN table_type = 'BASE TABLE' THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END as table_status
FROM information_schema.tables 
WHERE table_name IN ('bookings', 'payments', 'payment_splits', 'booking_history', 'refunds')
  AND table_schema = 'public'
ORDER BY table_name;

-- ตรวจสอบ foreign key constraints
SELECT 'Foreign Key Constraints:' as status;
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('bookings', 'payments', 'payment_splits', 'booking_history', 'refunds')
ORDER BY tc.table_name, tc.constraint_name;