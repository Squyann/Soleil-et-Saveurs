'use client';
import React, { useState } from 'react';
import { MapPin, Leaf } from 'lucide-react';
import GaleriePhotos from '@/components/fiche/GaleriePhotos';
import AchatProduit from '@/components/fiche/AchatProduit';
import BoutonPartager from '@/components/fiche/BoutonPartager';
import { nomVariante, type Variante } from '@/lib/variantes';

// Haut de la page produit : photos, nom et achat. Le choix d'une variante
// change aussitôt la photo, le nom et le prix, sans recharger la page.
export default function EnTeteProduit({
  produit, variantes, photos, titre, accroche, deSaison,
}: {
  produit: any;
  variantes: Variante[];
  photos: string[];
  titre: string;
  accroche: string | null;
  deSaison: boolean;
}) {
  const [selection, setSelection] = useState<string | null>(variantes[0]?.id ?? null);
  const variante = variantes.find(v => v.id === selection) ?? null;

  const titreAffiche = variante ? nomVariante(produit, variante) : titre;
  const photosAffichees = (variante?.image_url ? [variante.image_url, ...photos] : photos)
    .filter((u, i, t) => !!u && t.indexOf(u) === i);

  return (
    <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 lg:gap-10 items-start">
      {/* key : la galerie revient sur la première photo à chaque changement de variante */}
      <GaleriePhotos key={variante?.id ?? 'produit'} photos={photosAffichees} alt={titreAffiche} />

      <div className="lg:sticky lg:top-20 space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {produit.category && (
              <span className="text-[10px] font-black uppercase tracking-widest text-[#5C4030] bg-white border border-[#D5C9B8] px-2.5 py-1 rounded-lg">{produit.category}</span>
            )}
            {produit.provenance && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#FF4500] bg-orange-50 border border-[#FF4500]/15 px-2.5 py-1 rounded-lg">
                <MapPin className="w-3 h-3" />{produit.provenance}
              </span>
            )}
            {deSaison && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 border border-green-600/15 px-2.5 py-1 rounded-lg">
                <Leaf className="w-3 h-3" />De saison en ce moment
              </span>
            )}
          </div>
          <h1 key={titreAffiche} className="text-3xl sm:text-5xl font-black tracking-tighter uppercase leading-[0.95] text-slate-900 animate-in fade-in">{titreAffiche}</h1>
          {accroche && (
            <p className="text-slate-500 font-medium italic mt-3 text-sm sm:text-base leading-relaxed">{accroche}</p>
          )}
        </div>

        <AchatProduit produit={produit} variantes={variantes} selection={selection} onSelection={setSelection} />

        <div className="flex items-center justify-between gap-3">
          <BoutonPartager titre={titre} />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Livraison dès le lendemain · Yvelines</p>
        </div>
      </div>
    </div>
  );
}
