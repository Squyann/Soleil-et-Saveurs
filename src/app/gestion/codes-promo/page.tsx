'use client';
// Codes promo : liste, activation / désactivation et création.
// Mêmes règles que l'admin du site (src/components/admin/CodesPromo.tsx) ;
// la base contrôle les droits (gérant et administrateur).
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { libelleLimite, libellePeriode, parisVersIso, statutCode, type CodePromo } from '@/lib/codesPromo';
import { reponse } from '@/lib/gestion/memoire';
import { useChangements, useGestion } from '@/components/gestion/AppliGestion';
import { Carte, Chargement, EnTete } from '@/components/gestion/Elements';
import Feuille from '@/components/gestion/Feuille';

type Code = CodePromo & { updated_at: string };
const LIBELLE_STATUT = { actif: 'Actif', programme: 'Programmé', expire: 'Expiré', desactive: 'Désactivé' } as const;

export default function PageCodesPromo() {
  const { peut, executer, enLigne, notifier } = useGestion();
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [nouveau, setNouveau] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('codes_promo').select('*').order('created_at', { ascending: false });
    if (!error) setCodes(data as Code[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);
  useChangements(['codes_promo'], () => { void charger(); });

  async function basculer(c: Code) {
    setEnCours(c.id);
    const r = await executer(c.actif ? `Désactiver ${c.code}` : `Activer ${c.code}`, async () => {
      const d = await reponse(supabase.from('codes_promo').update({ actif: !c.actif }).eq('id', c.id).eq('updated_at', c.updated_at).select());
      return (d as Code[]).length > 0;
    });
    setEnCours(null);
    if (!r.ok) return;
    if (r.donnees) notifier({ type: 'ok', texte: `${c.code} ${c.actif ? 'désactivé' : 'activé'}` });
    else notifier({ type: 'info', texte: `${c.code} a été modifié ailleurs entre-temps : rechargé, rien n’a changé.` });
    void charger();
  }

  const retour = (
    <Link href="/gestion/plus" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Plus
    </Link>
  );
  if (!peut('promos')) return (<>{retour}<Carte><p>Accès réservé à l’administrateur et au gérant.</p></Carte></>);

  return (
    <>
      {retour}
      <EnTete
        titre="Codes promo"
        droite={
          <button type="button" onClick={() => setNouveau(true)} disabled={!enLigne} aria-label="Nouveau code promo" className="flex h-10 w-10 items-center justify-center rounded-xl bg-olivier text-lin disabled:opacity-40">
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      {!codes ? <Chargement /> : codes.length === 0 ? (
        <Carte><p className="text-[14.5px] text-olivier-doux">Aucun code promo pour l’instant.</p></Carte>
      ) : (
        <ul className="space-y-2">
          {codes.map((c) => {
            const s = statutCode(c);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <b className="text-[15.5px] tracking-wide">{c.code}</b>
                    <span className="rounded-full bg-terre-pale px-2 text-[12.5px] font-extrabold text-brique">−{c.reduction_pct} %</span>
                  </span>
                  <span className="block text-[12.5px] text-olivier-gris">
                    {LIBELLE_STATUT[s]} · {c.usage_count} utilisation{c.usage_count > 1 ? 's' : ''} · {libelleLimite(c.max_par_client).toLowerCase()}
                  </span>
                  {(c.debut || c.fin) && <span className="block text-[12px] text-olivier-gris">{libellePeriode(c.debut, c.fin)}</span>}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.actif}
                  aria-label={`${c.code} ${c.actif ? 'actif' : 'désactivé'}`}
                  disabled={enCours === c.id || !enLigne}
                  onClick={() => basculer(c)}
                  className={`relative h-8 w-[52px] flex-none rounded-full transition-colors disabled:opacity-50 ${c.actif ? 'bg-olivier' : 'bg-[#C9BBAA]'}`}
                >
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${c.actif ? 'right-1' : 'left-1'}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-center text-[12px] text-olivier-gris">Modification détaillée d’un code (période, limite) : dans l’admin du site.</p>
      {nouveau && <NouveauCode fermer={() => setNouveau(false)} apres={charger} />}
    </>
  );
}

function NouveauCode({ fermer, apres }: { fermer: () => void; apres: () => void }) {
  const { executer } = useGestion();
  const [code, setCode] = useState('');
  const [pct, setPct] = useState('10');
  const [unParClient, setUnParClient] = useState(true);
  const [fin, setFin] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function creer() {
    const c = code.trim().toUpperCase();
    const p = Number(pct);
    if (!/^[A-Z0-9_-]{2,40}$/.test(c)) return setErreur('De 2 à 40 lettres, chiffres, tirets ou soulignés, sans espace.');
    if (!Number.isInteger(p) || p < 1 || p > 90) return setErreur('Réduction entre 1 et 90 %.');
    const finIso = fin ? parisVersIso(`${fin}T23:59`, true) : null;
    if (fin && (!finIso || new Date(finIso) < new Date())) return setErreur('La date de fin doit être dans le futur.');
    setEnvoi(true);
    const r = await executer(`Création du code ${c}`, () => reponse(supabase.from('codes_promo').insert([{ code: c, reduction_pct: p, max_par_client: unParClient ? 1 : null, fin: finIso }]).select()), { reussite: `Code ${c} créé` });
    setEnvoi(false);
    if (r.ok) { apres(); fermer(); }
  }

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier';
  return (
    <Feuille titre="Nouveau code promo" fermer={fermer}>
      <div className="space-y-3 px-4">
        <div>
          <label htmlFor="code" className="mb-1 block text-[12.5px] font-bold text-olivier-gris">Code</label>
          <input id="code" value={code} maxLength={40} autoCapitalize="characters" onChange={(e) => { setErreur(''); setCode(e.target.value.toUpperCase().replace(/\s/g, '')); }} placeholder="ex. NOEL2026" className={`${champ} font-bold tracking-wide`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pct" className="mb-1 block text-[12.5px] font-bold text-olivier-gris">Réduction (%)</label>
            <input id="pct" inputMode="numeric" value={pct} onChange={(e) => { setErreur(''); setPct(e.target.value.replace(/\D/g, '')); }} className={champ} />
          </div>
          <div>
            <label htmlFor="fin" className="mb-1 block text-[12.5px] font-bold text-olivier-gris">Valable jusqu’au</label>
            <input id="fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={`${champ} text-[15px]`} />
          </div>
        </div>
        <label className="flex min-h-[44px] items-center gap-3 text-[14.5px] font-bold">
          <input type="checkbox" checked={unParClient} onChange={(e) => setUnParClient(e.target.checked)} className="h-5 w-5 accent-[#2F4A2B]" />
          Une seule utilisation par client
        </label>
        {erreur && <p role="alert" className="rounded-xl bg-[#F1E1DB] px-3 py-2 text-[13.5px] font-semibold text-[#8A3A1E]">{erreur}</p>}
        <button type="button" disabled={envoi || !code} onClick={creer} className="min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">
          {envoi ? 'Création…' : 'Créer le code'}
        </button>
      </div>
    </Feuille>
  );
}
