-- Rubrique Mail : consentement aux offres, désinscription, campagnes et file
-- d'envoi.
--
-- Consentement (RGPD, règles CNIL de la prospection par e-mail) :
--   preferences_mail     : choix actuel de chaque client (offres oui / non) et
--                          jeton secret de son lien de désinscription ;
--   consentements_mail   : journal daté de chaque choix (inscription, Mon
--                          compte, lien de désinscription, réabonnement,
--                          plainte), conservé comme preuve.
-- Les comptes existants reprennent la case cochée (ou non) à leur inscription,
-- datée du jour de l'inscription.
--
-- Campagnes : brouillon → programmée → en cours → envoyée (ou annulée). Les
-- destinataires sont figés au départ de l'envoi puis revérifiés lot par lot
-- (désinscription ou adresse en erreur entre-temps : exclus). Une adresse ne
-- peut figurer qu'une fois par campagne. Les offres ne partent qu'aux clients
-- qui les acceptent ; les informations de service à tous les clients dont
-- l'adresse est confirmée. Les adresses en erreur ou ayant signalé un
-- indésirable ne reçoivent plus rien.
--
-- L'envoi lui-même est fait par le site (/api/mail/traiter, prestataire
-- Resend) : soit par l'administrateur connecté, soit par une tâche planifiée
-- munie de la clé de traitement (table mail_reglages, lisible par personne).
--
-- Une transaction, relançable. Ne touche à aucune donnée existante.

BEGIN;

-- --- Consentement -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.preferences_mail (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  accepte_offres  boolean NOT NULL DEFAULT false,
  jeton           uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  maj_le          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.preferences_mail ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preferences_mail FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.consentements_mail (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  accepte     boolean NOT NULL,
  source      text NOT NULL CHECK (source IN ('inscription', 'mon_compte', 'lien_desinscription', 'reabonnement', 'plainte')),
  campagne_id uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consentements_mail_user_idx ON public.consentements_mail (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS consentements_mail_campagne_idx ON public.consentements_mail (campagne_id) WHERE campagne_id IS NOT NULL;
ALTER TABLE public.consentements_mail ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consentements_mail FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.consentements_mail TO authenticated;
DROP POLICY IF EXISTS "admin lit les consentements" ON public.consentements_mail;
CREATE POLICY "admin lit les consentements" ON public.consentements_mail
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

CREATE TABLE IF NOT EXISTS public.adresses_bloquees (
  email      text PRIMARY KEY,
  raison     text NOT NULL CHECK (raison IN ('rebond', 'plainte', 'manuel')),
  details    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adresses_bloquees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.adresses_bloquees FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.adresses_bloquees TO authenticated;
DROP POLICY IF EXISTS "admin lit les adresses bloquees" ON public.adresses_bloquees;
CREATE POLICY "admin lit les adresses bloquees" ON public.adresses_bloquees
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- Enregistre un choix (préférence actuelle + journal)
CREATE OR REPLACE FUNCTION public.enregistrer_consentement_mail(p_uid uuid, p_accepte boolean, p_source text, p_campagne uuid DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.preferences_mail AS p (user_id, accepte_offres, maj_le)
  VALUES (p_uid, p_accepte, now())
  ON CONFLICT (user_id) DO UPDATE SET accepte_offres = p_accepte, maj_le = now();
  INSERT INTO public.consentements_mail (user_id, email, accepte, source, campagne_id)
  SELECT p_uid, u.email, p_accepte, p_source, p_campagne FROM auth.users u WHERE u.id = p_uid;
END;
$function$;
REVOKE ALL ON FUNCTION public.enregistrer_consentement_mail(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;

-- Nouveau compte : la case « Je souhaite recevoir les offres » de l'inscription
CREATE OR REPLACE FUNCTION public.consentement_a_l_inscription() RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF coalesce(NEW.raw_app_meta_data ->> 'role', '') <> 'admin' THEN
    PERFORM public.enregistrer_consentement_mail(
      NEW.id, coalesce(NEW.raw_user_meta_data ->> 'accepts_marketing', 'false') = 'true', 'inscription');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer une inscription : le choix sera repris dans Mon compte
  RAISE WARNING 'consentement_a_l_inscription : %', SQLERRM;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.consentement_a_l_inscription() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_consentement_a_l_inscription ON auth.users;
CREATE TRIGGER trg_consentement_a_l_inscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.consentement_a_l_inscription();

-- Comptes existants : choix fait à l'inscription, daté de l'inscription
INSERT INTO public.preferences_mail (user_id, accepte_offres, maj_le)
SELECT u.id, coalesce(u.raw_user_meta_data ->> 'accepts_marketing', 'false') = 'true', u.created_at
  FROM auth.users u
 WHERE coalesce(u.raw_app_meta_data ->> 'role', '') <> 'admin'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.consentements_mail (user_id, email, accepte, source, created_at)
SELECT u.id, u.email, coalesce(u.raw_user_meta_data ->> 'accepts_marketing', 'false') = 'true', 'inscription', u.created_at
  FROM auth.users u
 WHERE coalesce(u.raw_app_meta_data ->> 'role', '') <> 'admin'
   AND NOT EXISTS (SELECT 1 FROM public.consentements_mail c WHERE c.user_id = u.id);

-- Client connecté : lire et changer son choix (Mon compte)
CREATE OR REPLACE FUNCTION public.mes_preferences_mail()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_p public.preferences_mail%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  SELECT * INTO v_p FROM public.preferences_mail WHERE user_id = v_uid;
  RETURN jsonb_build_object('accepte_offres', coalesce(v_p.accepte_offres, false), 'maj_le', v_p.maj_le);
END;
$function$;
REVOKE ALL ON FUNCTION public.mes_preferences_mail() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mes_preferences_mail() TO authenticated;

CREATE OR REPLACE FUNCTION public.definir_preferences_mail(p_accepte boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_accepte IS NULL THEN RAISE EXCEPTION 'Choix manquant'; END IF;
  IF p_accepte IS DISTINCT FROM (SELECT accepte_offres FROM public.preferences_mail WHERE user_id = v_uid) THEN
    PERFORM public.enregistrer_consentement_mail(v_uid, p_accepte, 'mon_compte');
  END IF;
  RETURN public.mes_preferences_mail();
END;
$function$;
REVOKE ALL ON FUNCTION public.definir_preferences_mail(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_preferences_mail(boolean) TO authenticated;

-- Lien de désinscription (sans connexion) : le jeton secret identifie le client
CREATE OR REPLACE FUNCTION public.desinscription_mail(p_jeton uuid, p_campagne uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid;
  v_accepte boolean;
  v_email text;
BEGIN
  SELECT p.user_id, p.accepte_offres, u.email INTO v_uid, v_accepte, v_email
    FROM public.preferences_mail p JOIN auth.users u ON u.id = p.user_id
   WHERE p.jeton = p_jeton;
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF v_accepte THEN
    PERFORM public.enregistrer_consentement_mail(v_uid, false, 'lien_desinscription',
      (SELECT id FROM public.campagnes WHERE id = p_campagne));
  END IF;
  RETURN jsonb_build_object('ok', true,
    'email', left(v_email, 1) || repeat('•', greatest(length(split_part(v_email, '@', 1)) - 1, 2)) || '@' || split_part(v_email, '@', 2));
END;
$function$;

CREATE OR REPLACE FUNCTION public.reabonnement_mail(p_jeton uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid;
BEGIN
  SELECT user_id INTO v_uid FROM public.preferences_mail WHERE jeton = p_jeton;
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  IF NOT (SELECT accepte_offres FROM public.preferences_mail WHERE user_id = v_uid) THEN
    PERFORM public.enregistrer_consentement_mail(v_uid, true, 'reabonnement');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- --- Campagnes --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campagnes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objet            text NOT NULL DEFAULT '',
  apercu           text NOT NULL DEFAULT '',
  expediteur_nom   text NOT NULL DEFAULT 'Soleil et Saveurs',
  expediteur_local text NOT NULL DEFAULT 'bonjour',
  type             text NOT NULL DEFAULT 'offre' CHECK (type IN ('offre', 'info')),
  blocs            jsonb NOT NULL DEFAULT '[]'::jsonb,
  statut           text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'programmee', 'en_cours', 'envoyee', 'annulee')),
  programmee_pour  timestamptz,
  lancee_le        timestamptz,
  terminee_le      timestamptz,
  nb_destinataires integer,
  test_envoye_le   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campagnes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campagnes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campagnes TO authenticated;
DROP POLICY IF EXISTS "admin lit les campagnes" ON public.campagnes;
CREATE POLICY "admin lit les campagnes" ON public.campagnes
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
DROP POLICY IF EXISTS "admin cree une campagne" ON public.campagnes;
CREATE POLICY "admin cree une campagne" ON public.campagnes
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()) AND statut = 'brouillon');
-- Seul un brouillon se modifie ou se supprime ; le reste passe par les fonctions
DROP POLICY IF EXISTS "admin modifie un brouillon" ON public.campagnes;
CREATE POLICY "admin modifie un brouillon" ON public.campagnes
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin()) AND statut = 'brouillon') WITH CHECK ((SELECT public.is_admin()) AND statut = 'brouillon');
DROP POLICY IF EXISTS "admin supprime un brouillon" ON public.campagnes;
CREATE POLICY "admin supprime un brouillon" ON public.campagnes
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()) AND statut = 'brouillon');

CREATE OR REPLACE FUNCTION public.campagnes_horodatage() RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_campagnes_horodatage ON public.campagnes;
CREATE TRIGGER trg_campagnes_horodatage BEFORE UPDATE ON public.campagnes
  FOR EACH ROW EXECUTE FUNCTION public.campagnes_horodatage();

CREATE TABLE IF NOT EXISTS public.campagne_envois (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campagne_id uuid NOT NULL REFERENCES public.campagnes(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email       text NOT NULL,
  statut      text NOT NULL DEFAULT 'a_envoyer' CHECK (statut IN ('a_envoyer', 'envoi', 'envoye', 'delivre', 'echec', 'rebond', 'plainte', 'exclu', 'annule')),
  resend_id   text,
  erreur      text,
  pris_le     timestamptz,
  envoye_le   timestamptz,
  maj_le      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campagne_id, email)
);
CREATE INDEX IF NOT EXISTS campagne_envois_file_idx ON public.campagne_envois (campagne_id, statut);
CREATE INDEX IF NOT EXISTS campagne_envois_resend_idx ON public.campagne_envois (resend_id) WHERE resend_id IS NOT NULL;
ALTER TABLE public.campagne_envois ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campagne_envois FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.campagne_envois TO authenticated;
DROP POLICY IF EXISTS "admin lit les envois" ON public.campagne_envois;
CREATE POLICY "admin lit les envois" ON public.campagne_envois
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- Clé de la tâche planifiée et du webhook du prestataire (lisible par personne)
CREATE TABLE IF NOT EXISTS public.mail_reglages (
  id             integer PRIMARY KEY CHECK (id = 1),
  cle_traitement text
);
ALTER TABLE public.mail_reglages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mail_reglages FROM PUBLIC, anon, authenticated;
INSERT INTO public.mail_reglages (id, cle_traitement) VALUES (1, NULL) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mail_autorise(p_cle text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- coalesce : sans clé enregistrée, la comparaison vaut NULL et doit refuser
  SELECT coalesce(public.is_admin(), false)
      OR coalesce(p_cle IS NOT NULL AND length(p_cle) >= 32
          AND p_cle = (SELECT cle_traitement FROM public.mail_reglages WHERE id = 1), false);
$function$;
REVOKE ALL ON FUNCTION public.mail_autorise(text) FROM PUBLIC, anon, authenticated;

-- Destinataires possibles d'une campagne
CREATE OR REPLACE FUNCTION public.mail_eligibles(p_type text)
 RETURNS TABLE (user_id uuid, email text, prenom text, jeton uuid)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT u.id, lower(u.email), nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''), p.jeton
    FROM auth.users u
    LEFT JOIN public.preferences_mail p ON p.user_id = u.id
   WHERE u.email IS NOT NULL
     AND u.email_confirmed_at IS NOT NULL
     AND coalesce(u.raw_app_meta_data ->> 'role', '') <> 'admin'
     AND NOT EXISTS (SELECT 1 FROM public.adresses_bloquees b WHERE b.email = lower(u.email))
     AND (p_type = 'info' OR coalesce(p.accepte_offres, false));
$function$;
REVOKE ALL ON FUNCTION public.mail_eligibles(text) FROM PUBLIC, anon, authenticated;

-- Chiffres du tableau de bord
CREATE OR REPLACE FUNCTION public.mail_statistiques()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  RETURN jsonb_build_object(
    'inscrits', (SELECT count(*) FROM auth.users WHERE coalesce(raw_app_meta_data ->> 'role', '') <> 'admin'),
    'destinataires_offre', (SELECT count(*) FROM public.mail_eligibles('offre')),
    'destinataires_info', (SELECT count(*) FROM public.mail_eligibles('info')),
    'desinscrits', (SELECT count(*) FROM public.preferences_mail p
                     WHERE NOT p.accepte_offres
                       AND EXISTS (SELECT 1 FROM public.consentements_mail c
                                    WHERE c.user_id = p.user_id AND NOT c.accepte AND c.source <> 'inscription')),
    'bloquees', (SELECT count(*) FROM public.adresses_bloquees)
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.mail_statistiques() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_statistiques() TO authenticated;

-- Historique : chiffres par campagne
CREATE OR REPLACE FUNCTION public.mail_campagnes_bilan()
 RETURNS TABLE (campagne_id uuid, destinataires bigint, envoyes bigint, delivres bigint, echecs bigint, desinscriptions bigint, restants bigint)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  RETURN QUERY
  SELECT c.id,
         count(e.id) FILTER (WHERE e.statut <> 'exclu' AND e.statut <> 'annule'),
         count(e.id) FILTER (WHERE e.statut IN ('envoye', 'delivre', 'rebond', 'plainte')),
         count(e.id) FILTER (WHERE e.statut IN ('delivre', 'plainte')),
         count(e.id) FILTER (WHERE e.statut IN ('echec', 'rebond')),
         (SELECT count(*) FROM public.consentements_mail k WHERE k.campagne_id = c.id AND NOT k.accepte),
         count(e.id) FILTER (WHERE e.statut IN ('a_envoyer', 'envoi'))
    FROM public.campagnes c
    LEFT JOIN public.campagne_envois e ON e.campagne_id = c.id
   GROUP BY c.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.mail_campagnes_bilan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mail_campagnes_bilan() TO authenticated;

-- Programmer l'envoi (maintenant ou plus tard) : confirmation explicite exigée
CREATE OR REPLACE FUNCTION public.programmer_campagne(p_id uuid, p_quand timestamptz, p_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_c public.campagnes%ROWTYPE;
  v_nb integer;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF p_confirmation IS DISTINCT FROM 'ENVOYER' THEN RAISE EXCEPTION 'Confirmation manquante : tapez ENVOYER'; END IF;
  SELECT * INTO v_c FROM public.campagnes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campagne introuvable'; END IF;
  IF v_c.statut <> 'brouillon' THEN RAISE EXCEPTION 'Cette campagne a déjà été programmée ou envoyée'; END IF;
  IF trim(v_c.objet) = '' THEN RAISE EXCEPTION 'Objet manquant'; END IF;
  IF jsonb_array_length(v_c.blocs) = 0 THEN RAISE EXCEPTION 'Contenu vide'; END IF;
  IF p_quand IS NOT NULL AND p_quand > now() + interval '90 days' THEN RAISE EXCEPTION 'Date d''envoi trop lointaine'; END IF;
  SELECT count(*) INTO v_nb FROM public.mail_eligibles(v_c.type);
  IF v_nb = 0 THEN RAISE EXCEPTION 'Aucun destinataire pour ce type de message'; END IF;
  UPDATE public.campagnes
     SET statut = 'programmee', programmee_pour = greatest(coalesce(p_quand, now()), now()), nb_destinataires = v_nb
   WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'destinataires', v_nb);
END;
$function$;
REVOKE ALL ON FUNCTION public.programmer_campagne(uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.programmer_campagne(uuid, timestamptz, text) TO authenticated;

-- Annuler : une campagne programmée redevient un brouillon ; une campagne en
-- cours s'arrête (les e-mails déjà partis ne peuvent pas être rappelés).
CREATE OR REPLACE FUNCTION public.annuler_campagne(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_statut text;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  SELECT statut INTO v_statut FROM public.campagnes WHERE id = p_id FOR UPDATE;
  IF v_statut = 'programmee' THEN
    UPDATE public.campagnes SET statut = 'brouillon', programmee_pour = NULL, nb_destinataires = NULL WHERE id = p_id;
  ELSIF v_statut = 'en_cours' THEN
    UPDATE public.campagne_envois SET statut = 'annule', maj_le = now() WHERE campagne_id = p_id AND statut = 'a_envoyer';
    UPDATE public.campagnes SET statut = 'annulee', terminee_le = now() WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Cette campagne ne peut plus être annulée';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$function$;
REVOKE ALL ON FUNCTION public.annuler_campagne(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.annuler_campagne(uuid) TO authenticated;

-- Prochain lot à envoyer (administrateur ou tâche planifiée munie de la clé).
-- Démarre une campagne programmée arrivée à échéance, réserve jusqu'à
-- p_taille destinataires encore éligibles et termine la campagne quand la
-- file est vide. Un lot réservé depuis plus de 15 minutes sans résultat
-- (envoi interrompu) est repris ; le prestataire écarte les doublons grâce à
-- la clé d'idempotence calculée par le site.
CREATE OR REPLACE FUNCTION public.mail_lot(p_cle text, p_taille integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_c public.campagnes%ROWTYPE;
  v_lot jsonb;
BEGIN
  IF public.mail_autorise(p_cle) IS NOT TRUE THEN RAISE EXCEPTION 'Non autorisé'; END IF;

  SELECT * INTO v_c FROM public.campagnes
   WHERE statut = 'en_cours' OR (statut = 'programmee' AND programmee_pour <= now())
   ORDER BY (statut = 'en_cours') DESC, programmee_pour, created_at
   LIMIT 1
   FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN jsonb_build_object('campagne', NULL); END IF;

  IF v_c.statut = 'programmee' THEN
    INSERT INTO public.campagne_envois (campagne_id, user_id, email)
    SELECT v_c.id, e.user_id, e.email FROM public.mail_eligibles(v_c.type) e
    ON CONFLICT (campagne_id, email) DO NOTHING;
    UPDATE public.campagnes
       SET statut = 'en_cours', lancee_le = now(),
           nb_destinataires = (SELECT count(*) FROM public.campagne_envois WHERE campagne_id = v_c.id)
     WHERE id = v_c.id
     RETURNING * INTO v_c;
  END IF;

  -- Revérification : désinscrit ou adresse bloquée depuis le départ → exclu
  UPDATE public.campagne_envois e SET statut = 'exclu', maj_le = now()
   WHERE e.campagne_id = v_c.id AND e.statut = 'a_envoyer'
     AND NOT EXISTS (SELECT 1 FROM public.mail_eligibles(v_c.type) x WHERE x.email = e.email);

  WITH choisis AS (
    SELECT e.id FROM public.campagne_envois e
     WHERE e.campagne_id = v_c.id
       AND (e.statut = 'a_envoyer' OR (e.statut = 'envoi' AND e.pris_le < now() - interval '15 minutes'))
     ORDER BY e.id
     LIMIT greatest(least(coalesce(p_taille, 100), 100), 1)
     FOR UPDATE SKIP LOCKED
  ), pris AS (
    UPDATE public.campagne_envois e SET statut = 'envoi', pris_le = now(), maj_le = now()
      FROM choisis WHERE e.id = choisis.id
    RETURNING e.id, e.email, e.user_id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'envoi_id', pris.id, 'email', pris.email,
           'prenom', nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
           'jeton', p.jeton) ORDER BY pris.id), '[]'::jsonb)
    INTO v_lot
    FROM pris
    LEFT JOIN auth.users u ON u.id = pris.user_id
    LEFT JOIN public.preferences_mail p ON p.user_id = pris.user_id;

  IF jsonb_array_length(v_lot) = 0
     AND NOT EXISTS (SELECT 1 FROM public.campagne_envois WHERE campagne_id = v_c.id AND statut IN ('a_envoyer', 'envoi')) THEN
    UPDATE public.campagnes SET statut = 'envoyee', terminee_le = now() WHERE id = v_c.id;
  END IF;

  RETURN jsonb_build_object(
    'campagne', jsonb_build_object('id', v_c.id, 'objet', v_c.objet, 'apercu', v_c.apercu, 'type', v_c.type,
      'expediteur_nom', v_c.expediteur_nom, 'expediteur_local', v_c.expediteur_local, 'blocs', v_c.blocs),
    'destinataires', v_lot,
    'restants', (SELECT count(*) FROM public.campagne_envois WHERE campagne_id = v_c.id AND statut = 'a_envoyer')
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.mail_lot(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mail_lot(text, integer) TO anon, authenticated;

-- Résultat d'un lot : [{envoi_id, ok, resend_id, erreur, reprendre}]
CREATE OR REPLACE FUNCTION public.mail_resultats(p_cle text, p_resultats jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  r jsonb;
BEGIN
  IF public.mail_autorise(p_cle) IS NOT TRUE THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_resultats, '[]'::jsonb)) LOOP
    UPDATE public.campagne_envois SET
      statut = CASE WHEN coalesce((r->>'reprendre')::boolean, false) THEN 'a_envoyer'
                    WHEN (r->>'ok')::boolean THEN 'envoye' ELSE 'echec' END,
      resend_id = coalesce(r->>'resend_id', resend_id),
      erreur = left(r->>'erreur', 500),
      envoye_le = CASE WHEN (r->>'ok')::boolean THEN now() ELSE envoye_le END,
      pris_le = NULL,
      maj_le = now()
     WHERE id = (r->>'envoi_id')::bigint AND statut = 'envoi';
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.mail_resultats(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mail_resultats(text, jsonb) TO anon, authenticated;

-- Événements du prestataire (webhook) : délivré, rebond, plainte
CREATE OR REPLACE FUNCTION public.mail_evenement(p_cle text, p_type text, p_resend_id text, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_uid uuid;
BEGIN
  IF public.mail_autorise(p_cle) IS NOT TRUE THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF p_type = 'email.delivered' THEN
    UPDATE public.campagne_envois SET statut = 'delivre', maj_le = now()
     WHERE resend_id = p_resend_id AND statut IN ('envoye', 'envoi');
  ELSIF p_type = 'email.bounced' THEN
    UPDATE public.campagne_envois SET statut = 'rebond', maj_le = now() WHERE resend_id = p_resend_id;
    IF v_email <> '' THEN
      INSERT INTO public.adresses_bloquees (email, raison) VALUES (v_email, 'rebond') ON CONFLICT (email) DO NOTHING;
    END IF;
  ELSIF p_type = 'email.complained' THEN
    UPDATE public.campagne_envois SET statut = 'plainte', maj_le = now() WHERE resend_id = p_resend_id;
    IF v_email <> '' THEN
      INSERT INTO public.adresses_bloquees (email, raison) VALUES (v_email, 'plainte')
        ON CONFLICT (email) DO UPDATE SET raison = 'plainte';
      SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;
      IF v_uid IS NOT NULL AND coalesce((SELECT accepte_offres FROM public.preferences_mail WHERE user_id = v_uid), false) THEN
        PERFORM public.enregistrer_consentement_mail(v_uid, false, 'plainte',
          (SELECT campagne_id FROM public.campagne_envois WHERE resend_id = p_resend_id LIMIT 1));
      END IF;
    END IF;
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.mail_evenement(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mail_evenement(text, text, text, text) TO anon, authenticated;

-- Fonctions des liens de désinscription, ouvertes sans connexion
REVOKE ALL ON FUNCTION public.desinscription_mail(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desinscription_mail(uuid, uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.reabonnement_mail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reabonnement_mail(uuid) TO anon, authenticated;

COMMIT;
