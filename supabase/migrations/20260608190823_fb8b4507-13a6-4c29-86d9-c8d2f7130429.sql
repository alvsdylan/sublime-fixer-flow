
CREATE POLICY "Public read repair images" ON storage.objects FOR SELECT USING (bucket_id = 'repair-images');
CREATE POLICY "Public upload repair images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'repair-images');
CREATE POLICY "Public delete repair images" ON storage.objects FOR DELETE USING (bucket_id = 'repair-images');
