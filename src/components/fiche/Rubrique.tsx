'use client';
import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Rubrique de la fiche produit. Sur mobile : ligne qui se déplie au toucher.
// Sur ordinateur : carte toujours ouverte (le contenu est dans la page dans
// les deux cas, seul l'affichage change).
export default function Rubrique({
  icone, titre, ouverteSurMobile = false, large = false, teinte = false, children,
}: {
  icone: React.ReactNode;
  titre: string;
  ouverteSurMobile?: boolean;
  large?: boolean;
  teinte?: boolean;
  children: React.ReactNode;
}) {
  const [ouverte, setOuverte] = useState(ouverteSurMobile);
  const id = useId();
  return (
    <section
      className={`border-t border-[#F0E7DA] lg:border lg:rounded-[28px] lg:p-7 ${
        teinte ? 'lg:bg-[#FFF6F0] lg:border-[#F6DFD2]' : 'lg:bg-white lg:border-[#E8DCCB]'} ${large ? 'lg:col-span-2' : ''}`}
    >
      <span className={`hidden lg:flex w-[46px] h-[46px] rounded-[14px] items-center justify-center mb-4 text-[#FF4500] ${teinte ? 'bg-white' : 'bg-[#FFF1EA]'}`} aria-hidden>
        {icone}
      </span>
      <h2 className="lg:mb-2.5">
        <button
          type="button"
          aria-expanded={ouverte}
          aria-controls={id}
          onClick={() => setOuverte(o => !o)}
          className="titre-lg w-full min-h-[58px] lg:min-h-0 px-5 lg:px-0 flex items-center justify-between gap-3 text-left text-base font-extrabold text-[#3D2B1F] lg:text-2xl lg:leading-[1.1] lg:pointer-events-none"
        >
          {titre}
          <ChevronDown className={`lg:hidden shrink-0 w-[18px] h-[18px] transition-transform duration-200 ${ouverte ? 'rotate-180' : ''}`} strokeWidth={2.4} aria-hidden />
        </button>
      </h2>
      <div id={id} className={`${ouverte ? 'block' : 'hidden'} lg:block px-5 pb-[18px] lg:p-0`}>
        {children}
      </div>
    </section>
  );
}
