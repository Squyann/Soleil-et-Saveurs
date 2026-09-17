-- FAILLE : tout utilisateur authentifié pouvait déposer n'importe quel fichier
-- dans le bucket PUBLIC "produits-images" (hébergement de phishing, coût).
DROP POLICY IF EXISTS "Give anon users access to JPG images in folder uop2nv_0" ON storage.objects;

CREATE POLICY produits_images_insert_admin ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produits-images' AND public.is_admin());
CREATE POLICY produits_images_update_admin ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'produits-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'produits-images' AND public.is_admin());
CREATE POLICY produits_images_delete_admin ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'produits-images' AND public.is_admin());

UPDATE storage.buckets
   SET file_size_limit = 5242880,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif']
 WHERE id = 'produits-images';
