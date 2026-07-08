-- Correctif critique : le stock était décrémenté deux fois par commande —
-- une fois dans creer_commande, une fois par ce trigger hérité. creer_commande
-- gère désormais seul le stock (verrou FOR UPDATE, refus si insuffisant).
-- De plus decrement_stock_on_order gérait mal le stock NULL
-- (GREATEST(NULL - q, 0) = 0), ce qui « épuisait » les produits illimités.
DROP TRIGGER IF EXISTS trigger_decrement_stock ON public.commandes;
