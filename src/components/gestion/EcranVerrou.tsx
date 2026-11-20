'use client';
// Écran de verrouillage : code à 4 chiffres ou empreinte / visage
import { useCallback, useEffect, useState } from 'react';
import { Delete, Fingerprint } from 'lucide-react';
import { biometrieActive, deverrouillerBiometrie, verifierCode } from '@/lib/gestion/verrou';

export default function EcranVerrou({ ouvrir, deconnecter }: { ouvrir: () => void; deconnecter: () => void }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [verif, setVerif] = useState(false);
  const bio = biometrieActive();

  const essayerBio = useCallback(async () => {
    if (await deverrouillerBiometrie()) ouvrir();
  }, [ouvrir]);

  useEffect(() => {
    if (!bio) return;
    const t = setTimeout(() => { void essayerBio(); }, 300);
    return () => clearTimeout(t);
  }, [bio, essayerBio]);

  async function chiffre(n: string) {
    if (verif) return;
    const suite = (code + n).slice(0, 4);
    setCode(suite);
    setMessage('');
    if (suite.length < 4) return;
    setVerif(true);
    const r = await verifierCode(suite);
    setVerif(false);
    if (r === true) { ouvrir(); return; }
    setCode('');
    if (r <= 0) { deconnecter(); return; }
    setMessage(`Code incorrect. ${r} essai${r > 1 ? 's' : ''} avant déconnexion.`);
    navigator.vibrate?.(120);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-olivier px-6 text-lin" role="dialog" aria-modal="true" aria-label="Application verrouillée">
      <img src="/icon-192.png" alt="" className="h-14 w-14 rounded-2xl" />
      <p className="titre mt-5 text-[24px]">Entrez votre code</p>
      <div className="mt-5 flex gap-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-4 w-4 rounded-full border-2 border-lin ${i < code.length ? 'bg-lin' : ''}`} />)}
      </div>
      <p role="alert" className="mt-4 min-h-[20px] text-[13.5px] text-safran">{message}</p>
      <div className="mt-2 grid w-full max-w-[280px] grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} type="button" onClick={() => chiffre(n)} className="h-16 rounded-full bg-white/10 text-[26px] font-bold active:bg-white/25">{n}</button>
        ))}
        {bio ? (
          <button type="button" onClick={essayerBio} aria-label="Déverrouiller avec l’empreinte ou le visage" className="flex h-16 items-center justify-center rounded-full active:bg-white/25"><Fingerprint className="h-8 w-8" /></button>
        ) : <span />}
        <button type="button" onClick={() => chiffre('0')} className="h-16 rounded-full bg-white/10 text-[26px] font-bold active:bg-white/25">0</button>
        <button type="button" onClick={() => setCode((c) => c.slice(0, -1))} aria-label="Effacer" className="flex h-16 items-center justify-center rounded-full active:bg-white/25"><Delete className="h-7 w-7" /></button>
      </div>
      <button type="button" onClick={deconnecter} className="mt-8 min-h-[44px] text-[13.5px] font-bold text-lin/80 underline underline-offset-4">Code oublié ? Se reconnecter</button>
    </div>
  );
}
