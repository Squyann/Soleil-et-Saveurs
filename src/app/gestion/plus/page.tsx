'use client';
// « Plus » : autres outils, réglages de l'appareil, installation, compte
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Download, LogOut, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { LIBELLE_ROLE } from '@/lib/gestion/roles';
import { useGestion } from '@/components/gestion/AppliGestion';
import { Carte, EnTete } from '@/components/gestion/Elements';
import { ReglagesNotifications, ReglageVerrou } from '@/components/gestion/Reglages';

export default function Plus() {
  const { session, role, peut, installation, miseAJour, deconnecter, enCours, notifier } = useGestion();
  const [ios, setIos] = useState(false);
  const [verification, setVerification] = useState(false);
  const [confirmerPartout, setConfirmerPartout] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  }, []);

  async function chercherMiseAJour() {
    setVerification(true);
    try {
      const r = await navigator.serviceWorker?.getRegistration('/gestion');
      await r?.update();
      if (!r?.waiting) notifier({ type: 'info', texte: 'L’application est à jour.' });
    } catch {
      notifier({ type: 'erreur', texte: 'Vérification impossible pour le moment.' });
    } finally {
      setVerification(false);
    }
  }

  const outils = [
    ...(peut('promos') ? [{ href: '/gestion/codes-promo', libelle: 'Codes promo', detail: 'activer, désactiver, créer' }] : []),
    ...(peut('promos') ? [{ href: '/admin', libelle: 'Mail, calendrier, statistiques', detail: 'dans l’admin du site' }] : []),
  ];

  return (
    <>
      <EnTete titre="Plus" />

      {outils.length > 0 && (
        <Carte className="mb-3 !p-0">
          {outils.map((o) => (
            <Link key={o.libelle} href={o.href} className="flex min-h-[60px] items-center gap-3 border-b border-[#F0E7DA] px-4 py-3 last:border-0">
              <span className="flex-1"><b className="block text-[15px]">{o.libelle}</b><span className="text-[12.5px] text-olivier-gris">{o.detail}</span></span>
              <ChevronRight className="h-5 w-5 text-olivier-pale" aria-hidden="true" />
            </Link>
          ))}
        </Carte>
      )}

      <ReglagesNotifications />
      <ReglageVerrou />

      <h2 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-olivier-gris">Ce téléphone</h2>
      <Carte className="space-y-4">
        {!installation.installee && (
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
            <div className="flex-1 text-[14px] leading-relaxed">
              <b className="block">Installer sur l’écran d’accueil</b>
              {installation.possible ? (
                <button type="button" onClick={installation.lancer} className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-olivier px-4 font-bold text-lin">
                  <Download className="h-4 w-4" aria-hidden="true" /> Installer l’application
                </button>
              ) : ios ? (
                <span className="text-olivier-doux">Dans Safari, appuyez sur <b>Partager</b> puis <b>Sur l’écran d’accueil</b>. Indispensable sur iPhone pour recevoir les notifications.</span>
              ) : (
                <span className="text-olivier-doux">Dans le menu du navigateur (⋮), choisissez <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.</span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <RefreshCw className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          <div className="flex-1 text-[14px]">
            <b className="block">Version du {miseAJour.version}</b>
            {miseAJour.prete ? (
              <button type="button" onClick={miseAJour.appliquer} disabled={enCours > 0} className="mt-2 inline-flex min-h-[44px] items-center rounded-2xl bg-olivier px-4 font-bold text-lin disabled:opacity-40">
                Installer la nouvelle version
              </button>
            ) : (
              <button type="button" onClick={chercherMiseAJour} disabled={verification} className="mt-1 inline-flex min-h-[44px] items-center font-bold text-brique disabled:opacity-50">
                {verification ? 'Vérification…' : 'Rechercher une mise à jour'}
              </button>
            )}
          </div>
        </div>
      </Carte>

      <h2 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-olivier-gris">Compte</h2>
      <Carte className="space-y-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 flex-none" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-[14px]">
            <b className="block truncate">{session?.user?.email}</b>
            <span className="text-olivier-gris">{role ? LIBELLE_ROLE[role] : ''}</span>
          </div>
        </div>
        <button type="button" onClick={() => deconnecter(false)} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-olivier font-bold">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter
        </button>
        {confirmerPartout ? (
          <div className="rounded-2xl bg-[#F8EADF] p-3 text-[13.5px] leading-relaxed">
            Tous les appareils connectés à ce compte (téléphones, ordinateurs, admin du site) seront déconnectés.
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmerPartout(false)} className="min-h-[44px] rounded-xl border border-olivier font-bold">Annuler</button>
              <button type="button" onClick={() => deconnecter(true)} className="min-h-[44px] rounded-xl bg-brique font-bold text-white">Confirmer</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmerPartout(true)} className="min-h-[44px] w-full text-[13.5px] font-bold text-brique">
            Déconnecter tous mes appareils
          </button>
        )}
      </Carte>
    </>
  );
}
