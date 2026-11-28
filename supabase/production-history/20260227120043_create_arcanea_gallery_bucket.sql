-- Production migration 20260227120043_create_arcanea_gallery_bucket on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Create the arcanea-gallery public bucket for gallery images/videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arcanea-gallery',
  'arcanea-gallery',
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can READ (public gallery)
CREATE POLICY "Gallery public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'arcanea-gallery');

-- RLS: authenticated users can UPLOAD to community/ prefix
CREATE POLICY "Gallery community upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'arcanea-gallery'
    AND (storage.foldername(name))[1] = 'community'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- RLS: users can DELETE their own community uploads
CREATE POLICY "Gallery community delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'arcanea-gallery'
    AND (storage.foldername(name))[1] = 'community'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
