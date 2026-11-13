'use client';

// Administration des codes promo : création et modification, limite
// d'utilisations par client, période de validité, statuts et filtres.
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Pencil, Plus, Tag, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  type CodePromo, type StatutCode, isoVersParis, libelleLimite, libellePeriode, parisVersIso, resumeCode, statutCode,
} from '@/lib/codesPromo';

interface Formulaire {
  id: string | null;
  code: string;
  pct: number;
  limiter: boolean;
  max: number;
  periode: boolean;
  debut: string;
  fin: string;
}

const VIDE: Formulaire = { id: null, code: '', pct: 10, limiter: true, max: 1, periode: false, debut: '', fin: '' };

const STATUTS: Record<StatutCode, { libelle: string; classe: string }> = {
  actif: { libelle: 'Actif', classe: 'bg-[#ECF7EF] text-[#166534]' },
  programme: { libelle: 'Programmé', classe: 'bg-[#EEF2FB] text-[#2F4A8A]' },
  expire: { libelle: 'Expiré', classe: 'bg-[#F1ECE6] text-[#6F5A4B]' },
  desactive: { libelle: 'Désactivé', classe: 'bg-[#F1ECE6] text-[#6F5A4B] border border-dashed border-[#B9A894]' },
};

const FILTRES: { cle: 'tous' | StatutCode; libelle: string }[] = [
  { cle: 'tous', libelle: 'Tous' },
  { cle: 'actif', libelle: 'Actifs' },
  { cle: 'programme', libelle: 'Programmés' },
  { cle: 'expire', libelle: 'Expirés' },
  { cle: 'desactive', libelle: 'Désactivés' },
];

const etiquette = 'block mb-1.5 text-[13px] font-extrabold tracking-wide text-[#5C4030]';
const champ = 'w-full min-h-[50px] px-3.5 rounded-xl border-[1.5px] border-[#DDD0BF] bg-white text-base font-bold text-[#3D2B1F] outline-none focus:border-[#FF4500] transition-colors';

function Interrupteur({ actif, onChange, libelle }: { actif: boolean; onChange: (v: boolean) => void; libelle: string }) {
  return (
    <button type="button" role="switch" aria-checked={actif} aria-label={libelle} onClick={() => onChange(!actif)}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${actif ? 'bg-[#166534]' : 'bg-[#DDD0BF]'}`}>
      <span className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all ${actif ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  );
}

function plurielFois(n: number) { return `${n} fois`; }

export default function CodesPromo() {
  const [codes, setCodes] = useState<CodePromo[]>([]);
  const [chargement, setChargement] = useState(true);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<'tous' | StatutCode>('tous');
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    let annule = false;
    (async () => {
      const { data } = await supabase.from('codes_promo').select('*').order('created_at', { ascending: false });
      if (!annule) { setCodes((data as CodePromo[]) || []); setChargement(false); }
    })();
    // Statuts recalculés chaque minute (un code programmé devient actif)
    const t = setInterval(() => setMaintenant(Date.now()), 60_000);
    return () => { annule = true; clearInterval(t); };
  }, []);

  const maj = (champs: Partial<Formulaire>) => { setForm((f) => ({ ...f, ...champs })); setErreur(null); };

  const apercu = useMemo(() => ({
    reduction_pct: form.pct,
    max_par_client: form.limiter ? form.max : null,
    debut: form.periode && form.debut ? parisVersIso(form.debut) : null,
    fin: form.periode && form.fin ? parisVersIso(form.fin, true) : null,
  }), [form]);

  const modifier = (c: CodePromo) => {
    setForm({
      id: c.id, code: c.code, pct: c.reduction_pct,
      limiter: c.max_par_client != null, max: c.max_par_client ?? 1,
      periode: Boolean(c.debut || c.fin), debut: isoVersParis(c.debut), fin: isoVersParis(c.fin),
    });
    setErreur(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function enregistrer() {
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return setErreur('Le code doit contenir de 2 à 40 lettres, chiffres, tirets ou soulignés, sans espace.');
    if (!Number.isInteger(form.pct) || form.pct < 1 || form.pct > 100) return setErreur('La réduction doit être comprise entre 1 et 100 %.');
    if (form.limiter && (!Number.isInteger(form.max) || form.max < 1 || form.max > 1000)) return setErreur('Le nombre maximum doit être compris entre 1 et 1000.');
    if (form.periode && !form.debut && !form.fin) return setErreur('Indiquez au moins une date de début ou de fin, ou désactivez la période de validité.');
    if (apercu.debut && apercu.fin && new Date(apercu.fin) <= new Date(apercu.debut)) return setErreur('La date de fin doit être après la date de début.');

    setEnregistrement(true);
    const donnees = { code, reduction_pct: form.pct, max_par_client: apercu.max_par_client, debut: apercu.debut, fin: apercu.fin };
    const requete = form.id
      ? supabase.from('codes_promo').update(donnees).eq('id', form.id).select().single()
      : supabase.from('codes_promo').insert([donnees]).select().single();
    const { data, error } = await requete;
    setEnregistrement(false);
    if (error) {
      setErreur(error.code === '23505' ? 'Ce code existe déjà.' : `Enregistrement impossible : ${error.message}`);
      return;
    }
    const enregistre = data as CodePromo;
    setCodes((prev) => form.id ? prev.map((c) => (c.id === enregistre.id ? enregistre : c)) : [enregistre, ...prev]);
    setForm(VIDE);
  }

  async function basculer(c: CodePromo) {
    const { error } = await supabase.from('codes_promo').update({ actif: !c.actif }).eq('id', c.id);
    if (!error) setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, actif: !c.actif } : x)));
  }

  async function supprimer(c: CodePromo) {
    if (!window.confirm(`Supprimer définitivement le code ${c.code} ?`)) return;
    const { error } = await supabase.from('codes_promo').delete().eq('id', c.id);
    if (error) { window.alert(error.message); return; }
    setCodes((prev) => prev.filter((x) => x.id !== c.id));
    if (form.id === c.id) setForm(VIDE);
  }

  const avecStatut = codes.map((c) => ({ c, s: statutCode(c, maintenant) }));
  const compte = (cle: 'tous' | StatutCode) => (cle === 'tous' ? avecStatut.length : avecStatut.filter((x) => x.s === cle).length);
  const affiches = avecStatut.filter((x) => filtre === 'tous' || x.s === filtre);

  return (
    <div className="space-y-6 text-[#3D2B1F]">
      <div>
        <h2 className="titre text-4xl leading-none">Codes promo</h2>
        <p className="mt-2 text-[15px] text-[#5C4030]">Créez un code, puis choisissez si vous limitez son usage par client et sa période de validité.</p>
      </div>

      <div className="grid lg:grid-cols-[440px_minmax(0,1fr)] gap-6 items-start">
        {/* FORMULAIRE */}
        <section className="bg-white border border-[#E3D6C4] rounded-[20px] p-5 md:p-6 lg:sticky lg:top-4">
          <h3 className="titre text-[22px]">{form.id ? 'Modifier le code' : 'Nouveau code'}</h3>
          <p className="mt-1 mb-4 text-sm text-[#6F5A4B]">{form.id ? 'Les changements s’appliquent aux prochaines commandes.' : 'Le code est actif dès son enregistrement, selon ses dates.'}</p>

          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
            <div>
              <label htmlFor="cp-code" className={etiquette}>Code</label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B9A894]" aria-hidden />
                <input id="cp-code" value={form.code} maxLength={40} onChange={(e) => maj({ code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="EX : NOEL2026" className={`${champ} pl-10 uppercase tracking-[0.08em] placeholder:tracking-normal placeholder:font-semibold placeholder:text-[#8C7867]`} />
              </div>
            </div>
            <div>
              <label htmlFor="cp-pct" className={etiquette}>Réduction</label>
              <div className="relative">
                <input id="cp-pct" type="number" min={1} max={100} value={form.pct} onChange={(e) => maj({ pct: Math.round(Number(e.target.value)) })} className={`${champ} pr-9`} />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-[#8C7867]">%</span>
              </div>
            </div>
          </div>

          {/* LIMITE PAR CLIENT */}
          <div className={`mt-4 p-4 rounded-2xl border-[1.5px] transition-colors ${form.limiter ? 'border-[#3D2B1F] bg-[#FBF6F0]' : 'border-[#E3D6C4]'}`}>
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-extrabold">Limiter par client</p><p className="text-[13px] text-[#6F5A4B]">Nombre de commandes avec ce code, par compte client</p></div>
              <Interrupteur actif={form.limiter} onChange={(v) => maj({ limiter: v })} libelle="Limiter par client" />
            </div>
            {form.limiter && (
              <div className="mt-3.5 flex items-center flex-wrap gap-3">
                <div className="inline-flex items-center border-[1.5px] border-[#DDD0BF] rounded-xl overflow-hidden bg-white">
                  <button type="button" aria-label="Moins" onClick={() => maj({ max: Math.max(1, form.max - 1) })} className="w-11 h-11 flex items-center justify-center hover:bg-[#F5EAE0]"><Minus className="w-4 h-4" /></button>
                  <input aria-label="Nombre maximum d'utilisations par client" type="number" min={1} max={1000} value={form.max} onChange={(e) => maj({ max: Math.round(Number(e.target.value)) })} className="w-14 h-11 text-center text-lg font-extrabold outline-none" />
                  <button type="button" aria-label="Plus" onClick={() => maj({ max: Math.min(1000, form.max + 1) })} className="w-11 h-11 flex items-center justify-center hover:bg-[#F5EAE0]"><Plus className="w-4 h-4" /></button>
                </div>
                <span className="text-[15px] font-bold">utilisation{form.max > 1 ? 's' : ''} maximum par client</span>
              </div>
            )}
          </div>

          {/* PÉRIODE */}
          <div className={`mt-3 p-4 rounded-2xl border-[1.5px] transition-colors ${form.periode ? 'border-[#3D2B1F] bg-[#FBF6F0]' : 'border-[#E3D6C4]'}`}>
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-extrabold">Période de validité</p><p className="text-[13px] text-[#6F5A4B]">Heure de Paris · début et fin facultatifs</p></div>
              <Interrupteur actif={form.periode} onChange={(v) => maj({ periode: v })} libelle="Période de validité" />
            </div>
            {form.periode && (
              <>
                <div className="mt-3.5 grid sm:grid-cols-2 gap-2.5">
                  <div><label htmlFor="cp-debut" className={etiquette}>À partir du</label><input id="cp-debut" type="datetime-local" value={form.debut} onChange={(e) => maj({ debut: e.target.value })} className={`${champ} text-[15px]`} /></div>
                  <div><label htmlFor="cp-fin" className={etiquette}>Jusqu&apos;au</label><input id="cp-fin" type="datetime-local" value={form.fin} onChange={(e) => maj({ fin: e.target.value })} className={`${champ} text-[15px]`} /></div>
                </div>
                <p className="mt-2 text-[13px] text-[#6F5A4B]">Laissez « Jusqu&apos;au » vide pour un code sans date de fin. Une fin à 23:59 couvre toute la minute.</p>
              </>
            )}
          </div>

          <p className="mt-4 px-4 py-3.5 rounded-2xl bg-[#FFF1EA] text-sm leading-relaxed text-[#5C4030]"><strong className="text-[#3D2B1F]">En résumé :</strong> {resumeCode(apercu)}</p>
          {erreur && <p role="alert" className="mt-3 text-sm font-bold text-[#B83200]">{erreur}</p>}
          <div className="mt-4 flex gap-2.5">
            {form.id && <button type="button" onClick={() => { setForm(VIDE); setErreur(null); }} className="min-h-12 px-5 rounded-2xl border-[1.5px] border-[#3D2B1F] font-extrabold">Annuler</button>}
            <button type="button" onClick={enregistrer} disabled={enregistrement || !form.code.trim()} className="flex-1 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-2xl bg-[#FF4500] text-white font-extrabold disabled:opacity-40">
              {enregistrement ? <Loader2 className="w-4 h-4 animate-spin" /> : form.id ? null : <Plus className="w-4 h-4" />}
              {form.id ? 'Enregistrer le code' : 'Créer le code'}
            </button>
          </div>
        </section>

        {/* LISTE */}
        <section>
          <div className="flex flex-wrap gap-2 mb-3.5" role="tablist" aria-label="Filtrer les codes">
            {FILTRES.map((f) => (
              <button key={f.cle} type="button" role="tab" aria-selected={filtre === f.cle} onClick={() => setFiltre(f.cle)}
                className={`px-3.5 py-2 rounded-full border-[1.5px] text-sm font-bold transition-colors ${filtre === f.cle ? 'bg-[#3D2B1F] border-[#3D2B1F] text-[#F5EAE0]' : 'bg-white border-[#DDD0BF] text-[#5C4030] hover:border-[#3D2B1F]'}`}>
                {f.libelle} <span className="opacity-70 ml-0.5">{compte(f.cle)}</span>
              </button>
            ))}
          </div>

          {chargement ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#8C7867]" /></div>
          ) : affiches.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-[#E3D6C4] p-10 text-center">
              <Tag className="w-8 h-8 text-[#DDD0BF] mx-auto mb-3" />
              <p className="font-bold text-[#6F5A4B]">{codes.length === 0 ? 'Aucun code promo créé' : 'Aucun code dans cette catégorie'}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {affiches.map(({ c, s }) => {
                const enCours = form.id === c.id;
                const terne = s === 'expire' || s === 'desactive';
                return (
                  <li key={c.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center p-4 md:px-5 rounded-[18px] border ${enCours ? 'border-[#3D2B1F] ring-2 ring-[#3D2B1F] ring-inset' : 'border-[#E3D6C4]'} ${terne ? 'bg-[#FBF8F4]' : 'bg-white'}`}>
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-lg font-extrabold tracking-[0.06em]">{c.code}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1EA] text-[#C73600] text-[13px] font-extrabold">−{c.reduction_pct} %</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${STATUTS[s].classe}`}>{STATUTS[s].libelle}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[13px] font-semibold ${c.max_par_client ? 'bg-[#F8F1E8] text-[#5C4030]' : 'text-[#8C7867] pl-0'}`}>{libelleLimite(c.max_par_client)}</span>
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[13px] font-semibold ${c.debut || c.fin ? 'bg-[#F8F1E8] text-[#5C4030]' : 'text-[#8C7867] pl-0'}`}>{libellePeriode(c.debut, c.fin)}</span>
                      </div>
                      <p className="mt-2 text-[13px] text-[#6F5A4B]">
                        {c.usage_count > 0 ? `Utilisé ${plurielFois(c.usage_count)}` : 'Jamais utilisé'} · créé le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => modifier(c)} className="inline-flex items-center gap-1.5 h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#E3D6C4] bg-white text-sm font-extrabold hover:border-[#3D2B1F]">
                        <Pencil className="w-3.5 h-3.5" aria-hidden />Modifier
                      </button>
                      <button type="button" onClick={() => basculer(c)} title={c.actif ? 'Désactiver' : 'Activer'} aria-label={c.actif ? `Désactiver ${c.code}` : `Activer ${c.code}`} className="w-[42px] h-[42px] flex items-center justify-center rounded-xl border-[1.5px] border-[#E3D6C4] bg-white hover:border-[#3D2B1F]">
                        {c.actif ? <ToggleRight className="w-6 h-6 text-[#166534]" /> : <ToggleLeft className="w-6 h-6 text-[#8C7867]" />}
                      </button>
                      {c.usage_count === 0 && (
                        <button type="button" onClick={() => supprimer(c)} title="Supprimer" aria-label={`Supprimer ${c.code}`} className="w-[42px] h-[42px] flex items-center justify-center rounded-xl border-[1.5px] border-[#E3D6C4] bg-white text-[#8C7867] hover:text-[#B83200] hover:border-[#B83200]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-[#6F5A4B]">Un code déjà utilisé ne se supprime plus (il figure sur des commandes et des factures) : désactivez-le.</p>
        </section>
      </div>
    </div>
  );
}
