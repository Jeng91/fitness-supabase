-- Add additional image columns to tbl_fitness table
-- เพิ่มคอลัมน์สำหรับภาพเสริม 3 รูป

-- Check if columns already exist and add them if they don't
DO $$ 
BEGIN 
    -- Add fit_image2 column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tbl_fitness' AND column_name='fit_image2') THEN
        ALTER TABLE public.tbl_fitness ADD COLUMN fit_image2 TEXT;
        RAISE NOTICE 'Added fit_image2 column';
    ELSE
        RAISE NOTICE 'fit_image2 column already exists';
    END IF;

    -- Add fit_image3 column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tbl_fitness' AND column_name='fit_image3') THEN
        ALTER TABLE public.tbl_fitness ADD COLUMN fit_image3 TEXT;
        RAISE NOTICE 'Added fit_image3 column';
    ELSE
        RAISE NOTICE 'fit_image3 column already exists';
    END IF;

    -- Add fit_image4 column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tbl_fitness' AND column_name='fit_image4') THEN
        ALTER TABLE public.tbl_fitness ADD COLUMN fit_image4 TEXT;
        RAISE NOTICE 'Added fit_image4 column';
    ELSE
        RAISE NOTICE 'fit_image4 column already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tbl_fitness' 
AND column_name IN ('fit_image', 'fit_image2', 'fit_image3', 'fit_image4')
ORDER BY column_name;

-- Check current table structure
\d tbl_fitness;