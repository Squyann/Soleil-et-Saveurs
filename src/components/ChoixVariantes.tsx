'use client';
import React from 'react';
import { Check } from 'lucide-react';
import { libelleCourt, prixVariante, type Variante } from '@/lib/variantes';

// Boutons de choix de la variante (catalogue et page produit). La variante
// sélectionnée est mise en évidence ; le prix apparaît quand il diffère.
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
  const prixDifferents = new Set(variantes.map(v => prixVariante(produit, v))).size > 1;
  const unite = produit.unite === 'g' ? 'kg' : produit.unite || 'pièce';

  return (
    <div
      role="radiogroup"
      aria-label="Choisir une variante"
      className={`flex gap-1.5 ${compact ? 'overflow-x-auto pb-1 pt-1.5 pr-1.5 -mx-0.5 px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'flex-wrap'}`}
    >
      {variantes.map(v => {
        const actif = v.id === selection;
        const dansPanier = quantites?.[v.id] ?? 0;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChoisir(v.id)}
            className={`relative shrink-0 flex items-center gap-1.5 border font-black uppercase tracking-tight transition-all ${
              compact ? 'px-2 py-1 rounded-lg text-[8px] sm:text-[10px]' : 'px-3 py-2 rounded-xl text-[11px]'
            } ${actif
              ? 'bg-[#3D2B1F] border-[#3D2B1F] text-white shadow-md'
              : 'bg-white border-[#D5C9B8] text-slate-500 hover:border-[#FF4500]/50 hover:text-[#3D2B1F]'}`}
          >
            {!compact && v.image_url && (
              <img src={v.image_url} alt="" className="w-7 h-5 rounded object-cover -ml-1" />
            )}
            {actif && <Check className={compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />}
            <span className="whitespace-nowrap">{libelleCourt(produit, v)}</span>
            {prixDifferents && !compact && (
              <span className={`font-bold normal-case ${actif ? 'text-white/70' : 'text-slate-400'}`}>{prixVariante(produit, v).toFixed(2)}€/{unite}</span>
            )}
            {dansPanier > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#FF4500] text-white text-[8px] font-black flex items-center justify-center`}>
                {produit.unite === 'g' || produit.unite === 'kg' ? '✓' : dansPanier}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
