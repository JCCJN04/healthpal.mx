DROP POLICY IF EXISTS "documents_bucket_read_shared" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_read_access" ON storage.objects;

CREATE POLICY "documents_bucket_read_access" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.owner_id::text = split_part(objects.name, '/', 1)
      AND d.id::text = split_part(objects.name, '/', 2)
  )
);