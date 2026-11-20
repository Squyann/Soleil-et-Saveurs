-- Clés des notifications (VAPID) de l'application de gestion. Créées au
-- premier appel par la fonction serveur « notifications »
-- (supabase/functions/notifications) et lues uniquement par elle, avec la
-- clé de service : aucun accès pour les visiteurs ni les comptes connectés.
-- Appliquée le 20/11/2026.
CREATE TABLE IF NOT EXISTS public.push_cles (
  id         integer PRIMARY KEY CHECK (id = 1),
  publique   text NOT NULL,
  privee     jsonb NOT NULL,
  cree_le    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_cles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_cles FROM PUBLIC, anon, authenticated;
