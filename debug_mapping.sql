-- ตรวจสอบความสัมพันธ์ระหว่าง tbl_fitness และ tbl_owner
-- Check relationship between fitness and owner data

SELECT 'Fitness data with user info:' as debug;
SELECT 
  fit_id,
  fit_name,
  fit_user,
  created_by,
  typeof(fit_user) as fit_user_type
FROM tbl_fitness;

SELECT 'Owner data:' as debug;
SELECT 
  owner_uid,
  owner_name,
  owner_email,
  auth_user_id,
  typeof(owner_uid) as owner_uid_type
FROM tbl_owner;

-- Test join to see if any matches
SELECT 'Join test:' as debug;
SELECT 
  f.fit_name,
  f.fit_user,
  o.owner_uid,
  o.owner_name,
  CASE 
    WHEN f.fit_user = o.owner_uid::text THEN 'Match by owner_uid as text'
    WHEN f.fit_user = o.owner_name THEN 'Match by owner_name'
    WHEN f.created_by = o.auth_user_id THEN 'Match by auth_user_id'
    ELSE 'No match'
  END as match_type
FROM tbl_fitness f
CROSS JOIN tbl_owner o;