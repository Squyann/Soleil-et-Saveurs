-- FAILLE : quota global par date uniquement, aucun quota par client. Un compte
-- pouvait saturer tous les créneaux (paiement en espèces, aucun engagement).
CREATE OR REPLACE FUNCTION public.limite_commandes_par_client()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_recentes integer;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_recentes FROM commandes
   WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours';
  IF v_recentes >= 5 THEN
    RAISE EXCEPTION 'Limite atteinte : 5 commandes maximum par 24 h. Contactez-nous si besoin.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_limite_commandes_par_client ON public.commandes;
CREATE TRIGGER trg_limite_commandes_par_client
  BEFORE INSERT ON public.commandes
  FOR EACH ROW EXECUTE FUNCTION public.limite_commandes_par_client();
