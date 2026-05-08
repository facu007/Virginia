-- ============================================================
-- VIRGINIA OFICIAL | SUPABASE STORAGE
-- Crear bucket publico para las fotos de producto
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS product_images_read ON storage.objects;
DROP POLICY IF EXISTS product_images_insert ON storage.objects;
DROP POLICY IF EXISTS product_images_update ON storage.objects;
DROP POLICY IF EXISTS product_images_delete ON storage.objects;

CREATE POLICY product_images_read ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY product_images_insert ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY product_images_update ON storage.objects
FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY product_images_delete ON storage.objects
FOR DELETE
USING (bucket_id = 'product-images');
