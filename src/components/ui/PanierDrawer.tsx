'use client';
import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, ShoppingBasket, MapPin, CreditCard, Banknote, Phone, Loader2, AlertCircle, LogIn, Gift, ChevronLeft, ChevronRight, Mail, Check, Clock, Minus, Plus, Truck, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { premieresOffertes, libellePremieresOffertes } from '@/lib/promos';
import { calculerPanier, rafraichirPanier } from '@/lib/panier';
import { prochainePromo } from '@/lib/prix';
import { formatPrix, libelleQuantite } from '@/lib/format';
import { messageCode, type EtatCode } from '@/lib/codesPromo';
import { distanceAuRelais, estDansLesYvelines, estVilleRelais, fraisLivraison as calculerFraisLivraison, SEUIL_LIVRAISON_OFFERTE } from '@/lib/livraison';

// Géocode une adresse : distance au relais le plus proche (pour les frais),
// coordonnées, appartenance aux Yvelines (éligibilité) et ville de point relais
// (livraison offerte). Règles dans src/lib/livraison.ts.
async function geocoderAdresse(adresse: string): Promise<{ dist: number; lat: number; lon: number; dansYvelines: boolean; villeRelais: boolean } | null> {
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`);
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) return null;
    const [lon, lat] = feat.geometry.coordinates;
    return { dist: distanceAuRelais(lat, lon), lat, lon, dansYvelines: estDansLesYvelines(feat.properties), villeRelais: estVilleRelais(feat.properties) };
  } catch {
    return null;
  }
}

interface PanierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any; 
}

export default function PanierDrawer({ isOpen, onClose, user: propUser }: PanierDrawerProps) {
  const [user, setUser] = useState<any>(propUser || null);
  const [panier, setPanier] = useState<any[]>([]);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [methodePaiement, setMethodePaiement] = useState<'Espèces' | 'Ligne'>('Espèces');
  const [chargement, setChargement] = useState(false);
  const [distanceValide, setDistanceValide] = useState<boolean | null>(null);
  const [distanceRelais, setDistanceRelais] = useState<number | null>(null);
  // Adresse dans une ville de point relais : livraison offerte
  const [villeRelais, setVilleRelais] = useState(false);
  const [coordsAdresse, setCoordsAdresse] = useState<{ lat: number; lon: number } | null>(null);
  const [dbProfile, setDbProfile] = useState<{ loyalty_points: number; has_referral_discount: boolean; referral_pending: boolean } | null>(null);
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [applyReferral, setApplyReferral] = useState(false);
  const [dateLivraison, setDateLivraison] = useState<string | null>(null);
  const [configCal, setConfigCal] = useState<{ jours_semaine: number[]; max_commandes_par_jour: number } | null>(null);
  const [exceptionsLiv, setExceptionsLiv] = useState<{ date: string; ferme: boolean }[]>([]);
  const [commandesParDate, setCommandesParDate] = useState<Record<string, number>>({});
  const [moisCal, setMoisCal] = useState<{ annee: number; mois: number }>({ annee: new Date().getFullYear(), mois: new Date().getMonth() });
  const [codePromo, setCodePromo] = useState('');
  const [codeStatut, setCodeStatut] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'used'>('idle');
  // Réponse détaillée de la base (limite, dates) pour le message affiché
  const [etatCode, setEtatCode] = useState<EtatCode>({});
  const [remiseCode, setRemiseCode] = useState(0);
  const [codePromoId, setCodePromoId] = useState<string | null>(null);
  const [commentaireClient, setCommentaireClient] = useState('');
  const [confirmation, setConfirmation] = useState<{ id: number; total: number; date: string | null } | null>(null);
  // Étape affichée : 1 = le panier, 2 = livraison et paiement (la confirmation suit)
  const [etape, setEtape] = useState<1 | 2>(1);

  const router = useRouter();

  useEffect(() => {
    if (propUser) setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    const fetchUserData = async () => {
      let currentUser = user;

      if (!currentUser) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser) {
          setUser(supabaseUser);
          currentUser = supabaseUser;
        }
      }

      if (currentUser) {
        const meta = currentUser.user_metadata || {};
        setNom(meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim());
        setTelephone(meta.phone || '');
        if (meta.address) {
          setAdresse(meta.address);
          geocoderAdresse(meta.address).then(r => {
            if (r) {
              setDistanceValide(r.dansYvelines);
              setDistanceRelais(r.dist);
              setVilleRelais(r.villeRelais);
              setCoordsAdresse({ lat: r.lat, lon: r.lon });
            } else {
              setDistanceValide(null);
            }
          });
        }

        const { data: prof } = await supabase
          .from('profiles')
          .select('loyalty_points, has_referral_discount, referral_pending')
          .eq('user_id', currentUser.id)
          .single();
        if (prof) setDbProfile(prof);
      }
    };

    if (isOpen) {
      setConfirmation(null);
      setEtape(1);
      setApplyLoyalty(false);
      setApplyReferral(false);
      setDateLivraison(null);
      setCodePromo('');
      setCodeStatut('idle');
      setRemiseCode(0);
      setCodePromoId(null);
      fetchUserData();
      // Charger la config calendrier
      supabase.from('config_calendrier').select('jours_semaine, max_commandes_par_jour').single().then(({ data }) => {
        if (data) setConfigCal(data);
      });
      supabase.from('dates_livraison_exceptions').select('date, ferme').then(({ data }) => {
        if (data) setExceptionsLiv(data);
      });
      // Compter les commandes par date (60 prochains jours)
      const today = new Date();
      const fin = new Date(); fin.setDate(today.getDate() + 60);
      const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      supabase.from('commandes').select('date_livraison').gte('date_livraison', fmtD(today)).lte('date_livraison', fmtD(fin)).then(({ data }) => {
        if (data) {
          const counts: Record<string, number> = {};
          data.forEach((c: any) => { if (c.date_livraison) counts[c.date_livraison] = (counts[c.date_livraison] ?? 0) + 1; });
          setCommandesParDate(counts);
        }
      });
    }
  }, [isOpen, user]);

  // Prix calculés par produit : les variantes d'un même produit sont additionnées
  // pour les promotions (même calcul que creer_commande côté serveur).
  const calculs = calculerPanier(panier || []);
  const calculerPrixLigne = (item: any) => calculs.ligne(item)?.total ?? 0;
  const calculerEconomieTotale = () => calculs.economie;

  useEffect(() => {
    const loadPanier = () => {
      const saved = localStorage.getItem('mon-panier');
      if (saved) {
        try {
            setPanier(JSON.parse(saved) || []);
        } catch (e) {
            setPanier([]);
        }
      }
    };
    if (isOpen) {
      loadPanier();
      // Prix, promotions, photos et disponibilité à jour depuis la base
      rafraichirPanier(JSON.parse(localStorage.getItem('mon-panier') || '[]') || [])
        .then(frais => {
          setPanier(frais);
          localStorage.setItem('mon-panier', JSON.stringify(frais));
          window.dispatchEvent(new Event('panier-updated'));
        })
        .catch(() => {});
    }
    window.addEventListener('storage', loadPanier);
    return () => window.removeEventListener('storage', loadPanier);
  }, [isOpen]);

  // Quantité maximale d'une ligne : stock propre de la variante, sinon stock du
  // produit moins les autres lignes qui le partagent, sinon illimité.
  const stockMaxLigne = (item: any) => {
    if (item.stock == null) return Infinity;
    if (item.stock_partage === false) return Number(item.stock);
    const autres = (panier || [])
      .filter(i => i.id === item.id && i.stock_partage !== false && (i.variant_id ?? null) !== (item.variant_id ?? null))
      .reduce((s, i) => s + (Number(i.quantite) || 0), 0);
    return Number(item.stock) - autres;
  };

  const updateQuantity = (id: number, delta: number, unite?: string, variantId?: string | null) => {
    const nouveauPanier = (panier || []).map(item => {
      if (item.id === id && (item.variant_id ?? null) === (variantId ?? null)) {
        if (delta === 0) return { ...item, quantite: 0 };
        const step = item.unite === 'kg' ? 0.5 : item.unite === 'g' ? (item.pas_g || 100) : 1;
        const actualDelta = delta > 0 ? step : -step;
        // Stock propre à la variante, ou stock du produit partagé entre ses variantes
        const newQte = Math.min(
          stockMaxLigne(item),
          Math.max(step, parseFloat(((item.quantite || 0) + actualDelta).toFixed(2)))
        );
        return { ...item, quantite: newQte };
      }
      return item;
    }).filter(item => item.quantite > 0);

    setPanier(nouveauPanier);
    localStorage.setItem('mon-panier', JSON.stringify(nouveauPanier));
    window.dispatchEvent(new Event('storage'));
  };

  const handleAdresseChange = async (val: string) => {
    setAdresse(val);
    if (val && val.length > 5) {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) { 
        console.error(err); 
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const selectionnerAdresse = (feat: any) => {
    setAdresse(feat.properties.label);
    setSuggestions([]);
    const [lon, lat] = feat.geometry.coordinates;
    setDistanceValide(estDansLesYvelines(feat.properties));
    setDistanceRelais(distanceAuRelais(lat, lon));
    setVilleRelais(estVilleRelais(feat.properties));
    setCoordsAdresse({ lat, lon });
  };

  const fmtDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const joursDuMois = (annee: number, mois: number): (Date | null)[] => {
    const premier = new Date(annee, mois, 1);
    const dernier = new Date(annee, mois + 1, 0);
    const jours: (Date | null)[] = [];
    const offset = (premier.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) jours.push(null);
    for (let j = 1; j <= dernier.getDate(); j++) jours.push(new Date(annee, mois, j));
    return jours;
  };

  const isDisponible = (date: Date): boolean => {
    if (!configCal) return false;
    const exc = exceptionsLiv.find(e => e.date === fmtDate(date));
    if (exc) return !exc.ferme;
    return configCal.jours_semaine.includes(date.getDay());
  };

  const isPlein = (date: Date): boolean => {
    if (!configCal) return false;
    return (commandesParDate[fmtDate(date)] ?? 0) >= configCal.max_commandes_par_jour;
  };

  const validerCodePromo = async () => {
    const code = codePromo.trim().toUpperCase();
    if (!code) return;
    setCodeStatut('loading');

    // La table codes_promo n'est plus lisible côté client (elle exposait tous les
    // codes actifs publiquement). On interroge une fonction serveur qui ne renvoie
    // que le verdict du code soumis, pour l'utilisateur connecté.
    const { data, error } = await supabase.rpc('verifier_code_promo', { p_code: code });
    setEtatCode(error ? {} : (data as EtatCode) || {});

    if (error || !data?.valide) {
      setRemiseCode(0);
      setCodePromoId(null);
      setCodeStatut('invalid');
      return;
    }

    if (data.deja_utilise) {
      setCodeStatut('used');
      return;
    }

    setRemiseCode(data.reduction_pct);
    setCodePromoId(data.id);
    setCodeStatut('valid');
    setCodePromo(code);
    setApplyLoyalty(false);
    setApplyReferral(false);
  };

  const sousTotalFinal = (panier || []).reduce((acc, item) => acc + calculerPrixLigne(item), 0);
  const economie = calculerEconomieTotale();
  const remisePct = (applyLoyalty ? 10 : 0) + (applyReferral ? 10 : 0);
  const remiseMontant = sousTotalFinal * remisePct / 100;
  const remiseCodeMontant = codeStatut === 'valid' ? Math.round(sousTotalFinal * remiseCode / 100 * 100) / 100 : 0;
  const totalApresRemise = sousTotalFinal - remiseMontant - remiseCodeMontant;
  // Livraison offerte dans les villes des points relais, ou dès 40 € de produits
  // avant remise (une remise ne fait pas perdre la livraison offerte). Sinon
  // 3 € / 4 € / 5 € selon la distance au relais le plus proche. Le serveur
  // recalcule le montant en géocodant lui-même l'adresse.
  const fraisLivraison = calculerFraisLivraison({ sousTotal: sousTotalFinal, distance: distanceRelais, villeRelais });
  const totalFinal = totalApresRemise + fraisLivraison;
  const minimumNonAtteint = user && (panier || []).length > 0 && totalApresRemise < 10;
  // Article indisponible ou variantes incompatibles : à corriger avant de commander
  const panierACorriger = (panier || []).some(i => i.indisponible || i.alerte);

  const envoyerCommande = async () => {
    if (!user) {
      onClose();
      router.push('/login');
      return;
    }

    if (!nom || !telephone || !adresse || !distanceValide) return;
    if (!dateLivraison) return;
    setChargement(true);

    try {
      await supabase.auth.updateUser({
        data: {
          full_name: nom,
          phone: telephone,
          address: adresse
        }
      });
    } catch (err) {
      console.error("Erreur sync profil:", err);
    }
    
    // --- CRÉATION DE LA COMMANDE CÔTÉ SERVEUR ---
    // creer_commande recalcule tous les prix, remises et le total à partir de
    // la base, décrémente le stock, valide/enregistre le code promo et applique
    // les récompenses — le tout dans une seule transaction. Le client n'envoie
    // que les produits et quantités choisis (aucun prix n'est plus fait confiance).
    let totalServeur = totalFinal;
    try {
      const { data: result, error } = await supabase.rpc('creer_commande', {
        p_items: panier.map(item => ({ id: item.id, quantite: item.quantite, variant_id: item.variant_id ?? null })),
        p_infos: {
          nom,
          telephone,
          adresse,
          date_livraison: dateLivraison || null,
          commentaire: commentaireClient.trim() || null,
          code_promo: codeStatut === 'valid' ? codePromo : null,
          apply_loyalty: applyLoyalty,
          apply_referral: applyReferral,
          lat: coordsAdresse?.lat ?? null,
          lon: coordsAdresse?.lon ?? null,
        },
      });

      if (error) throw error;
      totalServeur = (result as any)?.total ?? totalFinal;

      // Notifications email — non bloquant
      fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Le serveur relit la commande en base pour construire les e-mails
        body: JSON.stringify({ commande_id: (result as any)?.id }),
      }).then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          console.error('[notify-order] HTTP', r.status, data);
        } else {
          console.log('[notify-order] résultat:', data);
        }
      }).catch(err => console.error('[notify-order] réseau:', err));

      localStorage.removeItem('mon-panier');
      window.dispatchEvent(new Event('panier-updated'));
      window.dispatchEvent(new Event('storage'));
      setPanier([]);
      setCommentaireClient('');
      setConfirmation({
        id: (result as any)?.id ?? 0,
        total: totalServeur,
        date: dateLivraison,
      });
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erreur lors de l'envoi de la commande.");
    } finally {
      setChargement(false);
    }
  };

  if (!isOpen) return null;

  const articles = panier || [];
  const fermer = () => { onClose(); };
  const dateChoisie = dateLivraison ? new Date(dateLivraison + 'T12:00:00') : null;
  // Frais connus dès que l'adresse est validée (ou offerts par le montant)
  const livraisonConnue = distanceValide === true || fraisLivraison === 0;
  const libelleLivraison = fraisLivraison === 0 ? (villeRelais ? 'Offerte (ville relais)' : 'Offerte') : formatPrix(fraisLivraison);
  const resteLivraisonOfferte = SEUIL_LIVRAISON_OFFERTE - sousTotalFinal;
  // Ce qu'il manque pour confirmer (étape 2)
  const manques = [
    !nom && 'votre nom',
    !telephone && 'votre téléphone',
    !distanceValide && 'une adresse dans le 78',
    !dateLivraison && 'la date de livraison',
  ].filter(Boolean) as string[];
  const confirmationImpossible = chargement || methodePaiement === 'Ligne' || !!minimumNonAtteint || panierACorriger
    || articles.length === 0 || !distanceValide || !nom || !telephone || !dateLivraison;

  const champ = 'w-full h-[52px] px-4 rounded-[14px] border-[1.5px] border-[#E0D3C0] bg-white text-base font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium outline-none focus:border-[#FF4500] transition-colors';
  const etiquetteChamp = 'block mb-1.5 text-[13px] font-bold text-[#5C4030]';
  const carte = 'bg-white rounded-[22px] border border-[#E8DCCB] px-4 py-[18px]';
  const boutonPrincipal = 'w-full min-h-[60px] px-[22px] rounded-[18px] bg-[#FF4500] text-white text-[19px] font-extrabold flex items-center justify-between gap-3 shadow-[0_16px_30px_-14px_rgba(255,69,0,0.55)] transition-[background-color,transform] duration-200 hover:bg-[#E63E00] active:scale-[0.98] disabled:bg-[#EDE3D5] disabled:text-[#6F5A4B] disabled:shadow-none disabled:cursor-not-allowed';

  const alertes = (
    <>
      {panierACorriger && (
        <p role="alert" className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-red-700 text-[13.5px] font-bold">
          <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />Retirez les articles signalés en rouge pour commander
        </p>
      )}
      {minimumNonAtteint && (
        <p role="alert" className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-[#FFF1EA] text-[#B83200] text-[13.5px] font-bold">
          <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />Minimum de commande : 10 € (encore {formatPrix(10 - totalApresRemise)})
        </p>
      )}
    </>
  );

  const etapes = (
    <ol className="flex items-center gap-2 mt-3.5 text-[12.5px] font-bold">
      {['Panier', 'Livraison', 'Confirmation'].map((nomEtape, i) => {
        const numero = i + 1;
        const faite = numero < etape;
        const courante = numero === etape;
        return (
          <React.Fragment key={nomEtape}>
            {i > 0 && <li aria-hidden className={`flex-1 h-0.5 rounded-full ${numero <= etape ? 'bg-[#166534]' : 'bg-[#DDD0BF]'}`} />}
            <li aria-current={courante ? 'step' : undefined} className={`flex items-center gap-1.5 ${faite ? 'text-[#166534]' : courante ? 'text-[#3D2B1F]' : 'text-[#6F5A4B]'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${faite ? 'bg-[#166534] text-white' : courante ? 'bg-[#FF4500] text-white' : 'bg-white border-[1.5px] border-[#DDD0BF]'}`}>
                {faite ? <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden /> : numero}
              </span>
              {nomEtape}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-[#3D2B1F]/45 backdrop-blur-sm" onClick={confirmation ? undefined : fermer} />

      {/* ÉTAPE 3 : COMMANDE CONFIRMÉE */}
      {confirmation && (
        <div role="dialog" aria-modal="true" aria-labelledby="titre-confirmation" className="relative w-full sm:max-w-[480px] bg-[#F5EAE0] text-[#3D2B1F] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
          <div className="flex-1 flex flex-col items-center px-6 pt-11 text-center">
            <div className="relative w-[132px] h-[132px] flex items-center justify-center mb-[26px]">
              <svg className="ss-rayons absolute inset-0 w-full h-full" viewBox="0 0 200 200" aria-hidden>
                <circle cx="100" cy="100" r="86" fill="none" stroke="#FF4500" strokeOpacity="0.3" strokeWidth="20" strokeDasharray="4 26" />
              </svg>
              <span className="ss-pop relative w-[84px] h-[84px] rounded-full bg-[#166534] text-white flex items-center justify-center">
                <Check className="w-[42px] h-[42px]" strokeWidth={3} aria-hidden />
              </span>
            </div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#C73600]">Soleil et Saveurs</p>
            <h2 id="titre-confirmation" className="titre text-[42px] leading-none mb-3">
              Commande<br /><em className="text-[#FF4500]">confirmée !</em>
            </h2>
            <p className="text-base leading-normal text-[#5C4030] mb-[26px]">
              Merci pour votre confiance, votre régal arrive bientôt.
            </p>

            {/* Récap */}
            <dl className="w-full bg-white rounded-[22px] border border-[#E8DCCB] divide-y divide-[#F0E7DA] mb-4 text-left">
              {confirmation.id > 0 && (
                <div className="flex items-center justify-between gap-3 px-[18px] py-[15px]">
                  <dt className="text-sm font-semibold text-[#6F5A4B]">Commande</dt>
                  <dd className="text-base font-extrabold">#{String(confirmation.id).slice(-6).toUpperCase()}</dd>
                </div>
              )}
              {confirmation.date && (
                <div className="flex items-center justify-between gap-3 px-[18px] py-[15px]">
                  <dt className="text-sm font-semibold text-[#6F5A4B]">Livraison</dt>
                  <dd className="text-base font-extrabold text-right">
                    {new Date(confirmation.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 px-[18px] py-[15px]">
                <dt className="text-sm font-semibold text-[#6F5A4B]">Total</dt>
                <dd className="text-[22px] font-black tracking-tight text-[#FF4500]">{formatPrix(confirmation.total)}</dd>
              </div>
            </dl>

            {/* Prochaines étapes */}
            <ul className="w-full flex flex-col gap-2.5 text-left text-[14.5px] font-semibold text-[#5C4030]">
              <li className="flex items-center gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-white text-[#FF4500] flex items-center justify-center"><Mail className="w-[19px] h-[19px]" aria-hidden /></span>
                Un récapitulatif vous est envoyé par e-mail.
              </li>
              <li className="flex items-center gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-white text-[#FF4500] flex items-center justify-center"><Phone className="w-[19px] h-[19px]" aria-hidden /></span>
                Nous vous contactons sur WhatsApp pour la livraison.
              </li>
            </ul>
          </div>

          <div className="px-5 pt-[22px] pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-1.5">
            <button type="button" onClick={() => { setConfirmation(null); onClose(); router.push('/compte'); }} className={boutonPrincipal}>
              Suivre ma commande
              <ArrowRight className="w-[22px] h-[22px]" strokeWidth={2.4} aria-hidden />
            </button>
            <button type="button" onClick={() => { setConfirmation(null); onClose(); }} className="w-full min-h-[52px] text-base font-bold text-[#3D2B1F] hover:text-[#C73600] transition-colors">
              Retour à la boutique
            </button>
          </div>
        </div>
      )}

      {!confirmation && (
        <div role="dialog" aria-modal="true" aria-labelledby="titre-panier" className="relative w-full sm:max-w-[480px] bg-[#EDE3D5] text-[#3D2B1F] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

          {/* EN-TÊTE ET ÉTAPES */}
          <header className="shrink-0 bg-[#F5EAE0] border-b border-[#DDD0BF] px-3 pt-4 pb-3.5">
            <div className="flex items-center gap-2">
              {etape === 2 && (
                <button type="button" onClick={() => setEtape(1)} aria-label="Retour au panier" className="shrink-0 w-11 h-11 rounded-full bg-white text-[#3D2B1F] flex items-center justify-center hover:bg-[#FFF1EA] transition-colors">
                  <ArrowLeft className="w-5 h-5" strokeWidth={2.4} aria-hidden />
                </button>
              )}
              <h2 id="titre-panier" className={`titre flex-1 leading-none ${etape === 1 ? 'pl-2 text-[34px]' : 'text-[30px]'}`}>
                {etape === 1 ? <>Mon <em className="text-[#FF4500]">panier</em></> : 'Livraison'}
              </h2>
              <button type="button" onClick={fermer} aria-label="Fermer le panier" className="shrink-0 w-11 h-11 rounded-full bg-white text-[#3D2B1F] flex items-center justify-center hover:bg-[#FFF1EA] transition-colors">
                <X className="w-5 h-5" strokeWidth={2.4} aria-hidden />
              </button>
            </div>
            <div className="px-2">{etapes}</div>
          </header>

          {/* ÉTAPE 1 : MON PANIER */}
          {etape === 1 && (
            <>
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3.5 pb-4 flex flex-col gap-2.5">
                {articles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <span className="w-20 h-20 rounded-full bg-[#F5EAE0] text-[#C9BBAA] flex items-center justify-center mb-4"><ShoppingBag className="w-9 h-9" aria-hidden /></span>
                    <p className="titre text-2xl mb-5">Le panier est vide</p>
                    <button type="button" onClick={() => { fermer(); router.push('/commander'); }} className="min-h-12 px-6 rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">
                      Voir la récolte
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-[18px] bg-[#3D2B1F] text-[#F5EAE0] px-4 py-3.5 flex flex-col gap-2.5">
                      <p aria-live="polite" className="flex items-center gap-2.5 text-sm font-bold">
                        <Truck className="w-[18px] h-[18px] shrink-0 text-[#FF9466]" aria-hidden />
                        {villeRelais && distanceValide ? 'Livraison offerte (ville relais)' : resteLivraisonOfferte > 0.005 ? `Encore ${formatPrix(resteLivraisonOfferte)} pour la livraison offerte` : 'Livraison offerte'}
                      </p>
                      <div className="h-[7px] rounded-full bg-[#5C4030] overflow-hidden">
                        <div className="h-full rounded-full bg-[#FF7A47] transition-[width] duration-500 ease-out" style={{ width: `${villeRelais && distanceValide ? 100 : Math.max(0, Math.min(100, (sousTotalFinal / SEUIL_LIVRAISON_OFFERTE) * 100))}%` }} />
                      </div>
                    </div>

                    {articles.map((item, index) => {
                      const resultat = calculs.ligne(item);
                      const groupe = calculs.groupe(item);
                      const produitsOfferts = resultat?.offerts ?? 0;
                      const prixDegressifActif = !!groupe?.degressifActif;
                      const lotDefini = item.seuil_achat > 0 && item.quantite_offerte > 0;
                      const stockRestant = stockMaxLigne(item) - (Number(item.quantite) || 0);
                      const pas = item.unite === 'kg' ? 0.5 : item.unite === 'g' ? (item.pas_g || 100) : 1;
                      // Dernière ligne du produit : on y indique la promo commune aux variantes
                      const derniereDuProduit = !item.indisponible && !articles.slice(index + 1).some(i => i.id === item.id && !i.indisponible);
                      const plusieursVariantes = articles.filter(i => i.id === item.id && !i.indisponible).length > 1;
                      const suggestion = derniereDuProduit && groupe ? prochainePromo(item, groupe.qteTotale) : null;
                      const unite = item.unite === 'g' ? 'kg' : item.unite || 'pièce';
                      const reduit = !!resultat && resultat.totalSansPromo - resultat.total > 0.005;
                      const signale = item.indisponible || item.alerte;
                      return (
                        <article key={`${item.id}-${item.variant_id ?? ''}`} className={`flex gap-3 bg-white rounded-[20px] border p-2.5 ${signale ? 'border-red-300' : 'border-[#E8DCCB]'}`}>
                          <span className="shrink-0 w-[84px] h-[84px] rounded-[14px] overflow-hidden bg-[#F5EAE0] border border-[#F0E7DA] flex items-center justify-center text-[#C9BBAA]">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className={`w-full h-full object-cover ${item.indisponible ? 'grayscale opacity-50' : ''}`} />
                            ) : (
                              <ShoppingBasket className="w-8 h-8" aria-hidden />
                            )}
                          </span>
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-[15px] font-extrabold leading-tight">{item.name}</h3>
                                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] font-semibold text-[#6F5A4B]">
                                  {item.promotion > 0 && !prixDegressifActif && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-[#D43A00] text-white text-[11px] font-extrabold">-{item.promotion} %</span>
                                  )}
                                  {prixDegressifActif && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-[#ECF7EF] text-[#166534] text-[11px] font-extrabold">Prix dès {String(item.seuil_promo_qte).replace('.', ',')}</span>
                                  )}
                                  {produitsOfferts > 0 && lotDefini && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#ECF7EF] text-[#166534] text-[11px] font-extrabold"><Gift className="w-3 h-3" aria-hidden />{produitsOfferts} offert{produitsOfferts > 1 ? 's' : ''}</span>
                                  )}
                                  {!prixDegressifActif && premieresOffertes(item) > 0 && produitsOfferts > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#ECF7EF] text-[#166534] text-[11px] font-extrabold"><Gift className="w-3 h-3" aria-hidden />{libellePremieresOffertes(item)}</span>
                                  )}
                                  {item.seuil_promo_qte > 0 && item.prix_promo > 0 && !prixDegressifActif && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-[#FFF1EA] text-[#B83200] text-[11px] font-extrabold">Dès {String(item.seuil_promo_qte).replace('.', ',')}{item.unite === 'g' || item.unite === 'kg' ? ' kg' : ''} : {formatPrix(item.prix_promo)}</span>
                                  )}
                                  <span>{formatPrix(resultat?.prixUnitaire ?? item.price)} /{unite}</span>
                                </p>
                              </div>
                              <button type="button" onClick={() => updateQuantity(item.id, 0, item.unite, item.variant_id)} aria-label={`Retirer ${item.name} du panier`} className="shrink-0 -mt-1 -mr-1 w-10 h-10 rounded-full flex items-center justify-center text-[#6F5A4B] hover:bg-red-50 hover:text-red-600 transition-colors">
                                <Trash2 className="w-[18px] h-[18px]" aria-hidden />
                              </button>
                            </div>

                            {signale && (
                              <p className="flex items-center gap-1.5 text-[13px] font-bold text-red-700">
                                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden /> {item.indisponible || item.alerte}
                              </p>
                            )}

                            <div className="flex items-end justify-between gap-2">
                              <div className="flex items-center w-[138px] h-11 p-[3px] rounded-[13px] bg-[#F5EAE0]">
                                <button type="button" onClick={() => updateQuantity(item.id, -1, item.unite, item.variant_id)} disabled={(Number(item.quantite) || 0) <= pas} aria-label={`Diminuer la quantité de ${item.name}`} className="shrink-0 w-10 h-full rounded-[10px] bg-white text-[#3D2B1F] flex items-center justify-center active:scale-90 transition-transform disabled:text-[#C9BBAA]">
                                  <Minus className="w-4 h-4" strokeWidth={2.6} aria-hidden />
                                </button>
                                <span aria-live="polite" className="flex-1 text-center text-[13.5px] font-extrabold tabular-nums whitespace-nowrap">{libelleQuantite(item, Number(item.quantite) || 0)}</span>
                                <button type="button" onClick={() => updateQuantity(item.id, 1, item.unite, item.variant_id)} disabled={stockRestant <= 0} aria-label={`Augmenter la quantité de ${item.name}`} className="shrink-0 w-10 h-full rounded-[10px] bg-[#3D2B1F] text-[#F5EAE0] flex items-center justify-center active:scale-90 transition-transform disabled:bg-[#C9BBAA]">
                                  <Plus className="w-4 h-4" strokeWidth={2.6} aria-hidden />
                                </button>
                              </div>
                              <p className="text-right leading-tight">
                                {reduit && <s className="text-[12.5px] font-semibold text-[#6F5A4B]">{formatPrix(resultat!.totalSansPromo)}</s>}
                                <strong className={`block text-lg font-black tracking-tight tabular-nums ${reduit ? 'text-[#FF4500]' : ''}`}>{formatPrix(calculerPrixLigne(item))}</strong>
                              </p>
                            </div>

                            {derniereDuProduit && plusieursVariantes && groupe && groupe.totalSansPromo - groupe.total > 0.005 && (
                              <p className="text-[13px] font-bold text-[#166534]">Promo sur vos {String(groupe.qteTotale).replace('.', ',')}{item.unite === 'g' ? ' g' : item.unite === 'kg' ? ' kg' : ''} (toutes variantes) : -{formatPrix(groupe.totalSansPromo - groupe.total)}</p>
                            )}
                            {suggestion && !item.indisponible && (
                              <p className="text-[13px] font-bold text-[#B83200]">{suggestion.texte}{plusieursVariantes || item.variant_id ? ' (variantes mélangeables)' : ''}</p>
                            )}
                          </div>
                        </article>
                      );
                    })}

                    <button type="button" onClick={fermer} className="self-center inline-flex items-center gap-2 min-h-11 px-3 text-sm font-bold text-[#5C4030] hover:text-[#C73600] transition-colors">
                      <Plus className="w-[17px] h-[17px]" strokeWidth={2.2} aria-hidden />Continuer mes achats
                    </button>

                    <dl className={`${carte} flex flex-col gap-2 text-[14.5px] font-semibold text-[#5C4030]`}>
                      <div className="flex justify-between gap-3"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrix(sousTotalFinal + economie)}</dd></div>
                      {economie > 0.005 && (
                        <div className="flex justify-between gap-3 font-extrabold text-[#166534]"><dt>Économie promo</dt><dd className="tabular-nums">-{formatPrix(economie)}</dd></div>
                      )}
                      <div className="flex justify-between gap-3">
                        <dt>Livraison</dt>
                        <dd className={livraisonConnue ? (fraisLivraison === 0 ? 'font-extrabold text-[#166534]' : 'tabular-nums') : 'text-[#6F5A4B]'}>
                          {livraisonConnue ? libelleLivraison : 'calculée à l’étape suivante'}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </div>

              {articles.length > 0 && (
                <footer className="shrink-0 bg-white border-t border-[#E8DCCB] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3 shadow-[0_-16px_30px_-22px_rgba(61,43,31,0.45)]">
                  {alertes}
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="titre text-[26px] leading-none">Total produits</span>
                    <strong className="text-[30px] font-black tracking-tight leading-none text-[#FF4500] tabular-nums">{formatPrix(sousTotalFinal)}</strong>
                  </div>
                  {user ? (
                    <button type="button" disabled={panierACorriger || !!minimumNonAtteint} onClick={() => setEtape(2)} className={boutonPrincipal}>
                      Commander
                      <ArrowRight className="w-[22px] h-[22px]" strokeWidth={2.4} aria-hidden />
                    </button>
                  ) : (
                    <button type="button" onClick={envoyerCommande} className={boutonPrincipal}>
                      Se connecter pour commander
                      <LogIn className="w-[22px] h-[22px]" aria-hidden />
                    </button>
                  )}
                  <p className="text-center text-[12.5px] font-semibold text-[#6F5A4B]">Minimum de commande : 10 € · Paiement à la livraison</p>
                </footer>
              )}
            </>
          )}

          {/* ÉTAPE 2 : LIVRAISON ET PAIEMENT */}
          {etape === 2 && (
            <>
              <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3.5 pb-4 flex flex-col gap-3">

                <section className={`${carte} flex flex-col gap-3`}>
                  <div className="flex items-center justify-between gap-2.5">
                    <h3 className="text-[17px] font-extrabold">Infos de livraison</h3>
                    {user && <span className="px-2.5 py-1 rounded-full bg-[#ECF7EF] text-xs font-bold text-[#166534]">Profil connecté</span>}
                  </div>
                  <div>
                    <label htmlFor="panier-nom" className={etiquetteChamp}>Nom complet</label>
                    <input id="panier-nom" type="text" autoComplete="name" maxLength={100} value={nom} onChange={(e) => setNom(e.target.value)} className={champ} />
                  </div>
                  <div>
                    <label htmlFor="panier-telephone" className={etiquetteChamp}>Téléphone</label>
                    <input id="panier-telephone" type="tel" autoComplete="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} className={champ} />
                  </div>
                  <div className="relative">
                    <label htmlFor="panier-adresse" className={etiquetteChamp}>Adresse (dans le 78)</label>
                    <input id="panier-adresse" type="text" autoComplete="off" maxLength={200} value={adresse} onChange={(e) => handleAdresseChange(e.target.value)} className={champ} />
                    {(suggestions || []).length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1.5 bg-white border border-[#E0D3C0] rounded-2xl shadow-2xl overflow-hidden">
                        {suggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => selectionnerAdresse(s)} className="w-full min-h-12 px-4 py-2.5 flex items-center gap-2.5 text-left text-sm font-semibold border-b border-[#F0E7DA] last:border-b-0 hover:bg-[#F5EAE0] transition-colors">
                            <MapPin className="w-4 h-4 shrink-0 text-[#FF4500]" aria-hidden />{s.properties.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {distanceValide === false && (
                    <p role="alert" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 text-[13.5px] font-bold text-red-700">
                      <AlertCircle className="w-[17px] h-[17px] shrink-0" aria-hidden />Désolé, nous livrons uniquement dans le 78.
                    </p>
                  )}
                  {distanceValide === true && (
                    <p className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#ECF7EF] text-[13.5px] font-bold text-[#166534]">
                      <Check className="w-[17px] h-[17px] shrink-0" strokeWidth={2.6} aria-hidden />
                      Zone de livraison validée !{villeRelais ? ' Livraison offerte (ville relais).' : ''}
                    </p>
                  )}
                </section>

                {/* CALENDRIER DE LIVRAISON */}
                {configCal !== null && (
                  <section className={carte}>
                    <div className="flex items-center justify-between gap-2.5 mb-1">
                      <h3 className="text-[17px] font-extrabold">Date de livraison</h3>
                      {dateChoisie ? (
                        <span className="text-sm font-extrabold text-[#C73600]">{dateChoisie.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-[#FFF1EA] text-xs font-bold text-[#B83200]">Requis</span>
                      )}
                    </div>
                    <p className="mb-3.5 text-[13px] font-semibold text-[#6F5A4B]">Livraison entre 15h et 20h.</p>
                    <div className="flex items-center justify-between mb-2">
                      <button type="button" aria-label="Mois précédent" onClick={() => setMoisCal(prev => { const d = new Date(prev.annee, prev.mois - 1); return { annee: d.getFullYear(), mois: d.getMonth() }; })} className="w-11 h-11 rounded-xl bg-[#F5EAE0] text-[#3D2B1F] flex items-center justify-center hover:bg-[#EAD9C8] transition-colors">
                        <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden />
                      </button>
                      <p className="text-[15px] font-extrabold first-letter:uppercase">
                        {new Date(moisCal.annee, moisCal.mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                      <button type="button" aria-label="Mois suivant" onClick={() => setMoisCal(prev => { const d = new Date(prev.annee, prev.mois + 1); return { annee: d.getFullYear(), mois: d.getMonth() }; })} className="w-11 h-11 rounded-xl bg-[#F5EAE0] text-[#3D2B1F] flex items-center justify-center hover:bg-[#EAD9C8] transition-colors">
                        <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.4} aria-hidden />
                      </button>
                    </div>
                    <div aria-hidden className="grid grid-cols-7 gap-1 mb-1 text-center text-xs font-bold text-[#6F5A4B]">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => <span key={i}>{j}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {joursDuMois(moisCal.annee, moisCal.mois).map((date, i) => {
                        if (!date) return <span key={`e-${i}`} />;
                        const dateStr = fmtDate(date);
                        const auj = new Date(); auj.setHours(0, 0, 0, 0);
                        const demain = new Date(auj); demain.setDate(auj.getDate() + 1);
                        const passe = date < demain;
                        const dispo = !passe && isDisponible(date);
                        const plein = dispo && isPlein(date);
                        const selec = dateStr === dateLivraison;
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!dispo || plein}
                            aria-pressed={selec}
                            aria-label={`${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${selec ? ', date choisie' : plein ? ', complet' : dispo ? ', disponible' : ', indisponible'}`}
                            onClick={() => setDateLivraison(selec ? null : dateStr)}
                            className={`aspect-square rounded-xl text-sm flex items-center justify-center transition-colors ${
                              selec ? 'bg-[#3D2B1F] text-[#F5EAE0] font-extrabold'
                              : passe || !dispo ? 'text-[#8C7867] font-medium line-through cursor-not-allowed'
                              : plein ? 'bg-[#FFF1EA] text-[#B83200] font-bold cursor-not-allowed'
                              : 'bg-[#F5EAE0] text-[#3D2B1F] font-bold hover:bg-[#EAD9C8]'}`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3.5 flex items-center gap-x-3.5 gap-y-1 flex-wrap text-[12.5px] font-semibold text-[#6F5A4B]">
                      <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-[5px] bg-[#F5EAE0] border border-[#E0D3C0]" />Disponible</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-[5px] bg-[#FFF1EA] border border-[#FFC9B0]" />Complet</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-[5px] bg-[#3D2B1F]" />Votre choix</span>
                    </p>
                    {!dateLivraison && (
                      <p className="mt-2.5 text-[13px] font-bold text-[#B83200]">Veuillez sélectionner une date de livraison</p>
                    )}
                  </section>
                )}

                {/* REMISES DISPONIBLES ET CODE PROMO */}
                <section className={`${carte} flex flex-col gap-3`}>
                  {user && dbProfile?.referral_pending && (
                    <div className="flex items-center gap-3 px-3 py-3 rounded-[14px] bg-[#FFF8E6] text-[#92400E]">
                      <Gift className="w-5 h-5 shrink-0" aria-hidden />
                      <div>
                        <p className="text-sm font-extrabold">Bon parrainage -10 % en attente</p>
                        <p className="text-[12.5px] font-semibold">Validez cette commande pour débloquer votre bon</p>
                      </div>
                    </div>
                  )}

                  {user && ((dbProfile?.loyalty_points ?? 0) >= 100 || (dbProfile?.has_referral_discount && !dbProfile?.referral_pending)) && (
                    <>
                      <h3 className="text-[17px] font-extrabold">Remises disponibles</h3>
                      {(dbProfile?.loyalty_points ?? 0) >= 100 && (
                        <label className={`flex items-center gap-3 min-h-14 px-3 py-2.5 rounded-[14px] border-[1.5px] transition-colors ${applyLoyalty ? 'border-[#166534] bg-[#ECF7EF]' : 'border-[#E0D3C0]'} ${codeStatut === 'valid' || applyReferral ? 'opacity-50' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={applyLoyalty}
                            disabled={codeStatut === 'valid' || applyReferral}
                            onChange={(e) => {
                              setApplyLoyalty(e.target.checked);
                              if (e.target.checked) {
                                setApplyReferral(false);
                                setCodePromo(''); setCodeStatut('idle'); setRemiseCode(0); setCodePromoId(null);
                              }
                            }}
                            className="shrink-0 w-[22px] h-[22px] accent-[#FF4500]"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14.5px] font-extrabold">Remise fidélité -10 %</span>
                            <span className="block text-[12.5px] font-semibold text-[#6F5A4B]">{dbProfile?.loyalty_points} points · le solde repart à 0</span>
                          </span>
                          <span className="shrink-0 text-[14.5px] font-extrabold text-[#166534] tabular-nums">-{formatPrix(sousTotalFinal * 0.1)}</span>
                        </label>
                      )}
                      {dbProfile?.has_referral_discount && !dbProfile?.referral_pending && (
                        <label className={`flex items-center gap-3 min-h-14 px-3 py-2.5 rounded-[14px] border-[1.5px] transition-colors ${applyReferral ? 'border-[#166534] bg-[#ECF7EF]' : 'border-[#E0D3C0]'} ${codeStatut === 'valid' || applyLoyalty ? 'opacity-50' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={applyReferral}
                            disabled={codeStatut === 'valid' || applyLoyalty}
                            onChange={(e) => {
                              setApplyReferral(e.target.checked);
                              if (e.target.checked) {
                                setApplyLoyalty(false);
                                setCodePromo(''); setCodeStatut('idle'); setRemiseCode(0); setCodePromoId(null);
                              }
                            }}
                            className="shrink-0 w-[22px] h-[22px] accent-[#FF4500]"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14.5px] font-extrabold">Remise parrainage -10 %</span>
                            <span className="block text-[12.5px] font-semibold text-[#6F5A4B]">Programme de parrainage</span>
                          </span>
                          <span className="shrink-0 text-[14.5px] font-extrabold text-[#166534] tabular-nums">-{formatPrix(sousTotalFinal * 0.1)}</span>
                        </label>
                      )}
                    </>
                  )}

                  {/* CODE PROMO */}
                  <div>
                    <label htmlFor="panier-code" className={etiquetteChamp}>Code promo</label>
                    <div className="flex gap-2">
                      <input
                        id="panier-code"
                        type="text"
                        autoComplete="off"
                        maxLength={40}
                        placeholder="Votre code"
                        value={codePromo}
                        onChange={(e) => { setCodePromo(e.target.value.toUpperCase()); setCodeStatut('idle'); setRemiseCode(0); setCodePromoId(null); }}
                        disabled={codeStatut === 'valid' || applyLoyalty || applyReferral}
                        className={`${champ} flex-1 min-w-0 uppercase placeholder:normal-case ${
                          codeStatut === 'valid' ? '!border-[#166534] !bg-[#ECF7EF] !text-[#166534]' :
                          codeStatut === 'invalid' || codeStatut === 'used' ? '!border-red-300' :
                          applyLoyalty || applyReferral ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                      {codeStatut === 'valid' ? (
                        <button type="button" onClick={() => { setCodePromo(''); setCodeStatut('idle'); setRemiseCode(0); setCodePromoId(null); }} className="shrink-0 h-[52px] px-[18px] rounded-[14px] border-[1.5px] border-[#3D2B1F] text-[15px] font-bold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">
                          Retirer
                        </button>
                      ) : (
                        <button type="button" onClick={validerCodePromo} disabled={codeStatut === 'loading' || !codePromo.trim() || applyLoyalty || applyReferral} className="shrink-0 h-[52px] min-w-[104px] px-[18px] rounded-[14px] bg-[#3D2B1F] text-[#F5EAE0] text-[15px] font-bold flex items-center justify-center hover:bg-[#FF4500] transition-colors disabled:bg-[#EDE3D5] disabled:text-[#6F5A4B]">
                          {codeStatut === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Vérification" /> : 'Appliquer'}
                        </button>
                      )}
                    </div>
                    {(codeStatut === 'valid' || codeStatut === 'invalid' || codeStatut === 'used') && (() => {
                      const etat: EtatCode = codeStatut === 'valid' ? { ...etatCode, statut: 'ok', reduction_pct: remiseCode }
                        : codeStatut === 'used' ? { ...etatCode, statut: 'limite' }
                        : etatCode.statut === 'pas_encore' || etatCode.statut === 'expire' ? etatCode : { statut: 'inconnu' };
                      const m = messageCode(etat);
                      const ok = codeStatut === 'valid';
                      const neutre = etat.statut === 'pas_encore' || etat.statut === 'expire';
                      const Icone = ok ? Check : neutre ? Clock : AlertCircle;
                      return (
                        <p role={ok ? 'status' : 'alert'} className={`mt-2 flex gap-2.5 px-3.5 py-3 rounded-xl text-[13.5px] leading-snug ${ok ? 'bg-[#ECF7EF] text-[#166534]' : neutre ? 'bg-[#F1ECE6] text-[#5C4030]' : 'bg-[#FFF1EA] text-[#B83200]'}`}>
                          <Icone className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={ok ? 2.6 : 2.2} aria-hidden />
                          <span><strong className="block font-extrabold">{m.titre}</strong>{m.detail && <span className="font-medium">{m.detail}</span>}</span>
                        </p>
                      );
                    })()}
                  </div>
                </section>

                {/* COMMENTAIRE CLIENT */}
                <section className={carte}>
                  <label htmlFor="panier-commentaire" className="block mb-2 text-[17px] font-extrabold">Commentaire <span className="text-[13px] font-semibold text-[#6F5A4B]">(optionnel)</span></label>
                  <textarea
                    id="panier-commentaire"
                    value={commentaireClient}
                    onChange={(e) => setCommentaireClient(e.target.value)}
                    placeholder="Une précision pour le livreur ?"
                    maxLength={250}
                    rows={2}
                    className="w-full px-4 py-3.5 rounded-[14px] border-[1.5px] border-[#E0D3C0] bg-white text-base font-medium text-[#3D2B1F] placeholder:text-[#8C7867] resize-none outline-none focus:border-[#FF4500] transition-colors"
                  />
                </section>

                {/* PAIEMENT */}
                <section className={`${carte} flex flex-col gap-2.5`}>
                  <h3 className="mb-0.5 text-[17px] font-extrabold">Paiement</h3>
                  <button type="button" aria-pressed={methodePaiement === 'Espèces'} onClick={() => setMethodePaiement('Espèces')} className={`flex items-center gap-3 min-h-[60px] px-3.5 py-2.5 rounded-[14px] text-left transition-colors ${methodePaiement === 'Espèces' ? 'border-2 border-[#3D2B1F] bg-[#FBF7F2]' : 'border-[1.5px] border-[#E0D3C0]'}`}>
                    <Banknote className="w-[22px] h-[22px] shrink-0 text-[#FF4500]" aria-hidden />
                    <span className="flex-1">
                      <span className="block text-[15px] font-extrabold">Espèces ou carte</span>
                      <span className="block text-[12.5px] font-semibold text-[#6F5A4B]">à la livraison</span>
                    </span>
                    {methodePaiement === 'Espèces' && <Check className="w-5 h-5 shrink-0 text-[#166534]" strokeWidth={2.6} aria-hidden />}
                  </button>
                  <button type="button" disabled aria-disabled="true" className="flex items-center gap-3 min-h-[60px] px-3.5 py-2.5 rounded-[14px] border-[1.5px] border-dashed border-[#C9BBAA] text-left text-[#5C4030] cursor-not-allowed">
                    <CreditCard className="w-[22px] h-[22px] shrink-0" aria-hidden />
                    <span className="flex-1">
                      <span className="block text-[15px] font-bold">Carte en ligne</span>
                      <span className="block text-[12.5px] font-semibold text-[#6F5A4B]">bientôt disponible</span>
                    </span>
                  </button>
                  {methodePaiement === 'Ligne' && (
                    <p role="alert" className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[#FFF8E6] text-[13.5px] font-bold text-[#92400E]">
                      <AlertCircle className="w-[17px] h-[17px] shrink-0 mt-0.5" aria-hidden />
                      Paiement en ligne indisponible pour l&apos;instant. Un règlement par carte est possible lors de la livraison.
                    </p>
                  )}
                </section>

                {/* RÉCAPITULATIF */}
                <dl className={`${carte} flex flex-col gap-2 text-[14.5px] font-semibold text-[#5C4030]`}>
                  <div className="flex justify-between gap-3"><dt>Sous-total</dt><dd className="tabular-nums">{formatPrix(sousTotalFinal + economie)}</dd></div>
                  {economie > 0.005 && (
                    <div className="flex justify-between gap-3 font-extrabold text-[#166534]"><dt>Économie promo</dt><dd className="tabular-nums">-{formatPrix(economie)}</dd></div>
                  )}
                  {remiseMontant > 0 && (
                    <div className="flex justify-between gap-3 font-extrabold text-[#166534]"><dt>Remise -{remisePct} %</dt><dd className="tabular-nums">-{formatPrix(remiseMontant)}</dd></div>
                  )}
                  {remiseCodeMontant > 0 && (
                    <div className="flex justify-between gap-3 font-extrabold text-[#166534]"><dt>Code promo -{remiseCode} %</dt><dd className="tabular-nums">-{formatPrix(remiseCodeMontant)}</dd></div>
                  )}
                  {totalApresRemise >= 10 && (
                    <div className="flex justify-between gap-3">
                      <dt>Livraison</dt>
                      <dd className={fraisLivraison === 0 ? 'font-extrabold text-[#166534]' : 'tabular-nums'}>{libelleLivraison}</dd>
                    </div>
                  )}
                  {totalApresRemise >= 10 && fraisLivraison > 0 && sousTotalFinal < SEUIL_LIVRAISON_OFFERTE && (
                    <p className="text-right text-[13px] font-bold text-[#166534]">Encore {formatPrix(SEUIL_LIVRAISON_OFFERTE - sousTotalFinal)} pour la livraison offerte</p>
                  )}
                </dl>
              </div>

              <footer className="shrink-0 bg-white border-t border-[#E8DCCB] px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3 shadow-[0_-16px_30px_-22px_rgba(61,43,31,0.45)]">
                {alertes}
                <div className="flex items-baseline justify-between gap-3">
                  <span className="titre text-[26px] leading-none">Total</span>
                  <strong className="text-[30px] font-black tracking-tight leading-none text-[#FF4500] tabular-nums">{formatPrix(totalFinal)}</strong>
                </div>
                <button type="button" disabled={confirmationImpossible} onClick={envoyerCommande} className={`${boutonPrincipal} !justify-center`}>
                  {chargement ? <Loader2 className="w-6 h-6 animate-spin" aria-label="Envoi de la commande" /> : methodePaiement === 'Ligne' ? 'Payer par carte' : 'Confirmer la commande'}
                </button>
                {!chargement && manques.length > 0 && (
                  <p className="text-center text-[12.5px] font-semibold text-[#6F5A4B]">Il manque : {manques.join(', ')}.</p>
                )}
              </footer>
            </>
          )}
        </div>
      )}
    </div>
  );
}
