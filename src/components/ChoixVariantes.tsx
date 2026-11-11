'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { libelleCourt, prixVariante, produitPourVariante, uniteVariante, type Variante } from '@/lib/variantes';

const uniteTexte = (u: string | null | undefined) => (u === 'g' ? 'kg' : u || 'pièce');

// Prix unitaire affiché pour une variante (avec sa remise % éventuelle)
function prixAffiche(produit: any, v: Variante) {
  const base = prixVariante(produit, v);
  const pct = Number(produitPourVariante(produit, v).promotion) || 0;
  return { base, final: pct > 0 ? base * (1 - pct / 100) : base, unite: uniteTexte(uniteVariante(produit, v)) };
}

// Précharge les photos des variantes (au survol / premier toucher) pour que le
// changement de photo soit immédiat.
function prechargerImages(variantes: Variante[]) {
  variantes.forEach(v => { if (v.image_url) { const img = new Image(); img.src = v.image_url; } });
}

// Boutons de choix de la variante (catalogue et page produit). La variante
// sélectionnée est mise en évidence ; le prix apparaît quand il diffère.
// Mode compact (carte du catalogue) : ruban qui défile, avec dégradés et
// flèches qui n'apparaissent que s'il reste des choix dans cette direction.
export default function ChoixVariantes({
  produit, variantes, selection, onChoisir, compact = false, quantites,
}: {
  produit: any;
  variantes: Variante[];
  selection: string | null;
  onChoisir: (id: string) => void;
  compact?: boolean;
  quantites?: Record<string, number>; // déjà dans le panier, par variante
}) {
  const piste = useRef<HTMLDivElement>(null);
  const [bords, setBords] = useState({ gauche: false, droite: false });
  const precharge = useRef(false);

  const infos = variantes.map(v => prixAffiche(produit, v));
  const prixDifferents = new Set(infos.map(i => `${i.final.toFixed(2)}/${i.unite}`)).size > 1;

  const mesurer = useCallback(() => {
    const el = piste.current;
    if (!el) return;
    const gauche = el.scrollLeft > 2;
    const droite = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setBords(b => (b.gauche === gauche && b.droite === droite ? b : { gauche, droite }));
  }, []);

  useEffect(() => {
    if (!compact) return;
    const el = piste.current;
    if (!el) return;
    mesurer();
    const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(mesurer) : null;
    obs?.observe(el);
    return () => obs?.disconnect();
  }, [compact, mesurer, variantes.length]);

  // La variante choisie (ex. depuis le panneau « Tout voir ») reste visible dans le ruban
  useEffect(() => {
    if (!compact) return;
    const el = piste.current;
    const bouton = el?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !bouton) return;
    const gauche = bouton.offsetLeft - el.offsetLeft;
    if (gauche < el.scrollLeft) el.scrollTo({ left: gauche - 8, behavior: 'smooth' });
    else if (gauche + bouton.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: gauche + bouton.offsetWidth - el.clientWidth + 8, behavior: 'smooth' });
  }, [compact, selection]);

  const defiler = (sens: -1 | 1) => {
    const el = piste.current;
    if (el) el.scrollBy({ left: sens * Math.max(el.clientWidth * 0.7, 80), behavior: 'smooth' });
  };

  const precharger = () => {
    if (precharge.current) return;
    precharge.current = true;
    prechargerImages(variantes);
  };

  const boutons = variantes.map((v, i) => {
    const actif = v.id === selection;
    const dansPanier = quantites?.[v.id] ?? 0;
    const uniteLigne = uniteVariante(produit, v);
    return (
      <button
        key={v.id}
        type="button"
        role="radio"
        aria-checked={actif}
        onClick={() => onChoisir(v.id)}
        className={`relative shrink-0 snap-start flex items-center gap-1.5 border transition-[background-color,border-color,color,box-shadow] duration-200 ${
          compact ? 'h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-[11px] sm:rounded-[13px] border-[1.5px] text-xs sm:text-[13px] font-bold' : 'px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight'
        } ${actif
          ? compact ? 'bg-[#3D2B1F] border-[#3D2B1F] text-[#F5EAE0]' : 'bg-[#3D2B1F] border-[#3D2B1F] text-white shadow-md'
          : compact ? 'bg-white border-[#DDD0BF] text-[#3D2B1F] hover:border-[#3D2B1F]' : 'bg-white border-[#D5C9B8] text-slate-500 hover:border-[#FF4500]/50 hover:text-[#3D2B1F]'}`}
      >
        {!compact && v.image_url && (
          <img src={v.image_url} alt="" className="w-7 h-5 rounded object-cover -ml-1" />
        )}
        {actif && <Check className={compact ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-3.5 h-3.5'} strokeWidth={compact ? 3 : 2} />}
        <span className="whitespace-nowrap">{libelleCourt(produit, v)}</span>
        {prixDifferents && !compact && (
          <span className={`font-bold normal-case ${actif ? 'text-white/70' : 'text-slate-400'}`}>{infos[i].final.toFixed(2)}€/{infos[i].unite}</span>
        )}
        {dansPanier > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 px-1 rounded-full bg-[#D43A00] text-white font-black flex items-center justify-center ${compact ? 'min-w-[18px] h-[18px] text-[10px]' : 'min-w-4 h-4 text-[8px]'}`}>
            {uniteLigne === 'g' || uniteLigne === 'kg' ? '✓' : dansPanier}
          </span>
        )}
      </button>
    );
  });

  if (!compact) {
    return (
      <div role="radiogroup" aria-label="Choisir une variante" className="flex flex-wrap gap-1.5" onPointerEnter={precharger} onTouchStart={precharger}>
        {boutons}
      </div>
    );
  }

  const fleche = 'absolute top-1/2 -translate-y-1/2 mt-0.5 w-7 h-7 rounded-full bg-white border border-[#D5C9B8] shadow-md text-[#3D2B1F] flex items-center justify-center transition-opacity duration-200';
  return (
    <div className="relative" onPointerEnter={precharger} onTouchStart={precharger}>
      <div
        ref={piste}
        role="radiogroup"
        aria-label="Choisir une variante"
        onScroll={mesurer}
        className="flex gap-1.5 overflow-x-auto snap-x snap-proximity overscroll-x-contain pt-1.5 pb-1 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {boutons}
        <span className="shrink-0 w-1" aria-hidden />
      </div>
      {/* Indicateurs : uniquement s'il reste des variantes dans cette direction */}
      <div aria-hidden className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 ${bords.gauche ? 'opacity-100' : 'opacity-0'}`} />
      <div aria-hidden className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 ${bords.droite ? 'opacity-100' : 'opacity-0'}`} />
      <button type="button" tabIndex={bords.gauche ? 0 : -1} aria-label="Variantes précédentes" onClick={() => defiler(-1)}
        className={`${fleche} -left-1 ${bords.gauche ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button type="button" tabIndex={bords.droite ? 0 : -1} aria-label="Variantes suivantes" onClick={() => defiler(1)}
        className={`${fleche} -right-1 ${bords.droite ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Panneau « Toutes les variantes » : s'ouvre par-dessus la carte (sans changer
// sa taille ni décaler la grille), liste tous les choix avec photo, prix et
// unité. Choisir une variante referme le panneau.
export function PanneauVariantes({
  produit, variantes, selection, quantites, onChoisir, onFermer,
}: {
  produit: any;
  variantes: Variante[];
  selection: string | null;
  quantites?: Record<string, number>;
  onChoisir: (id: string) => void;
  onFermer: () => void;
}) {
  const liste = useRef<HTMLDivElement>(null);
  useEffect(() => {
    prechargerImages(variantes);
    liste.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [variantes, onFermer]);

  return (
    <div
      role="dialog"
      aria-label="Choisir une variante"
      className="absolute inset-0 z-30 flex flex-col bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out"
    >
      <div className="flex items-center justify-between gap-2 px-2.5 pt-2.5 pb-1.5 sm:px-4 sm:pt-4">
        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-[#3D2B1F]">Choisir une variante</p>
        <button type="button" onClick={onFermer} aria-label="Fermer" className="w-7 h-7 rounded-full bg-[#EDE3D5] text-[#3D2B1F] flex items-center justify-center hover:bg-[#DDD0BF] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={liste} role="radiogroup" className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2 sm:px-3 sm:pb-3 space-y-1">
        {variantes.map(v => {
          const actif = v.id === selection;
          const { base, final, unite } = prixAffiche(produit, v);
          const image = v.image_url || produit.image_url;
          const dansPanier = quantites?.[v.id] ?? 0;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => onChoisir(v.id)}
              className={`w-full flex items-center gap-2 sm:gap-3 rounded-xl border p-1.5 sm:p-2 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4500]/40 ${
                actif ? 'border-[#3D2B1F] bg-[#FBF7F2]' : 'border-transparent hover:bg-[#FBF7F2]'}`}
            >
              <span className="relative w-10 h-7 sm:w-14 sm:h-9 shrink-0 rounded-lg overflow-hidden bg-[#EDE3D5] flex items-center justify-center">
                {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <span className="text-sm grayscale opacity-30">🧺</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] sm:text-xs font-black uppercase tracking-tight text-slate-800 truncate">{libelleCourt(produit, v)}</span>
                <span className="block text-[8px] sm:text-[10px] font-bold text-slate-400">
                  <span className={final < base ? 'text-[#FF4500]' : ''}>{final.toFixed(2)}€/{unite}</span>
                  {final < base && <span className="line-through ml-1">{base.toFixed(2)}€</span>}
                  {dansPanier > 0 && <span className="text-[#FF4500]"> · au panier</span>}
                </span>
              </span>
              {actif && <Check className="w-3.5 h-3.5 text-[#3D2B1F] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
