'use client';
// Écran prévu à l'étape suivante (développement par modules)
import Link from 'next/link';
import { Carte, EnTete } from './Elements';

export default function Bientot({ titre, texte }: { titre: string; texte: string }) {
  return (
    <>
      <EnTete titre={titre} />
      <Carte>
        <p className="text-[14.5px] leading-relaxed text-olivier-doux">{texte}</p>
        <p className="mt-3 text-[13px] text-olivier-gris">En attendant, l’administration du site reste disponible.</p>
        <Link href="/admin" className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl border border-olivier px-4 text-[14px] font-bold">
          Ouvrir l’admin du site
        </Link>
      </Carte>
    </>
  );
}
