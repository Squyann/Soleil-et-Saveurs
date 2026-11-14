'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, HelpCircle, Store, House } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const PanierDrawer = dynamic(() => import('@/components/ui/PanierDrawer'), { ssr: false });

const LIENS = [
  { href: '/commander', label: 'Boutique' },
  { href: '/livraison', label: 'Livraison' },
  { href: '/aide', label: 'Aide' },
];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [user, setUser] = useState<any>(null);
  const [isPanierOpen, setIsPanierOpen] = useState(false);
  const [nombreArticles, setNombreArticles] = useState(0);

  const updateBadge = () => {
    try {
      const saved = localStorage.getItem('mon-panier');
      const items = saved ? JSON.parse(saved) : [];
      setNombreArticles(Array.isArray(items) ? items.length : 0);
    } catch {
      setNombreArticles(0);
    }
  };

  useEffect(() => {
    updateBadge();
    // « ouvrir-panier » : envoyé par la barre de panier du catalogue
    const ouvrir = () => setIsPanierOpen(true);
    window.addEventListener('storage', updateBadge);
    window.addEventListener('panier-updated', updateBadge);
    window.addEventListener('ouvrir-panier', ouvrir);
    return () => {
      window.removeEventListener('storage', updateBadge);
      window.removeEventListener('panier-updated', updateBadge);
      window.removeEventListener('ouvrir-panier', ouvrir);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const lienCompte = user ? '/compte' : '/login';
  const badge = nombreArticles > 99 ? '99+' : nombreArticles;
  // La barre du bas laisse la place à la barre d'achat des pages produits et
  // à l'espace d'administration.
  const barreMobile = !pathname.startsWith('/admin') && !pathname.startsWith('/produits');
  const ongletActif = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const onglet = (actif: boolean) =>
    `flex flex-col items-center justify-center gap-1 min-h-[52px] rounded-2xl text-[11px] font-bold transition-colors ${
      actif ? 'bg-[#3D2B1F] text-[#F5EAE0]' : 'text-[#5C4030] active:bg-[#EAD9C8]'}`;

  return (
    <>
      {/* EN-TÊTE */}
      <nav aria-label="Navigation principale" className="fixed top-0 left-0 right-0 z-[100] bg-[#F5EAE0]/95 backdrop-blur-md border-b border-[#DDD0BF] h-14">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Soleil et Saveurs — accueil" className="flex items-center shrink-0 group">
            <img src="/logo.svg" alt="Soleil et Saveurs" className="h-9 w-auto transition-opacity group-hover:opacity-80" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {LIENS.map(l => {
              const actif = pathname.startsWith(l.href) || (l.href === '/commander' && pathname.startsWith('/produits'));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={actif ? 'page' : undefined}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    l.href === '/commander'
                      ? 'bg-[#3D2B1F] text-[#F5EAE0] font-bold hover:bg-[#FF4500]'
                      : actif
                        ? 'bg-[#EAD9C8] text-[#3D2B1F] font-bold'
                        : 'text-[#5C4030] font-semibold hover:bg-[#EAD9C8] hover:text-[#3D2B1F]'}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Link href={lienCompte} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold text-[#5C4030] hover:bg-[#EAD9C8] hover:text-[#3D2B1F] transition-colors" suppressHydrationWarning>
              <User className="w-[18px] h-[18px]" aria-hidden />
              <span suppressHydrationWarning>{user ? 'Mon compte' : 'Connexion'}</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsPanierOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-4 h-10 rounded-full bg-[#3D2B1F] text-[#F5EAE0] text-sm font-bold hover:bg-[#FF4500] transition-colors"
            >
              <ShoppingCart className="w-[18px] h-[18px]" aria-hidden />
              Panier
              {nombreArticles > 0 && (
                <span key={nombreArticles} className="ss-rebond min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#D43A00] text-white text-xs font-extrabold inline-flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>

            {/* Sans barre du bas (pages produits, administration) : panier et compte restent dans l'en-tête */}
            {!barreMobile && (
              <>
                <button type="button" onClick={() => setIsPanierOpen(true)} aria-label="Ouvrir le panier" className="md:hidden relative w-11 h-11 rounded-full flex items-center justify-center text-[#5C4030] active:bg-[#EAD9C8]">
                  <ShoppingCart className="w-5 h-5" aria-hidden />
                  {nombreArticles > 0 && (
                    <span key={nombreArticles} className="ss-rebond absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D43A00] text-white text-[11px] font-extrabold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </button>
                <Link href={lienCompte} aria-label={user ? 'Mon compte' : 'Connexion'} className="md:hidden w-11 h-11 rounded-full flex items-center justify-center text-[#5C4030] active:bg-[#EAD9C8]" suppressHydrationWarning>
                  <User className="w-5 h-5" aria-hidden />
                </Link>
              </>
            )}

            <Link href="/aide" aria-label="Aide" className={`md:hidden flex items-center justify-center gap-1.5 h-11 rounded-full bg-[#3D2B1F] text-[#F5EAE0] text-[13px] font-bold active:bg-[#FF4500] transition-colors ${barreMobile ? 'px-4' : 'w-11'}`}>
              <HelpCircle className="w-[17px] h-[17px]" aria-hidden />
              {barreMobile && 'Aide'}
            </Link>
          </div>
        </div>
      </nav>

      <PanierDrawer isOpen={isPanierOpen} onClose={() => setIsPanierOpen(false)} />

      <main className="mt-14">
        {children}
      </main>

      <footer className="bg-[#DDD0BF] border-t border-[#C9BBAA] mt-20 text-[#3D2B1F]">
        <div className="max-w-7xl mx-auto px-5 md:px-8 pt-12 pb-7 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-9">
          <div className="col-span-2 lg:col-span-1">
            <img src="/logo.svg" alt="Soleil et Saveurs" className="h-9 w-auto" />
            <p className="mt-3 text-sm leading-relaxed text-[#5C4030]">Fruits &amp; légumes frais livrés dans le 78.</p>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#5C4030]">Boutique</h2>
            <ul className="flex flex-col text-[15px] font-semibold">
              <li><Link href="/commander" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">La récolte</Link></li>
              <li><Link href="/livraison" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">Livraison</Link></li>
              <li><Link href={lienCompte} className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors" suppressHydrationWarning>Mon compte</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#5C4030]">Nous joindre</h2>
            <ul className="flex flex-col text-[15px] font-semibold">
              <li><a href="https://wa.me/33759720083" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">WhatsApp · 07 59 72 00 83</a></li>
              <li className="py-1 text-sm font-medium text-[#5C4030]">WhatsApp : 7h – 22h</li>
              <li className="py-1 text-sm font-medium text-[#5C4030]">Standard : 9h – 19h</li>
              <li><Link href="/aide" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">Support</Link></li>
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#5C4030]">Informations</h2>
            <ul className="flex flex-row flex-wrap gap-x-6 lg:flex-col text-[15px] font-semibold">
              <li><Link href="/mentions" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">Mentions légales</Link></li>
              <li><Link href="/cgv" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">CGV</Link></li>
              <li><Link href="/rgpd" className="inline-flex items-center min-h-10 hover:text-[#C73600] transition-colors">Confidentialité</Link></li>
            </ul>
          </div>
        </div>
        <p className={`max-w-7xl mx-auto px-5 md:px-8 pt-5 border-t border-[#C9BBAA] text-xs font-bold uppercase tracking-[0.14em] text-[#5C4030] ${barreMobile ? 'pb-28 md:pb-6' : 'pb-6'}`}>
          © 2026 Soleil et Saveurs
        </p>
      </footer>

      {/* BARRE DE NAVIGATION MOBILE */}
      {barreMobile && (
        <nav
          aria-label="Navigation mobile"
          className="md:hidden fixed bottom-0 left-0 right-0 z-[90] grid grid-cols-4 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#F5EAE0]/95 backdrop-blur-md border-t border-[#DDD0BF]"
        >
          <Link href="/" aria-current={ongletActif('/') ? 'page' : undefined} className={onglet(ongletActif('/'))}>
            <House className="w-[21px] h-[21px]" aria-hidden />Accueil
          </Link>
          <Link href="/commander" aria-current={ongletActif('/commander') ? 'page' : undefined} className={onglet(ongletActif('/commander'))}>
            <Store className="w-[21px] h-[21px]" aria-hidden />Boutique
          </Link>
          <button type="button" onClick={() => setIsPanierOpen(true)} className={`relative ${onglet(false)}`}>
            <ShoppingCart className="w-[21px] h-[21px]" aria-hidden />Panier
            {nombreArticles > 0 && (
              <span key={nombreArticles} className="ss-rebond absolute top-1 left-[54%] min-w-[18px] h-[18px] px-1 rounded-full bg-[#D43A00] text-white text-[11px] font-extrabold flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
          <Link
            href={lienCompte}
            aria-current={ongletActif('/compte') || ongletActif('/login') ? 'page' : undefined}
            className={onglet(ongletActif('/compte') || ongletActif('/login'))}
            suppressHydrationWarning
          >
            <User className="w-[21px] h-[21px]" aria-hidden />Compte
          </Link>
        </nav>
      )}
    </>
  );
}
