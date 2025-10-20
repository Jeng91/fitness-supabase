-- RLS policy: เปิด read สำหรับ user ทุกคน
-- ให้ run ใน Supabase SQL editor

ALTER TABLE public.tbl_owner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all users" ON public.tbl_owner
  FOR SELECT
  USING (true);

-- ตรวจสอบว่าไม่มี policy อื่นที่ block SELECT
-- สามารถแก้ไข/ลบ policy อื่นที่ขัดแย้งได้
