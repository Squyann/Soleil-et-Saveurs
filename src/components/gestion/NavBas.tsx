'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, ClipboardList, Carrot, Users, Menu } from 'lucide-react';
import { useGestion } from './AppliGestion';

// Barre de navigation du bas (pouce), adaptée au rôle
export default function NavBas() {
  const pathname = usePathname() || '/gestion';
  const { peut, nouvelles } = useGestion();

  const onglets = [
    { href: '/gestion', libelle: 'Accueil', Icone: House },
    { href: '/gestion/commandes', libelle: 'Commandes', Icone: ClipboardList, pastille: nouvelles },
    { href: '/gestion/produits', libelle: 'Produits', Icone: Carrot },
    ...(peut('clients') ? [{ href: '/gestion/clients', libelle: 'Clients', Icone: Users }] : []),
    { href: '/gestion/plus', libelle: 'Plus', Icone: Menu },
  ];
  const actif = (href: string) => (href === '/gestion' ? pathname === '/gestion' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Navigation de l'application"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E3D6C4] bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl gap-1 px-2 py-2">
        {onglets.map(({ href, libelle, Icone, pastille }) => {
          const on = actif(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl text-[11.5px] font-bold transition-colors ${
                  on ? 'bg-olivier text-lin' : 'text-olivier-gris active:bg-lin'}`}
              >
                <Icone className="h-[22px] w-[22px]" strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                {libelle}
                {!!pastille && pastille > 0 && (
                  <span className="absolute right-[18%] top-1 min-w-[20px] rounded-full bg-terre-cuite px-1.5 text-center text-[11px] font-extrabold leading-5 text-white">
                    {pastille > 99 ? '99+' : pastille}
                    <span className="sr-only"> nouvelles</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
