'use client';

// Page ouverte depuis le lien « Se désinscrire » des e-mails d'offres. La
// désinscription est enregistrée dès l'ouverture (requête POST faite par la
// page, pas par un simple lien) ; le client peut se réabonner s'il s'est
// trompé. Les e-mails liés aux commandes continuent d'être envoyés.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Etat = 'chargement' | 'desinscrit' | 'reabonne' | 'invalide' | 'erreur';

export default function Desinscription() {
  const [etat, setEtat] = useState<Etat>('chargement');
  const [email, setEmail] = useState('');
  const [jeton, setJeton] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const j = p.get('j') || '';
    const c = p.get('c') || '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!UUID.test(j)) { setEtat('invalide'); return; }
    setJeton(j);
    supabase.rpc('desinscription_mail', { p_jeton: j, p_campagne: UUID.test(c) ? c : null }).then(({ data, error }) => {
      if (error) { setEtat('erreur'); return; }
      if (!data?.ok) { setEtat('invalide'); return; }
      setEmail(data.email || '');
      setEtat('desinscrit');
    });
  }, []);

  const reabonner = async () => {
    if (!jeton) return;
    setEnCours(true);
    const { data, error } = await supabase.rpc('reabonnement_mail', { p_jeton: jeton });
    setEnCours(false);
    setEtat(!error && data?.ok ? 'reabonne' : 'erreur');
  };

  const titre = {
    chargement: 'Un instant…',
    desinscrit: "C'est fait, vous êtes désinscrit(e)",
    reabonne: 'Vous êtes de nouveau abonné(e)',
    invalide: 'Ce lien de désinscription ne fonctionne pas',
    erreur: 'Une erreur est survenue',
  }[etat];

  return (
    <div className="min-h-[70vh] bg-[#EDE3D5] text-[#3D2B1F] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-[520px] rounded-[28px] bg-white border border-[#E3D6C4] px-6 py-10 md:px-10 text-center">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${etat === 'invalide' || etat === 'erreur' ? 'bg-[#FFF1EA] text-[#B83200]' : 'bg-[#ECF7EF] text-[#166534]'}`}>
          {etat === 'chargement' ? <Loader2 className="w-7 h-7 animate-spin" aria-hidden /> : <Check className="w-8 h-8" strokeWidth={2.6} aria-hidden />}
        </div>
        <h1 className="titre text-[30px] leading-tight mt-5" aria-live="polite">{titre}</h1>

        {etat === 'desinscrit' && (
          <>
            <p className="mt-3 text-[16px] leading-relaxed text-[#5C4030]">{email ? <>L&apos;adresse <strong className="text-[#3D2B1F]">{email}</strong></> : 'Votre adresse'} ne recevra plus nos offres ni nos nouveautés, dès maintenant.</p>
            <div className="mt-6 p-4 rounded-2xl bg-[#F8F1E8] text-left text-[15px] leading-relaxed text-[#5C4030]">
              <strong className="block text-[#3D2B1F]">Vous continuerez à recevoir</strong>
              les e-mails liés à vos commandes : confirmation, livraison et facture.
            </div>
            <button type="button" onClick={reabonner} disabled={enCours} className="mt-5 w-full inline-flex items-center justify-center gap-2 min-h-[54px] rounded-2xl border-[1.5px] border-[#3D2B1F] text-[16px] font-extrabold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors disabled:opacity-50">
              {enCours && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}Je me suis trompé(e), me réabonner
            </button>
          </>
        )}
        {etat === 'reabonne' && <p className="mt-3 text-[16px] leading-relaxed text-[#5C4030]">Merci ! Vous recevrez de nouveau nos offres et nouveautés. Vous pouvez changer d&apos;avis à tout moment depuis Mon compte.</p>}
        {etat === 'invalide' && <p className="mt-3 text-[16px] leading-relaxed text-[#5C4030]">Le lien est incomplet ou n&apos;est plus valable. Vous pouvez gérer vos préférences depuis Mon compte, ou nous écrire à soleiletsaveurs.livraison@gmail.com.</p>}
        {etat === 'erreur' && <p className="mt-3 text-[16px] leading-relaxed text-[#5C4030]">Réessayez dans un instant. Si le problème continue, écrivez-nous à soleiletsaveurs.livraison@gmail.com.</p>}

        <div className="mt-6 flex flex-col gap-2 items-center">
          {(etat === 'invalide' || etat === 'reabonne') && <Link href="/compte" className="text-[15px] font-extrabold text-[#C73600] hover:underline">Gérer mes préférences dans Mon compte</Link>}
          <Link href="/" className="text-[15px] font-bold text-[#5C4030] hover:underline">Retour à la boutique</Link>
        </div>
      </div>
    </div>
  );
}
