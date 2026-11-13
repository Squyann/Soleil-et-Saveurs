import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Mise en page commune aux pages de connexion, d'inscription et de mot de
// passe. Ordinateur : panneau brun à gauche (accroche et arguments), contenu à
// droite. Mobile : bandeau brun compact, contenu, puis les arguments.

export type ArgumentConnexion = { icone: React.ReactNode; titre?: string; texte: string };

// Styles partagés des formulaires de ces pages
export const etiquetteChamp = 'block mb-1.5 text-[13.5px] lg:text-sm font-bold text-[#5C4030]';
export const champ = 'w-full h-[54px] lg:h-14 px-4 rounded-[15px] lg:rounded-2xl border-[1.5px] border-[#E0D3C0] bg-white text-base font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium outline-none focus:border-[#FF4500] transition-colors';
export const champAvecIcone = `${champ} pl-[46px] lg:pl-12`;
export const iconeChamp = 'absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] lg:w-[19px] lg:h-[19px] text-[#6F5A4B] pointer-events-none';
export const boutonPrincipal = 'w-full min-h-[60px] lg:min-h-[62px] px-[22px] lg:px-6 rounded-[18px] bg-[#FF4500] text-white text-[19px] font-extrabold flex items-center justify-between gap-3 shadow-[0_16px_30px_-14px_rgba(255,69,0,0.55)] transition-[background-color,transform] duration-200 hover:bg-[#E63E00] active:scale-[0.98] disabled:bg-[#EDE3D5] disabled:text-[#6F5A4B] disabled:shadow-none disabled:cursor-not-allowed';
export const messageErreur = 'flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-[13.5px] font-bold text-red-700';

function Soleil({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 600 600" aria-hidden className={className}>
      <circle cx="300" cy="300" r="100" fill="#FF4500" fillOpacity="0.9" />
      <circle cx="300" cy="300" r="226" fill="none" stroke="#FF4500" strokeOpacity="0.7" strokeWidth="110" strokeDasharray="12 47.2" />
    </svg>
  );
}

export default function GabaritConnexion({
  surtitre, titre, sousTitre, accroche, arguments: args, retour = { href: '/', libelle: 'Retour à la boutique' }, children,
}: {
  surtitre?: string;
  titre: string;
  sousTitre?: string;
  accroche: React.ReactNode;
  arguments: ArgumentConnexion[];
  retour?: { href: string; libelle: string };
  children: React.ReactNode;
}) {
  const lienRetour = (
    <Link href={retour.href} className="relative self-start inline-flex items-center gap-2 min-h-11 text-sm font-bold text-[#E3D3C1] hover:text-white transition-colors">
      <ArrowLeft className="w-[17px] h-[17px]" strokeWidth={2.2} aria-hidden />{retour.libelle}
    </Link>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F5EAE0] text-[#3D2B1F] lg:flex">

      {/* Panneau (ordinateur) */}
      <aside className="hidden lg:flex relative overflow-hidden flex-1 bg-[#3D2B1F] text-[#F5EAE0] px-14 xl:px-16 py-14 flex-col justify-between gap-12">
        <Soleil className="ss-rayons absolute -right-[220px] -top-[240px] w-[640px] h-[640px] pointer-events-none" />
        {lienRetour}
        <div className="relative">
          <p className="titre text-[52px] xl:text-[68px] leading-none mb-11">{accroche}</p>
          <ul className="flex flex-col gap-[22px] max-w-[460px]">
            {args.map((a, i) => (
              <li key={i} className="flex items-center gap-4">
                <span className="shrink-0 w-12 h-12 rounded-[15px] bg-[#F5EAE0]/10 text-[#FF7A47] flex items-center justify-center" aria-hidden>{a.icone}</span>
                <span>
                  {a.titre && <strong className="block text-[17px] font-extrabold">{a.titre}</strong>}
                  <span className={`block text-[15px] leading-normal ${a.titre ? 'mt-0.5 text-[#E1D2C2]' : 'font-semibold'}`}>{a.texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span aria-hidden />
      </aside>

      <div className="lg:flex-1 lg:flex lg:items-center lg:justify-center">
        {/* Bandeau (mobile) */}
        <header className="lg:hidden relative overflow-hidden bg-[#3D2B1F] text-[#F5EAE0] px-5 pt-3 pb-[30px] flex flex-col">
          <Soleil className="absolute -right-[120px] -top-[150px] w-[300px] h-[300px] pointer-events-none" />
          {lienRetour}
          {surtitre && <p className="relative mt-3.5 mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#FF9466]">{surtitre}</p>}
          <h1 className={`relative titre text-[44px] leading-none ${surtitre ? '' : 'mt-3.5'}`}>{titre}</h1>
          {sousTitre && <p className="relative mt-2 text-base text-[#E1D2C2]">{sousTitre}</p>}
        </header>

        <div className="relative -mt-4 lg:mt-0 rounded-t-[22px] lg:rounded-none bg-[#F5EAE0] px-5 pt-[26px] pb-10 lg:px-6 lg:py-14 w-full lg:max-w-[488px]">
          <div className="hidden lg:block mb-8">
            {surtitre && <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">{surtitre}</p>}
            <h1 className="titre text-[54px] leading-none">{titre}</h1>
            {sousTitre && <p className="mt-2 text-[17px] text-[#5C4030]">{sousTitre}</p>}
          </div>

          {children}

          {/* Arguments (mobile) */}
          <ul className="lg:hidden mt-[26px] flex flex-col gap-3.5 rounded-[20px] bg-white border border-[#E8DCCB] px-4 py-[18px]">
            {args.map((a, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-[#FFF1EA] text-[#FF4500] flex items-center justify-center" aria-hidden>{a.icone}</span>
                <span>
                  {a.titre && <strong className="block text-[14.5px] font-extrabold">{a.titre}</strong>}
                  <span className={`block text-[13px] leading-snug ${a.titre ? 'text-[#6F5A4B]' : 'font-semibold text-[#5C4030]'}`}>{a.texte}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
