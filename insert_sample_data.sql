-- เพิ่มข้อมูลตัวอย่างสำหรับทดสอบ
-- Add sample data for testing

\echo "=== Adding sample owner data ==="

-- เพิ่มข้อมูลเจ้าของฟิตเนส (ใช้ auth_user_id ของผู้ใช้ปัจจุบัน)
INSERT INTO tbl_owner (
    owner_uid,
    owner_name, 
    owner_email,
    auth_user_id,
    created_at,
    updated_at
) VALUES 
    ('owner_001', 'JM Fitness Center', 'jm@fitness.com', auth.uid(), NOW(), NOW()),
    ('owner_002', 'Power Gym', 'info@powergym.com', NULL, NOW(), NOW()),
    ('owner_003', 'Fit Zone', 'contact@fitzone.com', NULL, NOW(), NOW())
ON CONFLICT (owner_uid) DO UPDATE SET
    owner_name = EXCLUDED.owner_name,
    owner_email = EXCLUDED.owner_email,
    updated_at = NOW();

\echo "=== Adding sample fitness data ==="

-- เพิ่มข้อมูลฟิตเนส
INSERT INTO tbl_fitness (
    fit_id,
    fit_name,
    fit_address,
    fit_phone,
    fit_open_time,
    fit_close_time,
    fit_price_per_day,
    fit_user,
    created_by,
    created_at,
    updated_at
) VALUES 
    ('fit_001', 'JM FITNESS', 'กบินทร์บุรี นครราชสีมา', '094-545-1556', '10:00:00', '23:00:00', 60, 'owner_001', auth.uid(), NOW(), NOW()),
    ('fit_002', 'Power Gym Central', 'เซ็นทรัล นครราชสีมา', '081-234-5678', '06:00:00', '22:00:00', 80, 'owner_002', NULL, NOW(), NOW()),
    ('fit_003', 'Fit Zone Premium', 'เทอร์มินอล 21 นครราชสีมา', '089-876-5432', '08:00:00', '24:00:00', 120, 'owner_003', NULL, NOW(), NOW())
ON CONFLICT (fit_id) DO UPDATE SET
    fit_name = EXCLUDED.fit_name,
    fit_address = EXCLUDED.fit_address,
    fit_phone = EXCLUDED.fit_phone,
    updated_at = NOW();

\echo "=== Verify inserted data ==="

-- ตรวจสอบข้อมูลที่เพิ่ม
SELECT COUNT(*) as total_owners FROM tbl_owner;
SELECT COUNT(*) as total_fitness FROM tbl_fitness;

SELECT 'Owner data:' as info;
SELECT owner_uid, owner_name, owner_email FROM tbl_owner;

SELECT 'Fitness data:' as info;
SELECT fit_id, fit_name, fit_address, fit_user FROM tbl_fitness;