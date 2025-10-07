-- เพิ่มฟิลด์บัญชีพาร์ทเนอร์ใน tbl_fitness
ALTER TABLE public.tbl_fitness 
ADD COLUMN IF NOT EXISTS partner_bank_account VARCHAR(20),
ADD COLUMN IF NOT EXISTS partner_bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS partner_account_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS partner_promptpay_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS revenue_split_percentage DECIMAL(5,2) DEFAULT 80.00; -- พาร์ทเนอร์ได้ 80%, ระบบได้ 20%

-- เพิ่ม Comment สำหรับ columns ใหม่
COMMENT ON COLUMN public.tbl_fitness.partner_bank_account IS 'หมายเลขบัญชีธนาคารของพาร์ทเนอร์';
COMMENT ON COLUMN public.tbl_fitness.partner_bank_name IS 'ชื่อธนาคารของพาร์ทเนอร์';
COMMENT ON COLUMN public.tbl_fitness.partner_account_name IS 'ชื่อบัญชีของพาร์ทเนอร์';
COMMENT ON COLUMN public.tbl_fitness.partner_promptpay_id IS 'PromptPay ID ของพาร์ทเนอร์';
COMMENT ON COLUMN public.tbl_fitness.revenue_split_percentage IS 'เปอร์เซ็นต์รายได้ที่พาร์ทเนอร์จะได้รับ (เช่น 80.00 = 80%)';

-- สร้างตารางสำหรับเก็บข้อมูลการโอนเงินไปพาร์ทเนอร์
CREATE TABLE IF NOT EXISTS public.tbl_partner_transfers (
    transfer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_fitness_id INTEGER NOT NULL REFERENCES public.tbl_fitness(fit_id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(payment_id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    partner_amount DECIMAL(10,2) NOT NULL,
    system_amount DECIMAL(10,2) NOT NULL,
    transfer_status VARCHAR(20) DEFAULT 'pending' CHECK (transfer_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    transfer_date TIMESTAMP WITH TIME ZONE,
    transfer_reference VARCHAR(100),
    partner_bank_account VARCHAR(20),
    partner_bank_name VARCHAR(100),
    partner_account_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่ม indexes สำหรับประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_partner_transfers_fitness_id ON public.tbl_partner_transfers(partner_fitness_id);
CREATE INDEX IF NOT EXISTS idx_partner_transfers_payment_id ON public.tbl_partner_transfers(payment_id);
CREATE INDEX IF NOT EXISTS idx_partner_transfers_status ON public.tbl_partner_transfers(transfer_status);
CREATE INDEX IF NOT EXISTS idx_partner_transfers_date ON public.tbl_partner_transfers(transfer_date);

-- เพิ่ม Comment สำหรับตาราง
COMMENT ON TABLE public.tbl_partner_transfers IS 'ตารางเก็บข้อมูลการโอนเงินไปยังพาร์ทเนอร์';

-- Enable RLS
ALTER TABLE public.tbl_partner_transfers ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policies สำหรับ partner transfers
CREATE POLICY "Enable read access for authenticated users" ON public.tbl_partner_transfers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.tbl_partner_transfers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.tbl_partner_transfers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- อัปเดตข้อมูลตัวอย่างสำหรับฟิตเนสที่มีอยู่
UPDATE public.tbl_fitness 
SET 
    partner_bank_account = '1234567890',
    partner_bank_name = 'ธนาคารกรุงเทพ',
    partner_account_name = 'นายสมชาย ใจดี',
    partner_promptpay_id = '0812345678',
    revenue_split_percentage = 80.00
WHERE fit_id = 1 AND partner_bank_account IS NULL;

-- สร้าง function สำหรับอัปเดต updated_at
CREATE OR REPLACE FUNCTION update_partner_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- สร้าง trigger สำหรับอัปเดต updated_at
DROP TRIGGER IF EXISTS update_partner_transfers_updated_at ON public.tbl_partner_transfers;
CREATE TRIGGER update_partner_transfers_updated_at
    BEFORE UPDATE ON public.tbl_partner_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_transfers_updated_at();

-- แสดงผลลัพธ์
SELECT 
    'Partner bank accounts fields added to tbl_fitness' as result,
    'Partner transfers table created' as status,
    'Sample data updated' as sample_status;