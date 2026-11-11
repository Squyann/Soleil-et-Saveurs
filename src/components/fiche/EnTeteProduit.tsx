'use client';
import React, { useState } from 'react';
import { MapPin, Leaf, Truck, Gift, Banknote } from 'lucide-react';
import GaleriePhotos from '@/components/fiche/GaleriePhotos';
import AchatProduit from '@/components/fiche/AchatProduit';
import BoutonPartager from '@/components/fiche/BoutonPartager';
import { nomVariante, produitPourVariante, type Variante } from '@/lib/variantes';

// Haut de la page produit : photos, nom et achat. Le choix d'une variante
// change aussitôt la photo, le nom et le prix, sans recharger la page.
// Ordinateur : photos et contenu (children) à gauche, bloc d'achat à droite,
// qui reste visible pendant la lecture. Mobile : photos, achat, puis contenu.
export default function EnTeteProduit({
  produit, variantes, photos, titre, accroche, deSaison, children,
}: {
  produit: any;
  variantes: Variante[];
  photos: string[];
  titre: string;
  accroche: string | null;
  deSaison: boolean;
  children?: React.ReactNode;
}) {
  const [selection, setSelection] = useState<string | null>(variantes[0]?.id ?? null);
  const variante = variantes.find(v => v.id === selection) ?? null;

  const titreAffiche = variante ? nomVariante(produit, variante) : titre;
  const photosAffichees = (variante?.image_url ? [variante.image_url, ...photos] : photos)
    .filter((u, i, t) => !!u && t.indexOf(u) === i);
  const remise = Number(produitPourVariante(produit, variante).promotion) || 0;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-x-12 gap-y-5 lg:gap-y-[22px] items-start">
      {/* La galerie change de photo en fondu et revient sur la première à chaque variante */}
      <div className="relative lg:col-start-1">
        <GaleriePhotos photos={photosAffichees} alt={titreAffiche} />
        {remise > 0 && (
          <span className="absolute left-3 top-3 lg:left-[18px] lg:top-[18px] px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-full bg-[#D43A00] text-white text-sm lg:text-base font-extrabold pointer-events-none">-{remise}%</span>
        )}
        <div className="absolute right-3 top-3 lg:right-[18px] lg:top-[18px]">
          <BoutonPartager titre={titre} />
        </div>
      </div>

      <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto flex flex-col gap-4 lg:gap-[22px] px-2 lg:p-8 lg:bg-white lg:rounded-[32px] lg:border lg:border-[#E8DCCB] lg:shadow-[0_30px_60px_-40px_rgba(61,43,31,0.45)]">
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          {produit.category && (
            <span className="px-3 py-1 lg:py-1.5 rounded-full bg-white border border-[#DDD0BF] text-xs lg:text-[13px] font-bold text-[#5C4030]">{produit.category}</span>
          )}
          {produit.provenance && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 lg:py-1.5 rounded-full bg-[#FFF1EA] text-xs lg:text-[13px] font-bold text-[#C73600]">
              <MapPin className="w-3.5 h-3.5" aria-hidden />{produit.provenance}
            </span>
          )}
          {deSaison && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 lg:py-1.5 rounded-full bg-[#ECF7EF] text-xs lg:text-[13px] font-bold text-[#166534]">
              <Leaf className="w-3.5 h-3.5" aria-hidden />De saison en ce moment
            </span>
          )}
        </div>

        <div>
          <h1 className="titre text-[42px] lg:text-[54px] leading-none text-[#3D2B1F]">{titreAffiche}</h1>
          {accroche && (
            <p className="mt-3 text-base lg:text-[17px] leading-relaxed text-[#5C4030]">{accroche}</p>
          )}
        </div>

        <AchatProduit produit={produit} variantes={variantes} selection={selection} onSelection={setSelection} />

        <ul className="flex flex-col gap-2.5 lg:gap-3 rounded-[18px] bg-[#F5EAE0] px-4 py-3.5 lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-5 lg:border-t lg:border-[#F0E7DA] text-[13.5px] lg:text-[15px] font-semibold text-[#5C4030]">
          <li className="flex items-center gap-2.5 lg:gap-3"><Truck className="w-[17px] h-[17px] lg:w-[19px] lg:h-[19px] shrink-0 text-[#C73600]" aria-hidden />Livraison dès le lendemain, entre 15h et 20h</li>
          <li className="flex items-center gap-2.5 lg:gap-3"><Gift className="w-[17px] h-[17px] lg:w-[19px] lg:h-[19px] shrink-0 text-[#C73600]" aria-hidden />Livraison offerte dès 40€ de produits</li>
          <li className="flex items-center gap-2.5 lg:gap-3"><Banknote className="w-[17px] h-[17px] lg:w-[19px] lg:h-[19px] shrink-0 text-[#C73600]" aria-hidden />Paiement à la livraison, en espèces ou par carte</li>
        </ul>
      </aside>

      {children && (
        <div className="lg:col-start-1 min-w-0 flex flex-col gap-3 lg:gap-[22px] mt-1.5 lg:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}
