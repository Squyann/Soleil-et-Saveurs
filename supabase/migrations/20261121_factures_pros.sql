-- Factures, bons de livraison et avoirs pour les professionnels
-- (application de gestion, administrateur et gérant).
--
--  - clients_pro : carnet des clients professionnels.
--  - documents_pro : brouillons modifiables, puis documents émis, définitifs.
--  - Numérotation : les factures pros prennent le numéro suivant de la MÊME
--    suite que les factures du site (factures_compteurs, FA-AAAA-NNNN) ; les
--    bons (BL-) et les avoirs (AV-) ont chacun leur suite.
--  - Un document émis ne se modifie plus et ne se supprime pas : seul son
--    règlement (date, mode) et sa date d'envoi peuvent être renseignés.
--  - Les montants sont calculés par la base à l'émission (prix saisis HT,
--    TVA 5,5 %, arrondi au centime par ligne).
--
-- Une transaction, relançable. Aucune donnée existante n'est modifiée.

BEGIN;

CREATE TABLE IF NOT EXISTS public.clients_pro (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raison_sociale      text NOT NULL CHECK (length(btrim(raison_sociale)) BETWEEN 1 AND 160),
  siren               text CHECK (siren ~ '^[0-9]{9}$'),
  tva                 text CHECK (tva ~ '^[A-Z]{2}[0-9A-Z]{2,13}$'),
  adresse_facturation text NOT NULL CHECK (length(btrim(adresse_facturation)) BETWEEN 1 AND 300),
  adresse_livraison   text CHECK (length(adresse_livraison) <= 300),
  email               text CHECK (length(email) <= 200 AND email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  telephone           text CHECK (length(telephone) <= 40),
  notes               text CHECK (length(notes) <= 1000),
  actif               boolean NOT NULL DEFAULT true,
  cree_le             timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients_pro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clients_pro FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients_pro TO authenticated;
DROP POLICY IF EXISTS clients_pro_equipe ON public.clients_pro;
CREATE POLICY clients_pro_equipe ON public.clients_pro FOR ALL TO authenticated
  USING ((SELECT public.peut('clients'))) WITH CHECK ((SELECT public.peut('clients')));
DROP TRIGGER IF EXISTS trg_clients_pro_updated_at ON public.clients_pro;
CREATE TRIGGER trg_clients_pro_updated_at BEFORE UPDATE ON public.clients_pro
  FOR EACH ROW EXECUTE FUNCTION public.maj_updated_at();

-- Suites des bons (BL) et avoirs (AV) ; les factures utilisent factures_compteurs
CREATE TABLE IF NOT EXISTS public.compteurs_pro (
  prefixe text NOT NULL CHECK (prefixe IN ('BL', 'AV')),
  annee   integer NOT NULL,
  dernier integer NOT NULL,
  PRIMARY KEY (prefixe, annee)
);
ALTER TABLE public.compteurs_pro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.compteurs_pro FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.documents_pro (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              text NOT NULL CHECK (type IN ('facture', 'bon', 'avoir')),
  statut            text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'emis')),
  client_id         uuid REFERENCES public.clients_pro(id) ON DELETE RESTRICT,
  client            jsonb,
  lignes            jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(lignes) = 'array' AND jsonb_array_length(lignes) <= 200),
  date_livraison    date,
  adresse_livraison text CHECK (length(adresse_livraison) <= 300),
  delai_jours       integer NOT NULL DEFAULT 30 CHECK (delai_jours BETWEEN 0 AND 60),
  notes             text CHECK (length(notes) <= 1000),
  avoir_de          uuid REFERENCES public.documents_pro(id) ON DELETE RESTRICT,
  numero            text UNIQUE,
  annee             integer,
  sequence          integer,
  date_emission     date,
  date_echeance     date,
  taux_tva          numeric(4,2) NOT NULL DEFAULT 5.5,
  total_ht          numeric(12,2),
  total_tva         numeric(12,2),
  total_ttc         numeric(12,2),
  date_reglement    date,
  mode_reglement    text CHECK (mode_reglement IN ('virement', 'carte', 'especes', 'cheque')),
  jeton             uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  envoye_le         timestamptz,
  cree_par          uuid DEFAULT auth.uid(),
  cree_le           timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_pro_liste ON public.documents_pro (statut, date_emission DESC, cree_le DESC);
CREATE INDEX IF NOT EXISTS documents_pro_client ON public.documents_pro (client_id);
ALTER TABLE public.documents_pro ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documents_pro FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents_pro TO authenticated;
DROP POLICY IF EXISTS documents_pro_equipe ON public.documents_pro;
CREATE POLICY documents_pro_equipe ON public.documents_pro FOR ALL TO authenticated
  USING ((SELECT public.peut('clients'))) WITH CHECK ((SELECT public.peut('clients')));

-- Protection : un brouillon ne porte ni numéro ni montants ; un document émis
-- est figé (seuls règlement et date d'envoi changent) et ne se supprime pas.
CREATE OR REPLACE FUNCTION public.documents_pro_protection()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  libres text[] := ARRAY['date_reglement', 'mode_reglement', 'envoye_le', 'updated_at'];
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.statut = 'emis' THEN RAISE EXCEPTION 'Document émis : il ne peut pas être supprimé (faites un avoir)'; END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'emis' THEN
    IF (to_jsonb(NEW) - libres) IS DISTINCT FROM (to_jsonb(OLD) - libres) THEN
      RAISE EXCEPTION 'Document émis : il ne peut plus être modifié (faites un avoir)';
    END IF;
    IF NEW.type <> 'facture' AND (NEW.date_reglement IS NOT NULL OR NEW.mode_reglement IS NOT NULL) THEN
      RAISE EXCEPTION 'Seule une facture se règle';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  -- Brouillon (création ou modification) : émission uniquement par emettre_document_pro
  IF NEW.statut = 'emis' AND coalesce(current_setting('app.emission_document_pro', true), '') <> 'oui' THEN
    RAISE EXCEPTION 'Utilisez « Émettre » pour émettre un document';
  END IF;
  IF NEW.statut = 'brouillon' THEN
    NEW.numero := NULL; NEW.annee := NULL; NEW.sequence := NULL; NEW.client := NULL;
    NEW.date_emission := NULL; NEW.date_echeance := NULL;
    NEW.total_ht := NULL; NEW.total_tva := NULL; NEW.total_ttc := NULL;
    NEW.date_reglement := NULL; NEW.mode_reglement := NULL; NEW.envoye_le := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_documents_pro_protection ON public.documents_pro;
CREATE TRIGGER trg_documents_pro_protection BEFORE INSERT OR UPDATE OR DELETE ON public.documents_pro
  FOR EACH ROW EXECUTE FUNCTION public.documents_pro_protection();

-- Émission : vérifie le document, calcule les montants, attribue le numéro
-- suivant et fige le document. Renvoie {ok, numero} ou {ok:false, conflit}.
CREATE OR REPLACE FUNCTION public.emettre_document_pro(p_id uuid, p_version timestamptz)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  d public.documents_pro%ROWTYPE;
  c public.clients_pro%ROWTYPE;
  origine public.documents_pro%ROWTYPE;
  v_jour date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_annee integer;
  v_seq integer;
  v_numero text;
  v_lignes jsonb;
  v_ht numeric(12,2);
  v_tva numeric(12,2);
  l jsonb;
  v_prefixe text;
BEGIN
  IF NOT public.peut('clients') THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  SELECT * INTO d FROM public.documents_pro WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document introuvable'; END IF;
  IF d.statut = 'emis' THEN RETURN jsonb_build_object('ok', false, 'deja', true, 'numero', d.numero); END IF;
  IF d.updated_at IS DISTINCT FROM p_version THEN
    RETURN jsonb_build_object('ok', false, 'conflit', true, 'updated_at', d.updated_at);
  END IF;

  SELECT * INTO c FROM public.clients_pro WHERE id = d.client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choisissez le client'; END IF;
  IF d.type IN ('facture', 'avoir') AND c.siren IS NULL THEN
    RAISE EXCEPTION 'SIREN du client obligatoire sur une facture entre professionnels';
  END IF;
  IF jsonb_array_length(d.lignes) = 0 THEN RAISE EXCEPTION 'Ajoutez au moins une ligne'; END IF;

  -- Lignes vérifiées et total HT de chaque ligne, arrondi au centime
  FOR l IN SELECT * FROM jsonb_array_elements(d.lignes) LOOP
    IF coalesce(btrim(l ->> 'designation'), '') = '' OR length(l ->> 'designation') > 200 THEN RAISE EXCEPTION 'Désignation manquante ou trop longue'; END IF;
    IF coalesce((l ->> 'quantite')::numeric, 0) <= 0 OR (l ->> 'quantite')::numeric > 1000000 THEN RAISE EXCEPTION 'Quantité invalide : %', l ->> 'designation'; END IF;
    IF d.type <> 'bon' AND (coalesce((l ->> 'prix_ht')::numeric, -1) < 0 OR (l ->> 'prix_ht')::numeric > 100000) THEN RAISE EXCEPTION 'Prix invalide : %', l ->> 'designation'; END IF;
    IF coalesce((l ->> 'remise_pct')::numeric, 0) NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Remise invalide : %', l ->> 'designation'; END IF;
  END LOOP;

  IF d.type = 'bon' THEN
    v_lignes := d.lignes;
  ELSE
    SELECT jsonb_agg(x.ligne || jsonb_build_object('total_ht',
             round((x.ligne ->> 'quantite')::numeric * (x.ligne ->> 'prix_ht')::numeric * (1 - coalesce((x.ligne ->> 'remise_pct')::numeric, 0) / 100), 2))
           ORDER BY x.n)
      INTO v_lignes
      FROM jsonb_array_elements(d.lignes) WITH ORDINALITY AS x(ligne, n);
    SELECT sum((x ->> 'total_ht')::numeric) INTO v_ht FROM jsonb_array_elements(v_lignes) AS x;
    v_tva := round(v_ht * d.taux_tva / 100, 2);
  END IF;

  IF d.type = 'avoir' THEN
    SELECT * INTO origine FROM public.documents_pro WHERE id = d.avoir_de;
    IF NOT FOUND OR origine.type <> 'facture' OR origine.statut <> 'emis' THEN RAISE EXCEPTION 'Un avoir doit se rapporter à une facture émise'; END IF;
    IF origine.client_id IS DISTINCT FROM d.client_id THEN RAISE EXCEPTION 'L''avoir doit être au nom du client de la facture'; END IF;
    IF v_ht + v_tva > origine.total_ttc THEN RAISE EXCEPTION 'L''avoir dépasse le montant de la facture'; END IF;
  END IF;

  -- Numéro suivant : même suite que les factures du site pour les factures
  v_annee := extract(year FROM v_jour)::integer;
  IF d.type = 'facture' THEN
    INSERT INTO public.factures_compteurs AS k (annee, dernier) VALUES (v_annee, 1)
      ON CONFLICT (annee) DO UPDATE SET dernier = k.dernier + 1
      RETURNING k.dernier INTO v_seq;
    v_prefixe := 'FA';
  ELSE
    v_prefixe := CASE d.type WHEN 'bon' THEN 'BL' ELSE 'AV' END;
    INSERT INTO public.compteurs_pro AS k (prefixe, annee, dernier) VALUES (v_prefixe, v_annee, 1)
      ON CONFLICT (prefixe, annee) DO UPDATE SET dernier = k.dernier + 1
      RETURNING k.dernier INTO v_seq;
  END IF;
  v_numero := v_prefixe || '-' || v_annee || '-' || lpad(v_seq::text, greatest(4, length(v_seq::text)), '0');

  PERFORM set_config('app.emission_document_pro', 'oui', true);
  UPDATE public.documents_pro SET
    statut = 'emis',
    numero = v_numero, annee = v_annee, sequence = v_seq,
    client = jsonb_build_object('raison_sociale', c.raison_sociale, 'siren', c.siren, 'tva', c.tva,
      'adresse_facturation', c.adresse_facturation, 'email', c.email, 'telephone', c.telephone),
    adresse_livraison = coalesce(nullif(btrim(d.adresse_livraison), ''), c.adresse_livraison),
    lignes = v_lignes,
    date_emission = v_jour,
    date_echeance = CASE WHEN d.type = 'facture' THEN v_jour + d.delai_jours END,
    total_ht = v_ht, total_tva = v_tva, total_ttc = v_ht + v_tva
  WHERE id = p_id;
  PERFORM set_config('app.emission_document_pro', '', true);

  RETURN jsonb_build_object('ok', true, 'numero', v_numero);
END;
$function$;
REVOKE ALL ON FUNCTION public.emettre_document_pro(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emettre_document_pro(uuid, timestamptz) TO authenticated;

-- Lien envoyé au client : le document émis, lisible avec son jeton secret
CREATE OR REPLACE FUNCTION public.document_pro_public(p_jeton uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT to_jsonb(d) - 'jeton' - 'cree_par' - 'client_id' - 'notes'
         || jsonb_build_object('avoir_de_numero', (SELECT o.numero FROM public.documents_pro o WHERE o.id = d.avoir_de))
    FROM public.documents_pro d
   WHERE d.jeton = p_jeton AND d.statut = 'emis';
$function$;
REVOKE ALL ON FUNCTION public.document_pro_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.document_pro_public(uuid) TO anon, authenticated;

COMMIT;
