-- Facturation : numérotation automatique et factures figées.
--
-- Chaque commande qui passe au statut « livrée » (paiement comptant à la
-- livraison) reçoit une facture : numéro unique FA-AAAA-NNNN, attribué par la
-- base dans une séquence chronologique et continue (sans trou), date
-- d'émission, date de règlement, et copie figée de la commande (client,
-- lignes, remises, frais) avec ses totaux HT / TVA 5,5 % / TTC.
--
-- Les prix du site sont TTC : HT = TTC / 1,055 arrondi au centime, TVA = TTC
-- - HT. Le total TTC de la facture est donc exactement le montant payé.
--
-- Une facture émise ne peut plus être modifiée ni supprimée, même si la
-- commande ou le compte client disparaît (conservation comptable). Le client
-- lit ses factures, l'administrateur les lit toutes ; personne n'écrit dans
-- la table, seule la base le fait.
--
-- Les commandes déjà livrées sont numérotées dans l'ordre de leur livraison ;
-- leur facture mentionne le document « INV-… » qu'elle remplace.
--
-- La vue ventes_journalieres donne par jour et par taux de TVA le nombre de
-- ventes et les totaux HT / TVA / TTC : ce sont les données attendues pour la
-- transmission des ventes aux particuliers (e-reporting).
--
-- Une transaction, relançable. Ne touche ni aux commandes ni à creer_commande.

BEGIN;

CREATE TABLE IF NOT EXISTS public.factures_compteurs (
  annee   integer PRIMARY KEY,
  dernier integer NOT NULL
);
ALTER TABLE public.factures_compteurs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.factures_compteurs FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.factures (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero              text NOT NULL UNIQUE,
  annee               integer NOT NULL,
  sequence            integer NOT NULL,
  commande_id         bigint NOT NULL UNIQUE,
  user_id             uuid,
  date_emission       date NOT NULL,
  date_livraison      date,
  date_reglement      date,
  mode_reglement      text,
  client_nom          text,
  client_adresse      text,
  client_email        text,
  client_telephone    text,
  lignes              jsonb NOT NULL,
  code_promo          text,
  remise_code_pct     integer,
  frais_livraison_ttc numeric(10,2) NOT NULL,
  taux_tva            numeric(4,2) NOT NULL,
  total_ht            numeric(10,2) NOT NULL,
  total_tva           numeric(10,2) NOT NULL,
  total_ttc           numeric(10,2) NOT NULL,
  remplace            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (annee, sequence)
);
CREATE INDEX IF NOT EXISTS factures_user_id_idx ON public.factures (user_id);

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.factures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.factures TO authenticated;

DROP POLICY IF EXISTS "clients voient leurs factures" ON public.factures;
CREATE POLICY "clients voient leurs factures" ON public.factures
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "admin voit toutes les factures" ON public.factures;
CREATE POLICY "admin voit toutes les factures" ON public.factures
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- Émet la facture d'une commande (une seule fois : rappelée, elle rend le
-- numéro déjà attribué). Le compteur de l'année est verrouillé jusqu'à la fin
-- de la transaction : pas de doublon, pas de trou.
CREATE OR REPLACE FUNCTION public.emettre_facture(
  p_commande_id    bigint,
  p_date_reglement date DEFAULT NULL,
  p_remplace       text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_cmd      public.commandes%ROWTYPE;
  v_numero   text;
  v_jour     date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_annee    integer;
  v_seq      integer;
  v_produits numeric;
  v_frais    numeric(10,2);
  v_ttc      numeric(10,2);
  v_ht       numeric(10,2);
  v_taux     numeric(4,2) := 5.5;
BEGIN
  SELECT numero INTO v_numero FROM public.factures WHERE commande_id = p_commande_id;
  IF FOUND THEN RETURN v_numero; END IF;

  SELECT * INTO v_cmd FROM public.commandes WHERE id = p_commande_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable : %', p_commande_id; END IF;

  -- Frais réellement facturés ; repli pour les anciennes commandes
  -- enregistrées sans frais (règle de l'époque : 2,50 € sous 40 € de produits).
  SELECT coalesce(sum((l->>'prixTotalLigne')::numeric), 0) INTO v_produits
    FROM jsonb_array_elements(coalesce(v_cmd.contenu_panier, '[]'::jsonb)) AS l;
  v_frais := coalesce(v_cmd.frais_livraison,
    CASE WHEN v_cmd.adresse_livraison LIKE '%Retrait%' OR v_produits <= 0 OR v_produits >= 40 THEN 0 ELSE 2.50 END);

  v_ttc := round(v_cmd.total::numeric, 2);
  v_ht  := round(v_ttc / (1 + v_taux / 100), 2);

  v_annee := extract(year FROM v_jour)::integer;
  INSERT INTO public.factures_compteurs AS c (annee, dernier) VALUES (v_annee, 1)
    ON CONFLICT (annee) DO UPDATE SET dernier = c.dernier + 1
    RETURNING c.dernier INTO v_seq;
  v_numero := 'FA-' || v_annee || '-' || lpad(v_seq::text, greatest(4, length(v_seq::text)), '0');

  INSERT INTO public.factures (
    numero, annee, sequence, commande_id, user_id,
    date_emission, date_livraison, date_reglement, mode_reglement,
    client_nom, client_adresse, client_email, client_telephone,
    lignes, code_promo, remise_code_pct, frais_livraison_ttc,
    taux_tva, total_ht, total_tva, total_ttc, remplace
  ) VALUES (
    v_numero, v_annee, v_seq, v_cmd.id, v_cmd.user_id,
    v_jour, v_cmd.date_livraison, coalesce(p_date_reglement, v_jour), v_cmd.methode_paiement,
    v_cmd.nom_client, v_cmd.adresse_livraison, v_cmd.email_client, v_cmd.telephone_client,
    coalesce(v_cmd.contenu_panier, '[]'::jsonb), v_cmd.code_promo, v_cmd.remise_code_pct, v_frais,
    v_taux, v_ht, v_ttc - v_ht, v_ttc, p_remplace
  );
  RETURN v_numero;
END;
$function$;
REVOKE ALL ON FUNCTION public.emettre_facture(bigint, date, text) FROM PUBLIC, anon, authenticated;

-- Facture émise dès que la commande est marquée « livrée »
CREATE OR REPLACE FUNCTION public.facturer_commande_livree() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM public.emettre_facture(NEW.id);
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.facturer_commande_livree() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_facture_a_la_livraison ON public.commandes;
CREATE TRIGGER trg_facture_a_la_livraison
  AFTER INSERT OR UPDATE OF statut ON public.commandes
  FOR EACH ROW WHEN (lower(NEW.statut) LIKE 'livr%')
  EXECUTE FUNCTION public.facturer_commande_livree();

-- Une facture émise est définitive
CREATE OR REPLACE FUNCTION public.factures_immuables() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  RAISE EXCEPTION 'Une facture émise ne peut être ni modifiée ni supprimée';
END;
$function$;
REVOKE ALL ON FUNCTION public.factures_immuables() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_factures_immuables ON public.factures;
CREATE TRIGGER trg_factures_immuables
  BEFORE UPDATE OR DELETE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.factures_immuables();

DROP TRIGGER IF EXISTS trg_factures_immuables_vidage ON public.factures;
CREATE TRIGGER trg_factures_immuables_vidage
  BEFORE TRUNCATE ON public.factures
  FOR EACH STATEMENT EXECUTE FUNCTION public.factures_immuables();

-- Ventes par jour et par taux de TVA (données de l'e-reporting)
CREATE OR REPLACE VIEW public.ventes_journalieres WITH (security_invoker = true) AS
SELECT date_emission      AS jour,
       taux_tva,
       count(*)::integer  AS nombre_ventes,
       sum(total_ht)      AS total_ht,
       sum(total_tva)     AS total_tva,
       sum(total_ttc)     AS total_ttc
  FROM public.factures
 GROUP BY date_emission, taux_tva;
REVOKE ALL ON public.ventes_journalieres FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ventes_journalieres TO authenticated;

-- Commandes déjà livrées : numérotées dans l'ordre de leur livraison. Chaque
-- facture rappelle la référence du document remis à l'époque, qu'elle remplace.
DO $reprise$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.id, c.created_at,
           coalesce(c.date_livraison, (c.created_at AT TIME ZONE 'Europe/Paris')::date) AS jour
      FROM public.commandes c
     WHERE lower(c.statut) LIKE 'livr%'
       AND NOT EXISTS (SELECT 1 FROM public.factures f WHERE f.commande_id = c.id)
     ORDER BY 3, c.created_at, c.id
  LOOP
    PERFORM public.emettre_facture(
      r.id, r.jour,
      'INV-' || extract(year FROM r.created_at AT TIME ZONE 'Europe/Paris')::integer || '-' || upper(right(r.id::text, 4))
    );
  END LOOP;
END;
$reprise$;

COMMIT;
