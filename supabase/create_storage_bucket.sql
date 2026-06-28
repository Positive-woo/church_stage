-- Supabase SQL Editor에서 실행하세요.

-- 1. box-images 버킷 생성 (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('box-images', 'box-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 누구나 이미지를 읽을 수 있도록 허용
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'box-images');

-- 3. 누구나 이미지를 업로드할 수 있도록 허용
CREATE POLICY "Public insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'box-images');

-- 4. 누구나 이미지를 삭제할 수 있도록 허용
CREATE POLICY "Public delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'box-images');
