'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle2, Info, Minus, Plus } from 'lucide-react';
import { estEnPromo, etiquettesPromo } from '@/lib/promos';
import { formatPrix, libelleUnite, libelleQuantite } from '@/lib/format';
import {
  getStep, getMin, quantiteInitiale, formatQuantite, uniteAffichee, bornerQuantite,
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

  const etiquettes = etiquettesPromo(promoBadges);
  const totalSimpleSansPromo = prixBase * affiche.qteEffective;
  const bouton = 'w-full min-h-[60px] lg:min-h-16 rounded-[18px] lg:rounded-[20px] text-[19px] lg:text-xl font-extrabold flex items-center justify-center gap-3 transition-[background-color,transform] duration-200';

  return (
    <>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF7A47]" aria-hidden />
          <span role="status" className="font-bold text-sm">{toast}</span>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:gap-5">
        {/* Prix unitaire de la variante affichée */}
        <div>
          <div className="flex flex-wrap items-end gap-x-3.5 gap-y-1">
            <p className={`text-4xl lg:text-[44px] font-black tracking-tight leading-none tabular-nums transition-colors duration-200 ${pv.promotion > 0 ? 'text-[#FF4500]' : 'text-[#3D2B1F]'}`}>
              {formatPrix(prixUnitaire)}<span className="text-[15px] lg:text-[17px] font-bold tracking-normal text-[#6F5A4B]"> /{unite}</span>
            </p>
            {pv.promotion > 0 && (
              <s className="mb-0.5 text-base lg:text-lg font-semibold text-[#6F5A4B]">{formatPrix(prixBase)}</s>
            )}
          </div>
          <p className="mt-1.5 text-[13px] font-semibold text-[#6F5A4B]">Vendu {libelleUnite(pv.unite)}</p>
        </div>

        {/* Promotions (celles du produit, valables sur toutes ses variantes) */}
        {enPromo && (
          <div className="flex flex-wrap items-center gap-1.5">
            {etiquettes.length === 0 && (
              <span className="px-3 py-1.5 rounded-full bg-[#D43A00] text-white text-[13px] font-extrabold">En promo</span>
            )}
            {etiquettes.map(e => (
              <span
                key={e.cle}
                className={`px-3 py-1.5 rounded-full text-white text-[13px] font-extrabold ${
                  e.cle === 'offertes' ? 'bg-[#166534]' : e.cle === 'lot' ? 'bg-[#3D2B1F]' : 'bg-[#D43A00]'}`}
              >
                {e.cle === 'degressif' ? `${e.texte} /${uniteAffichee(produit)}` : e.texte}
              </span>
            ))}
            {cumul && (
              <span className="text-[13px] font-bold text-[#C73600]">Promo valable en mélangeant les variétés</span>
            )}
          </div>
        )}

        {/* VARIANTE UNIQUE : choix de la version */}
        {variantes.length > 0 && !cumul && (
          <div>
            <p className="mb-2.5 text-sm font-bold text-[#5C4030]">{variantes.length} versions au choix</p>
            <ChoixVariantes produit={produit} variantes={variantes} selection={selection} onChoisir={onSelection} quantites={qteParVariante} />
            {lignesPanier.some((i: any) => i.variant_id && i.variant_id !== selection) && (
              <p className="mt-2.5 text-[13px] font-semibold text-[#92400E]">Une seule version par commande : l’ajouter remplacera celle de votre panier.</p>
            )}
          </div>
        )}

        {variante?.description && (
          <p key={variante.id} className="text-[15px] text-[#5C4030] leading-relaxed bg-[#F5EAE0] rounded-2xl px-4 py-3 whitespace-pre-line animate-in fade-in duration-200">{variante.description}</p>
        )}

        {/* VARIANTES CUMULABLES : une quantité par variante */}
        {cumul ? (
          <div>
            <p className="mb-2.5 text-sm font-bold text-[#5C4030]">Composez votre sélection</p>
            <ul className="flex flex-col gap-2">
              {variantes.map(v => {
                const q = quantites[v.id] ?? 0;
                const actif = v.id === selection;
                const eff = produitPourVariante(produit, v);
                const prixLigne = prixVariante(produit, v);
                const prixLigneFinal = eff.promotion > 0 ? prixLigne * (1 - eff.promotion / 100) : prixLigne;
                const image = imageVariante(produit, v);
                const dejaDansPanier = qteParVariante[v.id] ?? 0;
                return (
                  <li key={v.id} className={`flex items-center gap-2.5 rounded-2xl border-[1.5px] p-2 transition-colors ${actif ? 'border-[#3D2B1F] bg-[#FBF7F2]' : 'border-[#E8DCCB] bg-white'}`}>
                    <button type="button" onClick={() => onSelection(v.id)} className="flex items-center gap-3 min-w-0 flex-1 min-h-11 text-left" aria-label={`Voir ${v.nom}`}>
                      <span className="w-[54px] h-9 rounded-[10px] overflow-hidden bg-[#F5EAE0] shrink-0">
                        {image && <img src={image} alt="" className="w-full h-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold text-[#3D2B1F] truncate">{libelleCourt(produit, v)}</span>
                        <span className="block text-xs font-semibold text-[#6F5A4B]">
                          <span className={prixLigneFinal < prixLigne ? 'font-bold text-[#C73600]' : ''}>{formatPrix(prixLigneFinal)}/{uniteAffichee(eff)}</span>
                          {prixLigneFinal < prixLigne && <span className="line-through ml-1">{formatPrix(prixLigne)}</span>}
                          {dejaDansPanier > 0 && <span className="font-bold text-[#166534]"> · {formatQuantite(eff, dejaDansPanier)} au panier</span>}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center h-11 p-[3px] rounded-[13px] bg-[#F5EAE0] shrink-0">
                      <button type="button" onClick={() => changerQuantiteVariante(v, -1)} disabled={q <= 0} aria-label={`Retirer ${v.nom}`} className="w-10 h-full rounded-[10px] bg-white flex items-center justify-center text-[#3D2B1F] disabled:text-[#C9BBAA] active:scale-90 transition-transform"><Minus className="w-4 h-4" strokeWidth={2.6} aria-hidden /></button>
                      <span className="w-12 text-center text-sm font-extrabold tabular-nums">{q > 0 ? formatQuantite(eff, q) : '0'}</span>
                      <button type="button" onClick={() => changerQuantiteVariante(v, 1)} disabled={maxVariante(v) - q <= 0} aria-label={`Ajouter ${v.nom}`} className="w-10 h-full rounded-[10px] bg-[#3D2B1F] flex items-center justify-center text-[#F5EAE0] disabled:bg-[#C9BBAA] active:scale-90 transition-transform"><Plus className="w-4 h-4" strokeWidth={2.6} aria-hidden /></button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 rounded-[20px] bg-[#F5EAE0] px-4 py-3.5">
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm font-bold text-[#5C4030]">
                  {lignesSelection.length > 0 ? `Sélection : ${lignesSelection.length} variété${lignesSelection.length > 1 ? 's' : ''}` : 'Aucune variété choisie'}
                </span>
                <div className="flex items-baseline gap-2">
                  {economieSelection > 0.005 && (
                    <s className="text-[13px] font-semibold text-[#6F5A4B]">{formatPrix(calculSelection.total + economieSelection)}</s>
                  )}
                  <span className={`text-[26px] font-black tracking-tight tabular-nums ${economieSelection > 0.005 ? 'text-[#FF4500]' : 'text-[#3D2B1F]'}`}>{formatPrix(calculSelection.total)}</span>
                </div>
              </div>
              {suggestion && (
                <p className="mt-1.5 text-[13px] font-bold text-[#B83200]">{suggestion.texte}{qtePanierUniteProduit > 0 ? ' (avec votre panier)' : ''}</p>
              )}
              {lignesPanier.length > 0 && (
                <p className="mt-1 text-[13px] font-semibold text-[#6F5A4B]">Déjà au panier : {lignesPanier.map((i: any) => `${formatQuantite(i, Number(i.quantite))} ${i.variant_nom ? libelleCourt(produit, { nom: i.variant_nom }) : produit.name}`).join(' · ')}</p>
              )}
            </div>
          </div>
        ) : (
          /* Quantité et total (une variante) */
          <div className="flex items-center justify-between gap-4 rounded-[20px] bg-[#F5EAE0] px-4 py-3.5 lg:px-[18px] lg:py-4">
            <div>
              <p className="mb-2 text-sm font-bold text-[#5C4030]">Quantité</p>
              <div className="flex items-center w-[176px] lg:w-[190px] h-[52px] p-[3px] rounded-2xl bg-white border-[1.5px] border-[#E0D3C0]">
                <button
                  type="button"
                  onClick={() => changerQuantite(quantite - getStep(pv))}
                  disabled={quantite <= getMin(pv)}
                  aria-label="Diminuer la quantité"
                  className="shrink-0 w-[46px] h-full rounded-xl bg-[#F5EAE0] text-[#3D2B1F] flex items-center justify-center active:scale-90 transition-transform disabled:text-[#C9BBAA] disabled:cursor-not-allowed"
                ><Minus className="w-[18px] h-[18px]" strokeWidth={2.6} aria-hidden /></button>
                <span aria-live="polite" className="flex-1 text-center text-base font-extrabold tabular-nums whitespace-nowrap">{libelleQuantite(pv, quantite)}</span>
                <button
                  type="button"
                  onClick={() => changerQuantite(quantite + getStep(pv))}
                  disabled={quantite >= stockRestant}
                  aria-label="Augmenter la quantité"
                  className="shrink-0 w-[46px] h-full rounded-xl bg-[#3D2B1F] text-[#F5EAE0] flex items-center justify-center active:scale-90 transition-transform disabled:bg-[#C9BBAA] disabled:cursor-not-allowed"
                ><Plus className="w-[18px] h-[18px]" strokeWidth={2.6} aria-hidden /></button>
              </div>
            </div>
            <p className="text-right text-sm font-semibold text-[#6F5A4B] leading-tight">
              Total
              {affiche.totalEconomy > 0.005 && <s className="ml-2 text-[13px]">{formatPrix(totalSimpleSansPromo)}</s>}
              <strong className={`block mt-0.5 text-[26px] font-black tracking-tight tabular-nums ${affiche.totalEconomy > 0.005 ? 'text-[#FF4500]' : 'text-[#3D2B1F]'}`}>{formatPrix(affiche.totalPrice)}</strong>
              {affiche.totalEconomy > 0.005 && (
                <span className="block mt-0.5 text-[13px] font-extrabold text-[#166534]">Économie : {formatPrix(affiche.totalEconomy)}</span>
              )}
              {affiche.produitsOfferts > 0 && (
                <span className="block mt-0.5 text-[13px] font-extrabold text-[#166534]">+ {affiche.produitsOfferts} offert{affiche.produitsOfferts > 1 ? 's' : ''} dans le panier</span>
              )}
            </p>
          </div>
        )}

        <div ref={zoneBouton}>
          <button
            type="button"
            disabled={!peutAjouter}
            onClick={ajouter}
            className={`${bouton} ${
              peutAjouter
                ? 'bg-[#FF4500] text-white shadow-[0_18px_34px_-14px_rgba(255,69,0,0.55)] hover:bg-[#E63E00] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
                : 'bg-[#EDE3D5] text-[#6F5A4B] cursor-not-allowed'
            }`}
          >
            {epuise ? (
              <><Info className="w-5 h-5" aria-hidden /> Produit épuisé</>
            ) : cumul ? (
              <><ShoppingCart className="w-[22px] h-[22px]" aria-hidden /> {lignesSelection.length > 0 ? `Ajouter la sélection · ${formatPrix(calculSelection.total)}` : 'Choisissez vos variétés'}</>
            ) : (
              <><ShoppingCart className="w-[22px] h-[22px]" aria-hidden /> Ajouter au panier</>
            )}
          </button>
        </div>

        {!epuise && !cumul && stockDisponible(pv) < (pv.unite === 'g' ? 500 : 5) && (
          <p className="flex items-center justify-center gap-2 text-[13px] font-bold text-[#C73600]">
            <span className="ss-pouls w-1.5 h-1.5 bg-[#FF4500] rounded-full" />
            Derniers exemplaires !
          </p>
        )}
      </div>

      {/* Barre d'achat fixe (mobile) : apparaît quand le bouton principal n'est plus à l'écran */}
      {!epuise && (
        <div className={`lg:hidden fixed bottom-0 inset-x-0 z-[90] bg-white/95 backdrop-blur-md border-t border-[#E8DCCB] px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2.5 shadow-[0_-16px_30px_-22px_rgba(61,43,31,0.45)] transition-transform duration-300 ${boutonVisible ? 'translate-y-full' : 'translate-y-0'}`}>
          {cumul ? (
            <p className="shrink-0 pl-1 leading-tight">
              <span className={`block text-lg font-black tabular-nums ${economieSelection > 0.005 ? 'text-[#FF4500]' : 'text-[#3D2B1F]'}`}>{formatPrix(totalBarre)}</span>
              <span className="block text-xs font-semibold text-[#6F5A4B]">{lignesSelection.length} variété{lignesSelection.length > 1 ? 's' : ''}</span>
            </p>
          ) : (
            <div className="shrink-0 flex items-center h-[52px] p-[3px] rounded-2xl bg-[#F5EAE0]">
              <button type="button" onClick={() => changerQuantite(quantite - getStep(pv))} disabled={quantite <= getMin(pv)} tabIndex={boutonVisible ? -1 : 0} aria-label="Diminuer la quantité" className="w-11 h-full rounded-[13px] bg-white text-[#3D2B1F] flex items-center justify-center active:scale-90 transition-transform disabled:text-[#C9BBAA]"><Minus className="w-[17px] h-[17px]" strokeWidth={2.6} aria-hidden /></button>
              <span className="min-w-[46px] px-1 text-center text-sm font-extrabold tabular-nums whitespace-nowrap">{pv.unite === 'g' || pv.unite === 'kg' ? libelleQuantite(pv, quantite) : quantite}</span>
              <button type="button" onClick={() => changerQuantite(quantite + getStep(pv))} disabled={quantite >= stockRestant} tabIndex={boutonVisible ? -1 : 0} aria-label="Augmenter la quantité" className="w-11 h-full rounded-[13px] bg-[#3D2B1F] text-[#F5EAE0] flex items-center justify-center active:scale-90 transition-transform disabled:bg-[#C9BBAA]"><Plus className="w-[17px] h-[17px]" strokeWidth={2.6} aria-hidden /></button>
            </div>
          )}
          <button
            type="button"
            onClick={ajouter}
            disabled={!peutAjouter}
            tabIndex={boutonVisible ? -1 : 0}
            className="flex-1 min-w-0 h-[52px] px-4 rounded-2xl bg-[#FF4500] text-white text-[19px] font-extrabold flex items-center justify-between gap-2 active:scale-[0.98] transition-transform disabled:bg-[#EDE3D5] disabled:text-[#6F5A4B]"
          >
            {cumul ? <span className="mx-auto text-base">Ajouter la sélection</span> : <><span>Ajouter</span><span className="tabular-nums">{formatPrix(totalBarre)}</span></>}
          </button>
        </div>
      )}
    </>
  );
}
