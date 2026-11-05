-- Diagnostic de sécurité (LECTURE SEULE : ne modifie rien).
-- À lancer dans Supabase → SQL Editor, puis envoyer le résultat (bouton
-- « Export » → CSV, ou copier le tableau).
--
-- Liste, pour les tables du site, les règles d'accès (policies) et les droits
-- accordés aux visiteurs (anon) et aux clients connectés (authenticated),
-- ainsi que les fonctions SECURITY DEFINER qu'ils peuvent appeler.

SELECT 'policy' AS type, tablename AS objet, policyname AS nom,
       cmd AS action, array_to_string(roles, ',') AS roles,
       coalesce(qual, '') AS condition_lecture, coalesce(with_check, '') AS condition_ecriture
  FROM pg_policies
 WHERE schemaname IN ('public', 'storage')

UNION ALL
SELECT 'rls', c.relname, CASE WHEN c.relrowsecurity THEN 'RLS activée' ELSE '⚠️ RLS DÉSACTIVÉE' END,
       '', '', '', ''
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'

UNION ALL
SELECT 'droit_table', table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type), '', '', ''
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
 GROUP BY table_name, grantee

UNION ALL
SELECT 'fonction_definer', p.proname, pg_get_function_identity_arguments(p.oid),
       CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'anon ' ELSE '' END
       || CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'authenticated' ELSE '' END,
       '', '', ''
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef

ORDER BY 1, 2, 3;
