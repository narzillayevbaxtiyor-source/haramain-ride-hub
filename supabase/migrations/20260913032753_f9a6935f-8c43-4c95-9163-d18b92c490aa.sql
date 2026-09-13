DROP POLICY IF EXISTS vehicle_photos_insert_own ON storage.objects;
CREATE POLICY vehicle_photos_insert_own ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS vehicle_photos_select_own ON storage.objects;
CREATE POLICY vehicle_photos_select_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS vehicle_photos_update_own ON storage.objects;
CREATE POLICY vehicle_photos_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS vehicle_photos_delete_own ON storage.objects;
CREATE POLICY vehicle_photos_delete_own ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);