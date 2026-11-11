'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle2, TrendingDown, Tag, Flame, Info, Minus, Plus } from 'lucide-react';
import { premieresOffertes, libellePremieresOffertes, estEnPromo } from '@/lib/promos';
import {
  getStep, getMin, quantiteInitiale, formatGramLabel, formatQuantite, uniteAffichee, bornerQuantite,
  calculerPrixAffiche, ajouterAuPanier, lirePanier, calculerPanier, ligneDepuisProduit, stockDisponible,
} from '@/lib/panier';
import { prochainePromo } from '@/lib/prix';
import { imageVariante, libelleCourt, prixVariante, variantesCumulables, produitPourVariante, memeUniteQueProduit, type Variante } from '@/lib/variantes';
import ChoixVariantes from '@/components/ChoixVariantes';

// Bloc prix + variantes + quantité + ajout au panier de la page produit.
// Même calcul et même panier que le catalogue (src/lib/panier.ts).
// - Produit sans variante ou à variante unique : choix de la version puis quantité.
// - Variantes cumulables : une quantité par variante, total calculé avec les
//   promotions du produit sur l'ensemble (ex. 1 laitue + 1 batavia + 1 sucrine).
export default function AchatProduit({
  produit, variantes, selection, onSelection,
}: {
  produit: any;
  variantes: Variante[];
  selection: string | null;
  onSelection: (id: string) => void;
}) {
  const cumul = variantes.length > 0 && variantesCumulables(produit);
  const variante = variantes.find(v => v.id === selection) ?? null;
  // Produit vu à travers la variante affichée : unité, pas, remise, stock et promos
  const pv = produitPourVariante(produit, variante);
  const [quantite, setQuantite] = useState<number>(quantiteInitiale(pv));
  const [quantites, setQuantites] = useState<Record<string, number>>({}); // mode cumul
  const [toast, setToast] = useState<string | null>(null);
  const [boutonVisible, setBoutonVisible] = useState(true);
  const [panier, setPanier] = useState<any[]>([]);
  const [selectionVue, setSelectionVue] = useState(selection);
  const zoneBouton = useRef<HTMLDivElement>(null);

  // Changement de variante : quantité de départ dans l'unité de la nouvelle variante
  if (selection !== selectionVue) {
    setSelectionVue(selection);
    setQuantite(quantiteInitiale(pv));
  }

  useEffect(() => {
    const lire = () => setPanier(lirePanier());
    lire();
    window.addEventListener('panier-updated', lire);
    window.addEventListener('storage', lire);
    return () => { window.removeEventListener('panier-updated', lire); window.removeEventListener('storage', lire); };
  }, []);

  // Barre « Ajouter » fixée en bas de l'écran sur mobile, seulement quand le
  // bouton principal n'est plus visible.
  useEffect(() => {
    const el = zoneBouton.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entree]) => setBoutonVisible(entree.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const prixBase = prixVariante(produit, variante);
  const promoBadges = cumul ? produit : pv; // cumul : promotions communes du produit
  const enPromo = estEnPromo(promoBadges) || (cumul && variantes.some(v => (Number(v.promotion) || 0) > 0));
  const unite = uniteAffichee(pv);
  const prixUnitaire = pv.promotion > 0 ? prixBase * (1 - pv.promotion / 100) : prixBase;

  // Déjà dans le panier pour ce produit
  const lignesPanier = panier.filter((i: any) => String(i.id) === String(produit.id));
  const qteParVariante = Object.fromEntries(lignesPanier.map((i: any) => [i.variant_id ?? '', Number(i.quantite) || 0]));
  const qtePanierPartagee = lignesPanier.filter((i: any) => i.stock_partage !== false).reduce((s: number, i: any) => s + (Number(i.quantite) || 0), 0);
  const qtePanierUniteProduit = lignesPanier.filter((i: any) => (i.unite ?? null) === (produit.unite ?? null)).reduce((s: number, i: any) => s + (Number(i.quantite) || 0), 0);

  // Stock restant pour une variante : son stock propre, sinon le stock partagé
  // du produit (variantes de même unité), sinon illimité.
  const stockRestantPour = (v: Variante | null, autresSelection = 0) => {
    const eff = produitPourVariante(produit, v);
    if (v && v.stock != null) return Number(v.stock) - (qteParVariante[v.id] ?? 0) - autresSelection;
    if (eff.stock == null) return Infinity;
    return Number(eff.stock) - qtePanierPartagee - autresSelection;
  };

  // --- Mode simple (une quantité) ---
  const stockRestant = stockRestantPour(variante);
  const affiche = calculerPrixAffiche(pv, quantite, prixBase);
  const libelleQuantite = pv.unite === 'g' ? formatGramLabel(affiche.totalItemsRecus) : affiche.totalItemsRecus;

  // --- Mode cumul (une quantité par variante) ---
  const lignesSelection = variantes.filter(v => (quantites[v.id] ?? 0) > 0);
  const lignesCalcul = lignesSelection.map(v => ligneDepuisProduit(produit, v, quantites[v.id]));
  const calculSelection = calculerPanier(lignesCalcul);
  const economieSelection = calculSelection.economie;
  const qteSelectionUniteProduit = lignesCalcul.filter(l => (l.unite ?? null) === (produit.unite ?? null)).reduce((s, l) => s + l.quantite, 0);
  const suggestion = cumul ? prochainePromo(produit, qteSelectionUniteProduit + qtePanierUniteProduit) : null;

  const notifier = (texte: string) => {
    setToast(texte);
    setTimeout(() => setToast(null), 2200);
  };

  const ajouterSimple = () => {
    const remplace = ajouterAuPanier(produit, quantite || 1, variante);
    notifier(remplace && variante ? `Remplacé par : ${libelleCourt(produit, variante)}` : 'Ajouté au panier !');
    setQuantite(quantiteInitiale(pv));
  };

  const ajouterSelection = () => {
    if (lignesSelection.length === 0) return;
    lignesSelection.forEach(v => ajouterAuPanier(produit, quantites[v.id], v));
    notifier(`${lignesSelection.length > 1 ? `${lignesSelection.length} variétés ajoutées` : 'Ajouté au panier !'}`);
    setQuantites({});
  };

  const changerQuantite = (val: number) => setQuantite(bornerQuantite(pv, String(val), stockRestant));
  // Mode cumul : chaque variante a son pas (unité) et sa limite de stock
  const maxVariante = (v: Variante) => {
    const partage = v.stock == null && memeUniteQueProduit(produit, v);
    const autres = partage
      ? variantes.filter(x => x.id !== v.id && x.stock == null && memeUniteQueProduit(produit, x)).reduce((s, x) => s + (quantites[x.id] ?? 0), 0)
      : 0;
    return stockRestantPour(v, autres);
  };
  const changerQuantiteVariante = (v: Variante, delta: number) => {
    const eff = produitPourVariante(produit, v);
    setQuantites(prev => {
      const actuelle = prev[v.id] ?? 0;
      let q = parseFloat((actuelle + delta * getStep(eff)).toFixed(2));
      if (delta > 0 && actuelle === 0) q = getMin(eff);
      if (q < getMin(eff)) q = 0;
      q = Math.min(q, Math.max(maxVariante(v), 0));
      return { ...prev, [v.id]: q };
    });
    onSelection(v.id);
  };

  const epuise = cumul ? variantes.every(v => maxVariante(v) <= 0) : stockRestant <= 0 && stockDisponible(pv) <= 0;
  const peutAjouter = cumul ? lignesSelection.length > 0 : !epuise && stockRestant > 0;
  const ajouter = cumul ? ajouterSelection : ajouterSimple;
  const totalBarre = cumul ? calculSelection.total : affiche.totalPrice;

  return (
    <>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF4500]" />
          <span className="font-black text-[10px] uppercase tracking-widest">{toast}</span>
        </div>
      )}

      <div className={`bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border shadow-sm ${enPromo ? 'border-[#FF4500]/40 ring-2 ring-[#FF4500]/10' : 'border-[#DDD0BF]'}`}>
        {/* Promotions (celles du produit, valables sur toutes ses variantes) */}
        {enPromo && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="bg-gradient-to-r from-[#FF4500] to-[#FF7A1A] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow flex items-center gap-1 uppercase tracking-wider">
              <Flame className="w-3 h-3" /> En promo
            </span>
            {Number(promoBadges.promotion) > 0 && (
              <span className="bg-white text-[#FF4500] border border-[#FF4500]/30 text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3" /> -{promoBadges.promotion}%
              </span>
            )}
            {promoBadges.seuil_achat > 0 && promoBadges.quantite_offerte > 0 && (
              <span className="bg-[#3D2B1F] text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase">
                🎁 {promoBadges.seuil_achat} achetés = {promoBadges.quantite_offerte} offert(s)
              </span>
            )}
            {promoBadges.seuil_promo_qte > 0 && promoBadges.prix_promo > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                À partir de {promoBadges.seuil_promo_qte}{promoBadges.unite === 'g' ? 'kg' : promoBadges.unite === 'pièce' ? ' pcs' : ` ${promoBadges.unite}`} : {Number(promoBadges.prix_promo).toFixed(2)}€/{uniteAffichee(produit)}
              </span>
            )}
            {premieresOffertes(promoBadges) > 0 && (
              <span className="bg-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase">
                🎁 {libellePremieresOffertes(promoBadges)}
              </span>
            )}
            {cumul && (
              <span className="text-[10px] font-black text-[#FF4500] px-1 py-1.5 uppercase tracking-wide">Promo valable en mélangeant les variétés</span>
            )}
          </div>
        )}

        {/* Prix unitaire de la variante affichée */}
        <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
          <span className={`text-3xl font-black tracking-tight transition-colors duration-200 tabular-nums ${pv.promotion > 0 ? 'text-[#FF4500]' : 'text-slate-900'}`}>
            {prixUnitaire.toFixed(2)}€<span className="text-base">/{unite}</span>
          </span>
          {pv.promotion > 0 && (
            <span className="text-base line-through text-slate-400 font-bold">{prixBase.toFixed(2)}€/{unite}</span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
          {pv.unite === 'g' ? 'Vendu au gramme' : `Vendu ${pv.unite === 'kg' ? 'au' : 'à la'} ${pv.unite || 'pièce'}`}
        </p>

        {/* VARIANTE UNIQUE : choix de la version */}
        {variantes.length > 0 && !cumul && (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Choisissez votre version</p>
            <ChoixVariantes produit={produit} variantes={variantes} selection={selection} onChoisir={onSelection} quantites={qteParVariante} />
            {lignesPanier.some((i: any) => i.variant_id && i.variant_id !== selection) && (
              <p className="text-[10px] font-bold text-amber-600 mt-2">Une seule version par commande : l’ajouter remplacera celle de votre panier.</p>
            )}
          </div>
        )}

        {variante?.description && (
          <p key={variante.id} className="text-sm text-slate-600 leading-relaxed mb-4 bg-[#FBF7F2] rounded-xl px-3 py-2.5 whitespace-pre-line animate-in fade-in duration-200">{variante.description}</p>
        )}

        {/* VARIANTES CUMULABLES : une quantité par variante */}
        {cumul ? (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Composez votre sélection</p>
            <ul className="space-y-1.5">
              {variantes.map(v => {
                const q = quantites[v.id] ?? 0;
                const actif = v.id === selection;
                const eff = produitPourVariante(produit, v);
                const prixLigne = prixVariante(produit, v);
                const prixLigneFinal = eff.promotion > 0 ? prixLigne * (1 - eff.promotion / 100) : prixLigne;
                const image = imageVariante(produit, v);
                const dejaDansPanier = qteParVariante[v.id] ?? 0;
                return (
                  <li key={v.id} className={`flex items-center gap-2.5 rounded-xl border p-2 transition-colors ${actif ? 'border-[#3D2B1F] bg-[#FBF7F2]' : 'border-[#EDE3D5] bg-white'}`}>
                    <button type="button" onClick={() => onSelection(v.id)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left" aria-label={`Voir ${v.nom}`}>
                      <span className="w-12 h-8 rounded-lg overflow-hidden bg-[#EDE3D5] shrink-0">
                        {image && <img src={image} alt="" className="w-full h-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-tight text-slate-800 truncate">{libelleCourt(produit, v)}</span>
                        <span className="block text-[10px] font-bold text-slate-400">
                          <span className={prixLigneFinal < prixLigne ? 'text-[#FF4500]' : ''}>{prixLigneFinal.toFixed(2)}€/{uniteAffichee(eff)}</span>
                          {prixLigneFinal < prixLigne && <span className="line-through ml-1">{prixLigne.toFixed(2)}€</span>}
                          {dejaDansPanier > 0 && <span className="text-[#FF4500]"> · {formatQuantite(eff, dejaDansPanier)} au panier</span>}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center bg-white rounded-lg border border-[#D5C9B8] overflow-hidden shrink-0">
                      <button type="button" onClick={() => changerQuantiteVariante(v, -1)} disabled={q <= 0} aria-label={`Retirer ${v.nom}`} className="w-8 h-8 flex items-center justify-center text-slate-700 disabled:text-slate-300"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-12 text-center text-xs font-black tabular-nums">{q > 0 ? formatQuantite(eff, q) : '0'}</span>
                      <button type="button" onClick={() => changerQuantiteVariante(v, 1)} disabled={maxVariante(v) - q <= 0} aria-label={`Ajouter ${v.nom}`} className="w-8 h-8 flex items-center justify-center text-slate-700 disabled:text-slate-300"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={`mt-3 rounded-2xl p-3 border ${enPromo ? 'bg-orange-50/70 border-[#FF4500]/20' : 'bg-[#EDE3D5] border-[#D5C9B8]/50'}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  {lignesSelection.length > 0 ? `Sélection : ${lignesSelection.length} variété${lignesSelection.length > 1 ? 's' : ''}` : 'Aucune variété choisie'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black tabular-nums ${economieSelection > 0.005 ? 'text-[#FF4500]' : 'text-slate-900'}`}>{calculSelection.total.toFixed(2)}€</span>
                  {economieSelection > 0.005 && (
                    <span className="text-xs line-through text-slate-300 font-bold italic">{(calculSelection.total + economieSelection).toFixed(2)}€</span>
                  )}
                </div>
              </div>
              {suggestion && (
                <p className="mt-1.5 text-[10px] font-black text-[#FF4500]">{suggestion.texte}{qtePanierUniteProduit > 0 ? ' (avec votre panier)' : ''}</p>
              )}
              {lignesPanier.length > 0 && (
                <p className="mt-1 text-[10px] font-bold text-slate-500">Déjà au panier : {lignesPanier.map((i: any) => `${formatQuantite(i, Number(i.quantite))} ${i.variant_nom ? libelleCourt(produit, { nom: i.variant_nom }) : produit.name}`).join(' · ')}</p>
              )}
            </div>
          </div>
        ) : (
          /* Quantité et total (une variante) */
          <div className={`rounded-2xl p-3 mb-4 border ${enPromo ? 'bg-orange-50/70 border-[#FF4500]/20' : 'bg-[#EDE3D5] border-[#D5C9B8]/50'}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantité</span>
              <div className="flex items-center bg-white rounded-xl shadow-sm border border-[#D5C9B8] overflow-hidden">
                <button
                  onClick={() => changerQuantite(quantite - getStep(pv))}
                  disabled={quantite <= getMin(pv)}
                  aria-label="Diminuer la quantité"
                  className="px-4 py-2 hover:bg-[#EDE3D5] text-slate-900 font-bold transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
                >-</button>
                <span className="w-20 text-center font-black text-sm tabular-nums">
                  {pv.unite === 'g' ? formatGramLabel(quantite) : quantite}
                </span>
                <button
                  onClick={() => changerQuantite(quantite + getStep(pv))}
                  disabled={quantite >= stockRestant}
                  aria-label="Augmenter la quantité"
                  className="px-4 py-2 hover:bg-[#EDE3D5] text-slate-900 font-bold transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
                >+</button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black ${affiche.prixDegressifActif ? 'text-blue-600' : affiche.totalEconomy > 0.005 ? 'text-[#FF4500]' : 'text-slate-900'}`}>{affiche.totalPrice.toFixed(2)}€</span>
                {(pv.promotion > 0 || affiche.prixDegressifActif || affiche.nbPremieresOffertes > 0) && (
                  <span className="text-xs line-through text-slate-300 font-bold italic">{(prixBase * affiche.qteEffective).toFixed(2)}€</span>
                )}
              </div>
              {affiche.totalEconomy > 0 && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${affiche.prixDegressifActif ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'}`}>
                  <TrendingDown className="w-3 h-3" />-{affiche.totalEconomy.toFixed(2)}€
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={zoneBouton}>
          <button
            disabled={!peutAjouter}
            onClick={ajouter}
            className={`w-full py-4 rounded-[1.25rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
              peutAjouter ? 'bg-[#3D2B1F] text-white hover:bg-[#FF4500] shadow-xl active:scale-95' : 'bg-[#DDD0BF] text-slate-400 cursor-not-allowed'
            }`}
          >
            {epuise ? (
              <><Info className="w-4 h-4" /> Produit épuisé</>
            ) : cumul ? (
              <><ShoppingCart className="w-4 h-4" /> {lignesSelection.length > 0 ? `Ajouter la sélection · ${calculSelection.total.toFixed(2)}€` : 'Choisissez vos variétés'}</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Ajouter {libelleQuantite} au panier</>
            )}
          </button>
        </div>

        {!epuise && !cumul && stockDisponible(pv) < (pv.unite === 'g' ? 500 : 5) && (
          <div className="flex mt-4 items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF4500]">Derniers exemplaires !</p>
          </div>
        )}
      </div>

      {/* Barre d'achat fixe (mobile) */}
      {!epuise && (
        <div className={`lg:hidden fixed bottom-0 inset-x-0 z-[90] bg-white/95 backdrop-blur-md border-t border-[#D5C9B8] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ${boutonVisible ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="min-w-0">
            <p className={`text-lg font-black leading-none ${cumul ? (economieSelection > 0.005 ? 'text-[#FF4500]' : 'text-slate-900') : (affiche.totalEconomy > 0.005 ? 'text-[#FF4500]' : 'text-slate-900')}`}>{totalBarre.toFixed(2)}€</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {cumul ? `${lignesSelection.length} variété${lignesSelection.length > 1 ? 's' : ''}` : variante ? libelleCourt(produit, variante) : pv.unite === 'g' ? formatGramLabel(quantite) : `${quantite} ${unite}`}
            </p>
          </div>
          <button
            onClick={ajouter}
            disabled={!peutAjouter}
            tabIndex={boutonVisible ? -1 : 0}
            className="flex-1 py-3.5 rounded-xl bg-[#3D2B1F] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 hover:bg-[#FF4500] transition-all disabled:bg-[#DDD0BF] disabled:text-slate-400"
          >
            <ShoppingCart className="w-4 h-4" /> {cumul ? 'Ajouter la sélection' : 'Ajouter au panier'}
          </button>
        </div>
      )}
    </>
  );
}
