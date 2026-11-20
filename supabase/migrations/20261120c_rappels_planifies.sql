-- Rappels à heure fixe de l'application de gestion (appliqué le 20/11/2026) :
-- toutes les 15 minutes, pg_cron appelle la fonction « notifications »
-- (commandes à confirmer depuis 2 h, résumé du soir à 19 h). La clé secrète
-- est lue dans push_cles à chaque passage : elle n'apparaît pas dans la tâche.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
ALTER TABLE public.push_cles ADD COLUMN IF NOT EXISTS secret_rappels text NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
SELECT cron.schedule('gestion-rappels', '*/15 * * * *', $tache$
  SELECT net.http_post(
    url := 'https://xulbamqareffedcldkuu.supabase.co/functions/v1/notifications',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer <clé publique anon du projet>', 'apikey', '<clé publique anon du projet>',
      'x-rappels', (SELECT secret_rappels FROM public.push_cles WHERE id = 1)),
    body := '{"action":"rappels"}'::jsonb, timeout_milliseconds := 20000);
$tache$);
