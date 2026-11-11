'use client';
import React from 'react';
import { ArrowRight, ShoppingCart, Truck } from 'lucide-react';
import { calculerPanier } from '@/lib/panier';
import { SEUIL_LIVRAISON_OFFERTE } from '@/lib/livraison';
import { formatPrix } from '@/lib/format';

// Barre de panier du catalogue : nombre d'articles, total (promotions
// déduites, comme dans le panier) et progression vers la livraison offerte.
// Toute la barre ouvre le panier (événement écouté par ClientShell).
export default function BarrePanier({ panier }: { panier: any[] }) {
  if (panier.length === 0) return null;
  const total = calculerPanier(panier).total;
  const reste = SEUIL_LIVRAISON_OFFERTE - total;
  const progression = Math.max(0, Math.min(100, (total / SEUIL_LIVRAISON_OFFERTE) * 100));

  return (
    <div className="fixed z-[80] left-0 right-0 bottom-[calc(4rem_+_max(0.5rem,env(safe-area-inset-bottom)))] md:bottom-5 px-2 md:px-5 pointer-events-none">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('ouvrir-panier'))}
        className="group ss-pop pointer-events-auto w-full max-w-[1100px] mx-auto flex items-center gap-3 md:gap-7 text-left rounded-[20px] md:rounded-3xl bg-[#3D2B1F] text-[#F5EAE0] pl-2.5 pr-2 py-2 md:pl-6 md:pr-5 md:py-[18px] shadow-[0_22px_44px_-18px_rgba(61,43,31,0.75)]"
      >
        <span className="flex items-center gap-3 md:gap-3.5 shrink-0">
          <span className="relative w-11 h-11 md:w-[52px] md:h-[52px] rounded-[14px] md:rounded-2xl bg-[#5C4030] flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" aria-hidden />
            <span key={panier.length} className="ss-rebond absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#D43A00] text-white text-xs font-extrabold flex items-center justify-center">
              {panier.length > 99 ? '99+' : panier.length}
            </span>
          </span>
          <span className="hidden md:flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-[#E3D3C1]">{panier.length > 1 ? `${panier.length} articles` : '1 article'}</span>
            <strong className="text-[22px] font-black tracking-tight leading-none">{formatPrix(total)}</strong>
          </span>
        </span>

        <span className="flex-1 min-w-0 flex flex-col gap-1.5 md:gap-2">
          <span className="md:hidden text-[15px] font-black leading-none">
            {formatPrix(total)}<span className="ml-1.5 text-xs font-semibold text-[#E3D3C1]">{panier.length > 1 ? `${panier.length} articles` : '1 article'}</span>
          </span>
          <span aria-live="polite" className="flex items-center gap-2 text-xs md:text-sm font-bold leading-tight">
            <Truck className="hidden md:block w-[18px] h-[18px] shrink-0 text-[#FF9466]" aria-hidden />
            {reste > 0.005 ? `Encore ${formatPrix(reste)} pour la livraison offerte` : 'Livraison offerte'}
          </span>
          <span className="block h-1.5 md:h-2 rounded-full bg-[#5C4030] overflow-hidden">
            <span className="block h-full rounded-full bg-[#FF7A47] transition-[width] duration-500 ease-out" style={{ width: `${progression}%` }} />
          </span>
        </span>

        <span className="shrink-0 flex items-center justify-center gap-2.5 w-11 h-11 md:w-auto md:h-14 md:px-6 rounded-[14px] md:rounded-[17px] bg-[#FF4500] text-white text-[19px] font-extrabold transition-colors group-hover:bg-[#D43A00]">
          <span className="hidden md:inline">Voir le panier</span>
          <span className="sr-only md:hidden">Voir le panier</span>
          <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.4} aria-hidden />
        </span>
      </button>
    </div>
  );
}
