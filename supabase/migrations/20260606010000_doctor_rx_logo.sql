-- Doctor prescription logo and signature name
ALTER TABLE doctor_profiles
  ADD COLUMN IF NOT EXISTS rx_logo_url       text,
  ADD COLUMN IF NOT EXISTS rx_signature_name text;

-- Storage bucket for doctor logos (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-logos', 'doctor-logos', true, 2097152,
  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "doctor_upload_own_logo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'doctor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "doctor_update_own_logo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'doctor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "doctor_delete_own_logo"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'doctor-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public_read_doctor_logo"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'doctor-logos');
