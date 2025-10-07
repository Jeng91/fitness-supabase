-- Storage Policies สำหรับ payment-slips bucket
CREATE POLICY "Anyone can view payment slips" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment-slips');

CREATE POLICY "Users can upload payment slips" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'payment-slips' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own payment slips" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'payment-slips' AND auth.uid()::text = (storage.foldername(name))[1]);