-- สคริปต์สร้างข้อมูลตัวอย่างสำหรับระบบ Partner Dashboard
-- ใช้สำหรับการทดสอบและ Demo

-- เริ่มต้น transaction
BEGIN;

-- ลบข้อมูลเก่า (ถ้ามี) เพื่อป้องกัน duplicate
DELETE FROM tbl_equipment WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE fit_user LIKE '%demo%'
);
DELETE FROM tbl_fitness WHERE fit_user LIKE '%demo%';
DELETE FROM tbl_owner WHERE owner_email LIKE '%demo%';

-- 1. สร้างข้อมูลเจ้าของฟิตเนส (Partners)
INSERT INTO tbl_owner (
  owner_name,
  owner_email,
  owner_password,
  created_at,
  updated_at
) VALUES 
  (
    'สมชาย ฟิตเนส',
    'somchai.fitness@demo.com',
    'password123',
    NOW(),
    NOW()
  ),
  (
    'สมหญิง เฮลท์ตี้',
    'somying.healthy@demo.com',
    'password123',
    NOW(),
    NOW()
  ),
  (
    'ปิยะ สปอร์ต',
    'piya.sport@demo.com',
    'password123',
    NOW(),
    NOW()
  );

-- 2. สร้างข้อมูลฟิตเนส
-- ใส่ข้อมูลครบทุก column ที่เป็น NOT NULL
INSERT INTO tbl_fitness (
  fit_name,
  fit_user,
  fit_price,
  fit_image,
  fit_address,
  fit_contact,
  fit_dateclose,
  fit_dateopen,
  fit_location,
  fit_moredetails,
  fit_phone,
  fit_image2,
  fit_image3,
  fit_image4,
  fit_price_memberm,
  fit_price_membery,
  partner_bank_account,
  partner_bank_name,
  partner_account_name,
  partner_promptpay_id,
  revenue_split_percentage,
  created_at,
  updated_at
) VALUES 
  (
    'PJ Fitness Center สาขาสีลม',
    'somchai.fitness@demo.com',
    '150 บาท/วัน',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    '123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
    'สมชาย ฟิตเนส',
    '22:00',
    '06:00',
    'สีลม กรุงเทพฯ',
    'ฟิตเนสครบครันในใจกลางเมือง พร้อมอุปกรณ์ทันสมัยและเทรนเนอร์มืออาชีพ',
    '02-234-5678',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
    'https://images.unsplash.com/photo-1583500178690-a863824c5c0e?w=800&q=80',
    2500.00,
    25000.00,
    '1234567890',
    'ธนาคารกสิกรไทย',
    'สมชาย ฟิตเนส',
    '0812345678',
    80.00,
    NOW(),
    NOW()
  ),
  (
    'Healthy Life Gym อารีย์',
    'somying.healthy@demo.com',
    '120 บาท/วัน',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    '456 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400',
    'สมหญิง เฮลท์ตี้',
    '23:00',
    '05:30',
    'อารีย์ กรุงเทพฯ',
    'ฟิตเนสสำหรับคนรักสุขภาพ บรรยากาศอบอุ่น เน้นการออกกำลังกายเพื่อสุขภาพ',
    '02-345-6789',
    'https://images.unsplash.com/photo-1517438984742-1262db08379e?w=800&q=80',
    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',
    'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',
    2200.00,
    22000.00,
    '2345678901',
    'ธนาคารไทยพาณิชย์',
    'สมหญิง เฮลท์ตี้',
    '0823456789',
    75.00,
    NOW(),
    NOW()
  ),
  (
    'Champion Sport Club',
    'piya.sport@demo.com',
    '200 บาท/วัน',
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
    '789 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110',
    'ปิยะ สปอร์ต',
    '24:00',
    '06:00',
    'สุขุมวิท กรุงเทพฯ',
    'สโมสรกีฬาครบวงจร มีสระว่ายน้ำ คอร์สต่างๆ และพื้นที่กิจกรรมกลุ่ม',
    '02-456-7890',
    'https://images.unsplash.com/photo-1571390772942-3d0c2a7bf9a6?w=800&q=80',
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
    'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800&q=80',
    3000.00,
    30000.00,
    '3456789012',
    'ธนาคารกรุงเทพ',
    'ปิยะ สปอร์ต',
    '0834567890',
    85.00,
    NOW(),
    NOW()
  );

-- 3. สร้างข้อมูลอุปกรณ์ฟิตเนส
-- ใช้ fit_id จริงที่ถูกสร้างจาก tbl_fitness แทนการใช้ hard-coded numbers
INSERT INTO tbl_equipment (
  em_name,
  em_image,
  fitness_id,
  created_at,
  updated_at
) VALUES 
  -- อุปกรณ์สำหรับ PJ Fitness Center สาขาสีลม
  (
    'ลู่วิ่งไฟฟ้า Commercial Grade',
    'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'PJ Fitness Center สาขาสีลม'),
    NOW(),
    NOW()
  ),
  (
    'เครื่องจักรยานนั่งปั่น',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'PJ Fitness Center สาขาสีลม'),
    NOW(),
    NOW()
  ),
  (
    'เครื่องดันทรวงอก',
    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'PJ Fitness Center สาขาสีลม'),
    NOW(),
    NOW()
  ),
  (
    'ชุดดัมเบล Complete Set',
    'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'PJ Fitness Center สาขาสีลม'),
    NOW(),
    NOW()
  ),
  
  -- อุปกรณ์สำหรับ Healthy Life Gym อารีย์
  (
    'เครื่องเอลลิปติคัล',
    'https://images.unsplash.com/photo-1517438984742-1262db08379e?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'Healthy Life Gym อารีย์'),
    NOW(),
    NOW()
  ),
  (
    'เครื่องพัลเลย์ปรับระดับ',
    'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'Healthy Life Gym อารีย์'),
    NOW(),
    NOW()
  ),
  (
    'ชุด Kettlebell',
    'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'Healthy Life Gym อารีย์'),
    NOW(),
    NOW()
  ),
  
  -- อุปกรณ์สำหรับ Champion Sport Club
  (
    'Smith Machine Commercial',
    'https://images.unsplash.com/photo-1583500178690-a863824c5c0e?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'Champion Sport Club'),
    NOW(),
    NOW()
  ),
  (
    'Cable Crossover Machine',
    'https://images.unsplash.com/photo-1571390772942-3d0c2a7bf9a6?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'Champion Sport Club'),
    NOW(),
    NOW()
  ),
  (
    'ลู่วิ่งในสระน้ำ',
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=80',
    (SELECT fit_id FROM tbl_fitness WHERE fit_name = 'Champion Sport Club'),
    NOW(),
    NOW()
  );

-- Commit transaction
COMMIT;

-- แสดงสรุปข้อมูลที่สร้าง
SELECT 'สร้างข้อมูลตัวอย่างเสร็จสิ้น!' as status;

SELECT 
  'Owners' as table_name,
  COUNT(*) as record_count
FROM tbl_owner
WHERE owner_email LIKE '%demo%'

UNION ALL

SELECT 
  'Fitness Centers' as table_name,
  COUNT(*) as record_count
FROM tbl_fitness
WHERE fit_user LIKE '%demo%'

UNION ALL

SELECT 
  'Equipment' as table_name,
  COUNT(*) as record_count
FROM tbl_equipment
WHERE fitness_id IN (
  SELECT fit_id FROM tbl_fitness WHERE fit_user LIKE '%demo%'
);