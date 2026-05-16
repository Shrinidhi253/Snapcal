
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-photos', 'lecture-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view lecture photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lecture-photos');

CREATE POLICY "Anyone can upload lecture photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lecture-photos');

CREATE POLICY "Anyone can update lecture photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lecture-photos');

CREATE POLICY "Anyone can delete lecture photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'lecture-photos');
