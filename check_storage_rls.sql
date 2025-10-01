-- เช็ค Storage RLS Policies สำหรับ fitness-images bucket
-- Check Storage RLS policies for fitness-images bucket

-- เช็ค policies ปัจจุบันของ storage
SELECT 
  bucket_id,
  name,
  allowed_mime_types,
  file_size_limit,
  public
FROM storage.buckets 
WHERE name = 'fitness-images';

-- เช็ค storage policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%fitness%'
ORDER BY policyname;

-- ถ้าไม่มี policies สำหรับ fitness-images ให้สร้างใหม่
-- Create storage policies for fitness-images bucket

-- Policy 1: ทุกคนดูรูปได้
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'fitness-images' );

-- Policy 2: Authenticated users อัพโหลดได้
CREATE POLICY "Authenticated users can upload fitness images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fitness-images' 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Users แก้ไขรูปตัวเองได้
CREATE POLICY "Users can update own fitness images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fitness-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users ลบรูปตัวเองได้
CREATE POLICY "Users can delete own fitness images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fitness-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- แสดงผลลัพธ์
SELECT 'Storage policies created/updated!' as status;