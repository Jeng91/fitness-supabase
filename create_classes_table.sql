-- Create tbl_classes table for fitness classes
CREATE TABLE IF NOT EXISTS public.tbl_classes (
    class_id SERIAL PRIMARY KEY,
    fit_id INTEGER REFERENCES public.tbl_fitness(fit_id) ON DELETE CASCADE,
    class_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    class_time TIME,
    duration INTEGER DEFAULT 60, -- ระยะเวลาเป็นนาที
    instructor VARCHAR(255),
    max_participants INTEGER DEFAULT 10,
    price DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_classes_fit_id ON public.tbl_classes(fit_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.tbl_classes(status);

-- Enable RLS
ALTER TABLE public.tbl_classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.tbl_classes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.tbl_classes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for fitness owners" ON public.tbl_classes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.tbl_fitness f
            JOIN public.tbl_owner o ON f.fit_user = o.owner_name
            WHERE f.fit_id = tbl_classes.fit_id
            AND o.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Enable delete for fitness owners" ON public.tbl_classes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.tbl_fitness f
            JOIN public.tbl_owner o ON f.fit_user = o.owner_name
            WHERE f.fit_id = tbl_classes.fit_id
            AND o.auth_user_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tbl_classes_updated_at 
    BEFORE UPDATE ON public.tbl_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();