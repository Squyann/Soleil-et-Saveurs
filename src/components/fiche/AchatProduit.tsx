'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, CheckCircle2, TrendingDown, Tag, Flame, Info } from 'lucide-react';
import { premieresOffertes, libellePremieresOffertes, estEnPromo } from '@/lib/promos';
import { getStep, getMin, quantiteInitiale, formatGramLabel, uniteAffichee, bornerQuantite, calculerPrixAffiche, ajouterAuPanier } from '@/lib/panier';

// Bloc prix + quantité + ajout au panier de la page produit. Même calcul et
// même panier que le catalogue (src/lib/panier.ts).
export default function AchatProduit({ produit, variantes }: { produit: any; variantes: any[] }) {
  const [quantite, setQuantite] = useState<number>(quantiteInitiale(produit));
  const [varianteId, setVarianteId] = useState<string>(variantes[0]?.id ?? '');
  const [toast, setToast] = useState(false);
  const [boutonVisible, setBoutonVisible] = useState(true);
  const zoneBouton = useRef<HTMLDivElement>(null);

  // Barre « Ajouter » fixée en bas de l'écran sur mobile, seulement quand le
  // bouton principal n'est plus visible.
  useEffect(() => {
    const el = zoneBouton.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entree]) => setBoutonVisible(entree.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stock = produit.stock;
  const variante = variantes.find(v => v.id === varianteId) || variantes[0] || null;
  const { qteEffective, prixDegressifActif, nbPremieresOffertes, totalPrice, totalEconomy, totalItemsRecus } = calculerPrixAffiche(produit, quantite);
  const enPromo = estEnPromo(produit);
  const unite = uniteAffichee(produit);
  const prixUnitaire = produit.promotion > 0 ? produit.price * (1 - produit.promotion / 100) : produit.price;
  const libelleQuantite = produit.unite === 'g' ? formatGramLabel(totalItemsRecus) : totalItemsRecus;

  const ajouter = () => {
    ajouterAuPanier(produit, quantite || 1, variante);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
    setQuantite(quantiteInitiale(produit));
  };

  const changerQuantite = (val: number) => setQuantite(bornerQuantite(produit, String(val), stock));

  return (
    <>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-[#3D2B1F] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#FF4500]" />
          <span className="font-black text-[10px] uppercase tracking-widest">Ajouté au panier !</span>
        </div>
      )}

      <div className={`bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border shadow-sm ${enPromo ? 'border-[#FF4500]/40 ring-2 ring-[#FF4500]/10' : 'border-[#DDD0BF]'}`}>
        {/* Promotions */}
        {enPromo && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="bg-gradient-to-r from-[#FF4500] to-[#FF7A1A] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow flex items-center gap-1 uppercase tracking-wider">
              <Flame className="w-3 h-3" /> En promo
            </span>
            {produit.promotion > 0 && (
              <span className="bg-white text-[#FF4500] border border-[#FF4500]/30 text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3" /> -{produit.promotion}%
              </span>
            )}
            {produit.seuil_achat > 0 && produit.quantite_offerte > 0 && (
              <span className="bg-[#3D2B1F] text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase">
                🎁 {produit.seuil_achat} achetés = {produit.quantite_offerte} offert(s)
              </span>
            )}
            {produit.seuil_promo_qte > 0 && produit.prix_promo > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                À partir de {produit.seuil_promo_qte}{produit.unite === 'g' ? 'kg' : produit.unite === 'pièce' ? ' pcs' : ` ${produit.unite}`} : {produit.prix_promo.toFixed(2)}€/{unite}
              </span>
            )}
            {premieresOffertes(produit) > 0 && (
              <span className="bg-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase">
                🎁 {libellePremieresOffertes(produit)}
              </span>
            )}
          </div>
        )}

        {/* Prix unitaire */}
        <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
          <span className={`text-3xl font-black tracking-tight ${produit.promotion > 0 ? 'text-[#FF4500]' : 'text-slate-900'}`}>
            {prixUnitaire.toFixed(2)}€<span className="text-base">/{unite}</span>
          </span>
          {produit.promotion > 0 && (
            <span className="text-base line-through text-slate-400 font-bold">{produit.price.toFixed(2)}€/{unite}</span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
          {produit.unite === 'g' ? 'Vendu au gramme' : `Vendu ${produit.unite === 'kg' ? 'au' : 'à la'} ${produit.unite || 'pièce'}`}
        </p>

        {/* Variété */}
        {variantes.length > 0 && (
          <div className="mb-4">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Variété</label>
            <select
              value={varianteId}
              onChange={(e) => { setVarianteId(e.target.value); setQuantite(getMin(produit)); }}
              className="w-full p-3 text-sm font-bold border border-[#D5C9B8] bg-white rounded-xl focus:outline-none focus:border-[#FF4500]"
            >
              {variantes.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
            </select>
          </div>
        )}

        {/* Quantité et total */}
        <div className={`rounded-2xl p-3 mb-4 border ${enPromo ? 'bg-orange-50/70 border-[#FF4500]/20' : 'bg-[#EDE3D5] border-[#D5C9B8]/50'}`}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantité</span>
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-[#D5C9B8] overflow-hidden">
              <button
                onClick={() => changerQuantite(quantite - getStep(produit))}
                disabled={quantite <= getMin(produit)}
                aria-label="Diminuer la quantité"
                className="px-4 py-2 hover:bg-[#EDE3D5] text-slate-900 font-bold transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
              >-</button>
              <span className="w-20 text-center font-black text-sm">
                {produit.unite === 'g' ? formatGramLabel(quantite) : quantite}
              </span>
              <button
                onClick={() => changerQuantite(quantite + getStep(produit))}
                disabled={quantite >= stock}
                aria-label="Augmenter la quantité"
                className="px-4 py-2 hover:bg-[#EDE3D5] text-slate-900 font-bold transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
              >+</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${prixDegressifActif ? 'text-blue-600' : totalEconomy > 0.005 ? 'text-[#FF4500]' : 'text-slate-900'}`}>{totalPrice.toFixed(2)}€</span>
              {(produit.promotion > 0 || prixDegressifActif || nbPremieresOffertes > 0) && (
                <span className="text-xs line-through text-slate-300 font-bold italic">{(produit.price * qteEffective).toFixed(2)}€</span>
              )}
            </div>
            {totalEconomy > 0 && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${prixDegressifActif ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'}`}>
                <TrendingDown className="w-3 h-3" />-{totalEconomy.toFixed(2)}€
              </div>
            )}
          </div>
        </div>

        <div ref={zoneBouton}>
          <button
            disabled={stock <= 0}
            onClick={ajouter}
            className={`w-full py-4 rounded-[1.25rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${
              stock > 0 ? 'bg-[#3D2B1F] text-white hover:bg-[#FF4500] shadow-xl active:scale-95' : 'bg-[#DDD0BF] text-slate-400 cursor-not-allowed'
            }`}
          >
            {stock > 0 ? (
              <><ShoppingCart className="w-4 h-4" /> Ajouter {libelleQuantite} au panier</>
            ) : (
              <><Info className="w-4 h-4" /> Produit épuisé</>
            )}
          </button>
        </div>

        {stock > 0 && stock < (produit.unite === 'g' ? 500 : 5) && (
          <div className="flex mt-4 items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-widest text-[#FF4500]">Derniers exemplaires !</p>
          </div>
        )}
      </div>

      {/* Barre d'achat fixe (mobile) */}
      {stock > 0 && (
        <div className={`lg:hidden fixed bottom-0 inset-x-0 z-[90] bg-white/95 backdrop-blur-md border-t border-[#D5C9B8] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 ${boutonVisible ? 'translate-y-full' : 'translate-y-0'}`}>
          <div className="min-w-0">
            <p className={`text-lg font-black leading-none ${totalEconomy > 0.005 ? 'text-[#FF4500]' : 'text-slate-900'}`}>{totalPrice.toFixed(2)}€</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {produit.unite === 'g' ? formatGramLabel(quantite) : `${quantite} ${unite}`}
            </p>
          </div>
          <button
            onClick={ajouter}
            tabIndex={boutonVisible ? -1 : 0}
            className="flex-1 py-3.5 rounded-xl bg-[#3D2B1F] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 hover:bg-[#FF4500] transition-all"
          >
            <ShoppingCart className="w-4 h-4" /> Ajouter au panier
          </button>
        </div>
      )}
    </>
  );
}
