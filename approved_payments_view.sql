-- สร้าง view สำหรับแสดงข้อมูลการชำระเงินที่อนุมัติแล้วพร้อมรายละเอียด
-- ใช้ข้อมูลจาก approved_payments หลักเพื่อหลีกเลี่ยงปัญหา type mismatch

-- ลบ views เดิมก่อนสร้างใหม่
DROP VIEW IF EXISTS approved_payments_with_details CASCADE;
DROP VIEW IF EXISTS revenue_reports CASCADE;
DROP VIEW IF EXISTS fitness_revenue_reports CASCADE;
DROP VIEW IF EXISTS approved_payments_with_profiles CASCADE;

CREATE VIEW approved_payments_with_details AS
SELECT 
  ap.*,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name,
  admin_user.email as approved_by_email,
  admin_user.raw_user_meta_data->>'full_name' as approved_by_name,
  
  -- ข้อมูลเพิ่มเติมจาก tbl_fitness (ถ้า JOIN ได้)
  f.fit_name as actual_fitness_name,
  f.fit_location as fitness_location,
  f.fit_address as fitness_address,
  f.fit_contact as fitness_contact,
  f.fit_phone as fitness_phone,
  f.fit_price_memberm as monthly_price,
  f.fit_price_membery as yearly_price
  
FROM approved_payments ap
LEFT JOIN auth.users u ON ap.user_id = u.id
LEFT JOIN auth.users admin_user ON ap.approved_by = admin_user.id
LEFT JOIN tbl_fitness f ON (
  CASE 
    WHEN ap.fitness_id IS NOT NULL THEN ap.fitness_id::text = f.fit_id::text
    ELSE ap.fitness_name = f.fit_name
  END
)
ORDER BY ap.approved_at DESC;

-- สร้าง view ง่ายๆ สำหรับ Frontend (ใช้ในการแสดงผลรายการ approved payments)
-- ลบ view เดิมก่อนสร้างใหม่เพื่อหลีกเลี่ยงปัญหา column structure
DROP VIEW IF EXISTS approved_payments_with_profiles CASCADE;

CREATE VIEW approved_payments_with_profiles AS
SELECT 
  ap.id,
  ap.transaction_id,
  ap.user_id,
  ap.amount,
  ap.description,
  ap.slip_url,
  ap.slip_filename,
  ap.payment_type,
  ap.approved_at,
  ap.approved_by,
  ap.fitness_name,
  ap.partner_name,
  ap.booking_type,
  ap.booking_period,
  ap.system_fee,
  ap.partner_revenue,
  ap.notes,
  ap.created_at,
  
  -- ข้อมูลผู้ใช้จาก profiles
  p.full_name,
  p.useremail,
  p.usertel
  
FROM approved_payments ap
LEFT JOIN profiles p ON ap.user_id = p.user_uid
ORDER BY ap.approved_at DESC;

-- Grant permissions สำหรับ view ใหม่
GRANT SELECT ON approved_payments_with_profiles TO authenticated;

-- สร้าง view สำหรับรายงานรายได้
CREATE VIEW revenue_reports AS
SELECT 
  DATE(approved_at) as payment_date,
  COUNT(*) as total_transactions,
  SUM(amount) as total_revenue,
  SUM(system_fee) as total_system_fee,
  SUM(partner_revenue) as total_partner_revenue,
  
  -- แยกตามประเภทการจอง
  COUNT(CASE WHEN booking_type = 'daily' THEN 1 END) as daily_bookings,
  COUNT(CASE WHEN booking_type = 'monthly' THEN 1 END) as monthly_bookings,
  COUNT(CASE WHEN booking_type = 'yearly' THEN 1 END) as yearly_bookings,
  COUNT(CASE WHEN booking_type = 'class' THEN 1 END) as class_bookings,
  COUNT(CASE WHEN booking_type = 'membership' THEN 1 END) as membership_bookings,
  
  SUM(CASE WHEN booking_type = 'daily' THEN amount ELSE 0 END) as daily_revenue,
  SUM(CASE WHEN booking_type = 'monthly' THEN amount ELSE 0 END) as monthly_revenue,
  SUM(CASE WHEN booking_type = 'yearly' THEN amount ELSE 0 END) as yearly_revenue,
  SUM(CASE WHEN booking_type = 'class' THEN amount ELSE 0 END) as class_revenue,
  SUM(CASE WHEN booking_type = 'membership' THEN amount ELSE 0 END) as membership_revenue
  
FROM approved_payments 
GROUP BY DATE(approved_at)
ORDER BY payment_date DESC;

-- สร้าง view สำหรับรายงานรายได้ตามฟิตเนส (ใช้ข้อมูลจาก approved_payments)
CREATE VIEW fitness_revenue_reports AS
SELECT 
  COALESCE(ap.fitness_name, 'ไม่ระบุฟิตเนส') as fitness_name,
  COALESCE(ap.partner_name, 'ไม่ระบุพาร์ทเนอร์') as partner_name,
  COUNT(*) as total_bookings,
  SUM(ap.amount) as total_revenue,
  SUM(ap.partner_revenue) as fitness_revenue,
  SUM(ap.system_fee) as system_fee_collected,
  
  -- แยกตามประเภทการจอง
  COUNT(CASE WHEN ap.booking_type = 'daily' THEN 1 END) as daily_bookings,
  COUNT(CASE WHEN ap.booking_type = 'monthly' THEN 1 END) as monthly_bookings,
  COUNT(CASE WHEN ap.booking_type = 'yearly' THEN 1 END) as yearly_bookings,
  COUNT(CASE WHEN ap.booking_type = 'class' THEN 1 END) as class_bookings,
  COUNT(CASE WHEN ap.booking_type = 'membership' THEN 1 END) as membership_bookings,
  
  AVG(ap.amount) as average_booking_value,
  MIN(ap.approved_at) as first_booking,
  MAX(ap.approved_at) as latest_booking,
  
  -- เปอร์เซ็นต์ของรายได้รวม
  ROUND(
    SUM(ap.amount) * 100.0 / NULLIF(
      (SELECT SUM(amount) FROM approved_payments), 0
    ), 2
  ) as revenue_percentage
  
FROM approved_payments ap
WHERE ap.fitness_name IS NOT NULL OR ap.partner_name IS NOT NULL
GROUP BY ap.fitness_name, ap.partner_name
ORDER BY total_revenue DESC;

-- Grant permissions สำหรับทุก views
GRANT SELECT ON approved_payments_with_details TO authenticated;
GRANT SELECT ON approved_payments_with_profiles TO authenticated;
GRANT SELECT ON revenue_reports TO authenticated;
GRANT SELECT ON fitness_revenue_reports TO authenticated;