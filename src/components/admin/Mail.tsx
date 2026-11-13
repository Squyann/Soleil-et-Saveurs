'use client';

// Rubrique Mail de l'administration : tableau de bord, éditeur de campagne
// par blocs avec aperçu ordinateur / mobile, e-mail de test, confirmation
// obligatoire avant l'envoi, suivi des campagnes.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, Bold, Check, Copy, Image as IconeImage, Italic, LayoutGrid, Link as IconeLien,
  Loader2, Minus, Monitor, MousePointerClick, Plus, Send, Smartphone, Space, Tag, Trash2, Type, Underline, User, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { libelleLimite, libellePeriode, statutCode, type CodePromo, dateParis, isoVersParis, parisVersIso } from '@/lib/codesPromo';
import {
  type Bloc, blocsDeDepart, COULEURS_TEXTE, nettoyerTexte, nouvelId, produitMail, rendreCampagne,
} from '@/lib/email/campagne';

// --- Types ------------------------------------------------------------------

interface Campagne {
  id: string;
  objet: string;
  apercu: string;
  expediteur_nom: string;
  expediteur_local: string;
  type: 'offre' | 'info';
  blocs: Bloc[];
  statut: 'brouillon' | 'programmee' | 'en_cours' | 'envoyee' | 'annulee';
  programmee_pour: string | null;
  lancee_le: string | null;
  terminee_le: string | null;
  nb_destinataires: number | null;
  test_envoye_le: string | null;
  created_at: string;
  updated_at: string;
}

interface Bilan { campagne_id: string; destinataires: number; envoyes: number; delivres: number; echecs: number; desinscriptions: number; restants: number }
interface Stats { inscrits: number; destinataires_offre: number; destinataires_info: number; desinscrits: number; bloquees: number }
interface EtatEnvoi { cle_api: boolean; expediteur: string | null; domaine: string | null; spf: boolean; dkim: boolean; dmarc: boolean; envoi_auto: boolean; webhook: boolean; pret: boolean; raison: string | null }
interface Produit { id: string; name: string; price: number; promotion: number | null; unite: string | null; image_url: string | null; actif: boolean | null }

const STATUTS: Record<Campagne['statut'], { libelle: string; classe: string }> = {
  brouillon: { libelle: 'Brouillon', classe: 'bg-[#F1ECE6] text-[#6F5A4B]' },
  programmee: { libelle: 'Programmée', classe: 'bg-[#EEF2FB] text-[#2F4A8A]' },
  en_cours: { libelle: 'En cours', classe: 'bg-[#FFF1EA] text-[#C73600]' },
  envoyee: { libelle: 'Envoyée', classe: 'bg-[#ECF7EF] text-[#166534]' },
  annulee: { libelle: 'Annulée', classe: 'bg-[#F1ECE6] text-[#6F5A4B]' },
};

const champ = 'w-full min-h-[46px] px-3 rounded-xl border-[1.5px] border-[#DDD0BF] bg-white text-[15px] font-semibold text-[#3D2B1F] outline-none focus:border-[#FF4500] transition-colors';
const etiquette = 'block mt-3 mb-1.5 text-[13px] font-bold text-[#5C4030]';
const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://soleiletsaveurs.fr';
const dateHeure = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(':', ' h ') : '—');

// --- Racine -----------------------------------------------------------------

export default function Mail() {
  const [vue, setVue] = useState<{ ecran: 'liste' } | { ecran: 'campagne'; id: string }>({ ecran: 'liste' });
  const [etat, setEtat] = useState<EtatEnvoi | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [codes, setCodes] = useState<CodePromo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const chargerEtat = useCallback(async (verifier = false) => {
    const r = await fetch(`/api/mail/domaine${verifier ? '?verifier=1' : ''}`).catch(() => null);
    if (r?.ok) setEtat(await r.json());
  }, []);
  const chargerStats = useCallback(async () => {
    const { data } = await supabase.rpc('mail_statistiques');
    if (data) setStats(data as Stats);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    chargerEtat();
    chargerStats();
    supabase.from('products').select('id, name, price, promotion, unite, image_url, actif').order('name').then(({ data }) => setProduits((data as Produit[]) || []));
    supabase.from('codes_promo').select('*').order('created_at', { ascending: false }).then(({ data }) => setCodes((data as CodePromo[]) || []));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [chargerEtat, chargerStats]);

  if (vue.ecran === 'campagne') {
    return <Campagne id={vue.id} etat={etat} stats={stats} produits={produits} codes={codes} onRetour={() => { setVue({ ecran: 'liste' }); chargerStats(); }} />;
  }
  return <Tableau etat={etat} stats={stats} onVerifier={() => chargerEtat(true)} onOuvrir={(id) => setVue({ ecran: 'campagne', id })} />;
}

// --- Tableau de bord --------------------------------------------------------

function Tableau({ etat, stats, onVerifier, onOuvrir }: { etat: EtatEnvoi | null; stats: Stats | null; onVerifier: () => void; onOuvrir: (id: string) => void }) {
  const [campagnes, setCampagnes] = useState<Campagne[] | null>(null);
  const [bilans, setBilans] = useState<Record<string, Bilan>>({});
  const [creation, setCreation] = useState(false);

  const charger = useCallback(async () => {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from('campagnes').select('*').order('created_at', { ascending: false }),
      supabase.rpc('mail_campagnes_bilan'),
    ]);
    setCampagnes((c as Campagne[]) || []);
    setBilans(Object.fromEntries(((b as Bilan[]) || []).map((x) => [x.campagne_id, x])));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    if (!campagnes?.some((c) => c.statut === 'en_cours' || c.statut === 'programmee')) return;
    const t = setInterval(charger, 15_000);
    return () => clearInterval(t);
  }, [campagnes, charger]);

  async function nouvelle() {
    setCreation(true);
    const { data, error } = await supabase.from('campagnes').insert([{ objet: '', apercu: '', expediteur_nom: 'Soleil et Saveurs', expediteur_local: 'bonjour', blocs: blocsDeDepart(), type: 'offre', statut: 'brouillon' }]).select().single();
    setCreation(false);
    if (error || !data) { window.alert(`Création impossible : ${error?.message ?? ''}`); return; }
    onOuvrir((data as Campagne).id);
  }

  const chiffres = [
    { v: stats?.inscrits, l: 'Clients inscrits', d: 'Comptes clients sur le site' },
    { v: stats?.destinataires_offre, l: 'Acceptent les offres', d: "Adresse confirmée, case cochée à l'inscription ou dans Mon compte", vert: true },
    { v: stats?.desinscrits, l: 'Désinscrits', d: 'Ne recevront plus aucune offre' },
    { v: stats?.bloquees, l: 'Adresses en erreur', d: 'Exclues automatiquement des envois' },
  ];

  return (
    <div className="space-y-6 text-[#3D2B1F]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="titre text-4xl leading-none">Mail</h2>
          <p className="mt-2 text-[15px] text-[#5C4030]">Préparez et envoyez vos campagnes. Seuls les clients qui l&apos;ont accepté reçoivent les offres.</p>
        </div>
        <button type="button" onClick={nouvelle} disabled={creation} className="inline-flex items-center gap-2 min-h-[50px] px-5 rounded-2xl bg-[#FF4500] text-white font-extrabold disabled:opacity-50">
          {creation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Nouvelle campagne
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {chiffres.map((c) => (
          <div key={c.l} className={`p-5 rounded-[18px] border ${c.vert ? 'bg-[#ECF7EF] border-[#CBE6D3]' : 'bg-white border-[#E3D6C4]'}`}>
            <p className={`titre text-[38px] leading-none ${c.vert ? 'text-[#166534]' : ''}`}>{c.v ?? '—'}</p>
            <p className="mt-2 text-sm font-bold">{c.l}</p>
            <p className="mt-1 text-[13px] leading-snug text-[#6F5A4B]">{c.d}</p>
          </div>
        ))}
      </div>

      <section className="bg-white border border-[#E3D6C4] rounded-[20px] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F0E7DA]">
          <h3 className="titre text-[22px]">Campagnes</h3>
          <span className="text-[13px] text-[#6F5A4B]">Délivrés et échecs remontés par le prestataire d&apos;envoi</span>
        </div>
        {campagnes === null ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#8C7867]" /></div>
        ) : campagnes.length === 0 ? (
          <p className="px-5 py-10 text-center font-bold text-[#6F5A4B]">Aucune campagne pour l&apos;instant. Créez la première avec « Nouvelle campagne ».</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-[#FBF6F0] text-[12px] font-extrabold uppercase tracking-wide text-[#6F5A4B]">
                  <th className="text-left px-4 py-3">Campagne</th><th className="text-right px-3">Date d&apos;envoi</th><th className="text-right px-3">Destinataires</th><th className="text-right px-3">Envoyés</th><th className="text-right px-3">Délivrés</th><th className="text-right px-3">Échecs</th><th className="text-right px-3">Désinscriptions</th><th className="text-right px-4">Statut</th>
                </tr>
              </thead>
              <tbody>
                {campagnes.map((c) => {
                  const b = bilans[c.id];
                  const dejaParti = c.statut === 'en_cours' || c.statut === 'envoyee' || c.statut === 'annulee';
                  return (
                    <tr key={c.id} onClick={() => onOuvrir(c.id)} className="border-t border-[#F0E7DA] cursor-pointer hover:bg-[#FFFBF7] tabular-nums">
                      <td className="px-4 py-3.5">
                        <span className="block text-[15px] font-bold">{c.objet || 'Sans objet'}</span>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-extrabold ${c.type === 'offre' ? 'bg-[#FFF1EA] text-[#C73600]' : 'bg-[#EEF2FB] text-[#2F4A8A]'}`}>{c.type === 'offre' ? 'Offre' : 'Information'}</span>
                      </td>
                      <td className="text-right px-3 whitespace-nowrap">{c.statut === 'brouillon' ? '—' : dateHeure(c.lancee_le || c.programmee_pour)}</td>
                      <td className="text-right px-3">{dejaParti ? b?.destinataires ?? '—' : c.nb_destinataires ?? '—'}</td>
                      <td className="text-right px-3">{dejaParti ? b?.envoyes ?? 0 : '—'}</td>
                      <td className="text-right px-3">{dejaParti ? b?.delivres ?? 0 : '—'}</td>
                      <td className={`text-right px-3 ${b?.echecs ? 'text-[#B83200] font-bold' : ''}`}>{dejaParti ? b?.echecs ?? 0 : '—'}</td>
                      <td className="text-right px-3">{dejaParti ? b?.desinscriptions ?? 0 : '—'}</td>
                      <td className="text-right px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${(STATUTS[c.statut] ?? STATUTS.brouillon).classe}`}>{(STATUTS[c.statut] ?? STATUTS.brouillon).libelle}</span>
                        {c.statut === 'en_cours' && b && b.destinataires > 0 && (
                          <span className="block ml-auto mt-1.5 w-[110px] h-2 rounded-full bg-[#F0E7DA] overflow-hidden"><span className="block h-full bg-[#FF4500]" style={{ width: `${Math.round(((b.destinataires - b.restants) / b.destinataires) * 100)}%` }} /></span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-5">
        <section className="p-5 rounded-[20px] bg-white border border-[#E3D6C4]">
          <h3 className="titre text-xl mb-2">Expéditeur</h3>
          {[
            ['Nom affiché', 'Soleil et Saveurs (modifiable par campagne)'],
            ["Adresse d'envoi", etat?.domaine ? `…@${etat.domaine}` : 'Non configurée'],
            ['Réponses envoyées à', 'soleiletsaveurs.livraison@gmail.com'],
            ["Débit d'envoi", '100 e-mails par lot, 2 lots par seconde au plus'],
          ].map(([l, v]) => <p key={l} className="flex justify-between gap-3 py-2.5 border-t border-[#F0E7DA] text-sm"><span className="text-[#6F5A4B]">{l}</span><strong className="text-right">{v}</strong></p>)}
        </section>
        <section className="p-5 rounded-[20px] bg-white border border-[#E3D6C4]">
          <div className="flex items-center justify-between gap-3 mb-2"><h3 className="titre text-xl">Prêt pour l&apos;envoi</h3><button type="button" onClick={onVerifier} className="text-[13px] font-extrabold text-[#C73600] hover:underline">Vérifier à nouveau</button></div>
          {[
            ['Clé du prestataire (Resend)', etat?.cle_api],
            ['DKIM (signature)', etat?.dkim],
            ['SPF (serveur autorisé)', etat?.spf],
            ['DMARC (politique)', etat?.dmarc],
            ['Envoi programmé automatique', etat?.envoi_auto],
            ['Suivi délivrés / rebonds', etat?.webhook],
          ].map(([l, ok]) => <p key={String(l)} className="flex justify-between gap-3 py-2.5 border-t border-[#F0E7DA] text-sm"><span className="text-[#6F5A4B]">{l}</span><strong className={ok ? 'text-[#166534]' : 'text-[#B83200]'}>{etat ? (ok ? 'OK' : 'À configurer') : '…'}</strong></p>)}
          {etat && !etat.pret && <p className="mt-3 px-3.5 py-3 rounded-xl bg-[#FFF1EA] text-[13px] leading-relaxed text-[#B83200]"><strong>Envoi des campagnes bloqué :</strong> {etat.raison} Vous pouvez préparer vos campagnes dès maintenant.</p>}
        </section>
      </div>
    </div>
  );
}

// --- Campagne : éditeur ou détail -------------------------------------------

function Campagne({ id, etat, stats, produits, codes, onRetour }: { id: string; etat: EtatEnvoi | null; stats: Stats | null; produits: Produit[]; codes: CodePromo[]; onRetour: () => void }) {
  const [c, setC] = useState<Campagne | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [ecran, setEcran] = useState<'ordinateur' | 'mobile'>('ordinateur');
  const [sauvegarde, setSauvegarde] = useState<'ok' | 'encours' | 'erreur'>('ok');
  const [test, setTest] = useState<{ etat: 'idle' | 'encours' | 'ok' | 'erreur'; message?: string }>({ etat: 'idle' });
  const [confirmation, setConfirmation] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [hauteurApercu, setHauteurApercu] = useState(900);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from('campagnes').select('*').eq('id', id).single();
    if (data) setC({ ...(data as Campagne), blocs: Array.isArray(data.blocs) ? data.blocs : [] });
    const { data: b } = await supabase.rpc('mail_campagnes_bilan');
    setBilan(((b as Bilan[]) || []).find((x) => x.campagne_id === id) ?? null);
  }, [id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { charger(); }, [charger]);

  const modifiable = c?.statut === 'brouillon';

  // Enregistrement automatique 800 ms après la dernière modification
  const modifier = (champs: Partial<Campagne>) => {
    if (!c || !modifiable) return;
    const suivant = { ...c, ...champs };
    setC(suivant);
    setSauvegarde('encours');
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(async () => {
      const { error } = await supabase.from('campagnes').update({
        objet: suivant.objet, apercu: suivant.apercu, expediteur_nom: suivant.expediteur_nom, expediteur_local: suivant.expediteur_local,
        type: suivant.type, blocs: suivant.blocs,
      }).eq('id', suivant.id);
      setSauvegarde(error ? 'erreur' : 'ok');
    }, 800);
  };
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  const produitsMail = useMemo(() => produits.filter((p) => p.actif !== false).map(produitMail), [produits]);
  const html = useMemo(() => (c ? rendreCampagne(c, { email: 'client@exemple.fr', prenom: 'Camille', jeton: '00000000-0000-4000-8000-000000000000' }, produitsMail, SITE).html : ''), [c, produitsMail]);

  if (!c) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#8C7867]" /></div>;

  const majBloc = (bid: string, champs: Partial<Bloc>) => modifier({ blocs: c.blocs.map((b) => (b.id === bid ? ({ ...b, ...champs } as Bloc) : b)) });
  const ajouter = (type: Bloc['type']) => {
    const base: Record<Bloc['type'], Bloc> = {
      titre: { id: nouvelId(), type: 'titre', texte: 'Nouveau titre' },
      texte: { id: nouvelId(), type: 'texte', html: 'Votre texte ici.' },
      image: { id: nouvelId(), type: 'image', url: '', alt: '' },
      bouton: { id: nouvelId(), type: 'bouton', texte: 'Je fais mon panier', lien: '/commander', couleur: 'orange' },
      code: { id: nouvelId(), type: 'code', code: '', legende: '' },
      produits: { id: nouvelId(), type: 'produits', ids: [] },
      separateur: { id: nouvelId(), type: 'separateur' },
      espace: { id: nouvelId(), type: 'espace', hauteur: 24 },
    };
    const bloc = base[type];
    const i = selection ? c.blocs.findIndex((b) => b.id === selection) : -1;
    const blocs = [...c.blocs];
    blocs.splice(i >= 0 ? i + 1 : blocs.length, 0, bloc);
    modifier({ blocs });
    setSelection(bloc.id);
  };
  const deplacer = (bid: string, sens: -1 | 1) => {
    const i = c.blocs.findIndex((b) => b.id === bid);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= c.blocs.length) return;
    const blocs = [...c.blocs];
    [blocs[i], blocs[j]] = [blocs[j], blocs[i]];
    modifier({ blocs });
  };
  const supprimerBloc = (bid: string) => { modifier({ blocs: c.blocs.filter((b) => b.id !== bid) }); if (selection === bid) setSelection(null); };

  async function envoyerTest() {
    setTest({ etat: 'encours' });
    const r = await fetch('/api/mail/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campagne_id: c!.id }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) { setTest({ etat: 'ok', message: `Envoyé à ${d.a}` }); setC((x) => (x ? { ...x, test_envoye_le: new Date().toISOString() } : x)); }
    else setTest({ etat: 'erreur', message: d?.error || 'Envoi du test impossible.' });
  }

  async function annuler() {
    if (!window.confirm(c!.statut === 'en_cours' ? 'Arrêter cette campagne ? Les e-mails déjà partis ne peuvent pas être rappelés.' : 'Annuler la programmation ? La campagne redevient un brouillon modifiable.')) return;
    const { error } = await supabase.rpc('annuler_campagne', { p_id: c!.id });
    if (error) window.alert(error.message); else charger();
  }

  async function supprimer() {
    if (!window.confirm('Supprimer ce brouillon ?')) return;
    const { error } = await supabase.from('campagnes').delete().eq('id', c!.id);
    if (error) window.alert(error.message); else onRetour();
  }

  async function dupliquer() {
    const { data, error } = await supabase.from('campagnes').insert([{
      objet: `${c!.objet} (copie)`, apercu: c!.apercu, expediteur_nom: c!.expediteur_nom, expediteur_local: c!.expediteur_local,
      type: c!.type, blocs: c!.blocs.map((b) => ({ ...b, id: nouvelId() })), statut: 'brouillon',
    }]).select().single();
    if (error || !data) { window.alert(error?.message); return; }
    setC({ ...(data as Campagne) });
    setBilan(null);
  }

  const verifs = [
    { ok: c.objet.trim().length > 0, texte: 'Objet renseigné' },
    { ok: c.blocs.length > 0, texte: 'Contenu présent' },
    ...(c.type === 'offre' ? [{ ok: true, texte: 'Lien de désinscription ajouté automatiquement' }] : []),
    { ok: true, texte: 'Identité de la société en pied de page' },
    ...c.blocs.filter((b): b is Extract<Bloc, { type: 'code' }> => b.type === 'code' && Boolean(b.code)).map((b) => {
      const code = codes.find((x) => x.code === b.code.toUpperCase());
      const s = code ? statutCode(code) : null;
      return { ok: s === 'actif' || s === 'programme', texte: code ? `Code ${code.code} : ${s === 'actif' ? 'actif' : s === 'programme' ? 'programmé' : s === 'expire' ? 'expiré' : 'désactivé'}` : `Code ${b.code} introuvable` };
    }),
  ];
  const pretAEnvoyer = verifs.every((v) => v.ok);
  const nbDest = c.type === 'offre' ? stats?.destinataires_offre : stats?.destinataires_info;

  return (
    <div className="-mx-4 md:-mx-8 text-[#3D2B1F]">
      {/* BARRE DU HAUT */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 bg-[#3D2B1F] text-[#F5EAE0] rounded-t-[20px]">
        <button type="button" onClick={onRetour} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#E3D6C4] hover:text-white"><ArrowLeft className="w-4 h-4" />Campagnes</button>
        <span className="font-serif text-lg text-white truncate max-w-[40ch]">{c.objet || 'Nouvelle campagne'}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide ${(STATUTS[c.statut] ?? STATUTS.brouillon).classe}`}>{(STATUTS[c.statut] ?? STATUTS.brouillon).libelle}</span>
        <span className="flex-1" />
        {modifiable && <span className="text-[13px] text-[#E3D6C4]" aria-live="polite">{sauvegarde === 'encours' ? 'Enregistrement…' : sauvegarde === 'erreur' ? 'Erreur d’enregistrement' : 'Enregistré'}</span>}
        {modifiable && (
          <button type="button" onClick={envoyerTest} disabled={test.etat === 'encours' || !etat?.cle_api} title={etat?.cle_api ? undefined : "Clé du prestataire d'envoi non configurée"} className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl border-[1.5px] border-[#E3D6C4] text-sm font-extrabold disabled:opacity-40">
            {test.etat === 'encours' ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}M&apos;envoyer un test
          </button>
        )}
        {modifiable && (
          <button type="button" onClick={() => setConfirmation(true)} disabled={!pretAEnvoyer} className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl bg-[#FF4500] text-white text-sm font-extrabold disabled:opacity-40">
            Vérifier et envoyer<Send className="w-4 h-4" />
          </button>
        )}
        {(c.statut === 'programmee' || c.statut === 'en_cours') && <button type="button" onClick={annuler} className="min-h-[42px] px-4 rounded-xl bg-[#F5EAE0] text-[#3D2B1F] text-sm font-extrabold">{c.statut === 'en_cours' ? "Arrêter l'envoi" : 'Annuler la programmation'}</button>}
        {!modifiable && <button type="button" onClick={dupliquer} className="inline-flex items-center gap-2 min-h-[42px] px-4 rounded-xl border-[1.5px] border-[#E3D6C4] text-sm font-extrabold"><Copy className="w-4 h-4" />Dupliquer</button>}
      </div>
      {test.etat !== 'idle' && test.etat !== 'encours' && (
        <p role="status" className={`px-6 py-2.5 text-sm font-bold ${test.etat === 'ok' ? 'bg-[#ECF7EF] text-[#166534]' : 'bg-[#FFF1EA] text-[#B83200]'}`}>{test.etat === 'ok' ? `E-mail de test ${test.message?.toLowerCase()}.` : test.message}</p>
      )}

      <div className="grid lg:grid-cols-[420px_minmax(0,1fr)] bg-[#F5EAE0] rounded-b-[20px] border border-t-0 border-[#E0D3C0] overflow-hidden">
        {/* COLONNE DE GAUCHE */}
        <div className="p-5 border-b lg:border-b-0 lg:border-r border-[#E0D3C0] bg-[#FBF6F0] space-y-6">
          {!modifiable && (
            <section className="p-4 rounded-2xl bg-white border border-[#E3D6C4]">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#5C4030] mb-2">Suivi</h3>
              {[
                ['Statut', (STATUTS[c.statut] ?? STATUTS.brouillon).libelle],
                ['Programmée pour', dateHeure(c.programmee_pour)],
                ['Départ', dateHeure(c.lancee_le)],
                ['Fin', dateHeure(c.terminee_le)],
                ['Destinataires', bilan?.destinataires ?? c.nb_destinataires ?? '—'],
                ['Envoyés', bilan?.envoyes ?? 0],
                ['Délivrés', bilan?.delivres ?? 0],
                ['Échecs', bilan?.echecs ?? 0],
                ['Désinscriptions', bilan?.desinscriptions ?? 0],
                ['Restant à envoyer', bilan?.restants ?? 0],
              ].map(([l, v]) => <p key={String(l)} className="flex justify-between gap-3 py-2 border-t border-[#F0E7DA] text-sm first-of-type:border-t-0"><span className="text-[#6F5A4B]">{l}</span><strong>{v}</strong></p>)}
              {c.statut === 'en_cours' && <EnvoiEnCours campagneId={c.id} onFini={charger} />}
            </section>
          )}

          <section>
            <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#5C4030]">Réglages</h3>
            <label className={etiquette} htmlFor="m-objet">Objet de l&apos;e-mail</label>
            <input id="m-objet" className={champ} value={c.objet} maxLength={150} disabled={!modifiable} onChange={(e) => modifier({ objet: e.target.value })} placeholder="Ex. : Noël approche : −10 % sur vos fruits et légumes" />
            <label className={etiquette} htmlFor="m-apercu">Texte d&apos;aperçu (affiché après l&apos;objet)</label>
            <input id="m-apercu" className={champ} value={c.apercu} maxLength={150} disabled={!modifiable} onChange={(e) => modifier({ apercu: e.target.value })} placeholder="Ex. : Code NOEL2026, du 1er au 25 décembre" />
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className={etiquette} htmlFor="m-nom">Nom de l&apos;expéditeur</label><input id="m-nom" className={champ} value={c.expediteur_nom} maxLength={60} disabled={!modifiable} onChange={(e) => modifier({ expediteur_nom: e.target.value })} /></div>
              <div>
                <label className={etiquette} htmlFor="m-adresse">Adresse d&apos;envoi</label>
                <div className="flex items-center rounded-xl border-[1.5px] border-[#DDD0BF] bg-white focus-within:border-[#FF4500] overflow-hidden">
                  <input id="m-adresse" className="w-full min-w-0 min-h-[43px] pl-3 text-[15px] font-semibold outline-none bg-transparent" value={c.expediteur_local} maxLength={40} disabled={!modifiable} onChange={(e) => modifier({ expediteur_local: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })} />
                  <span className="pr-3 text-[13px] text-[#8C7867] whitespace-nowrap">@{etat?.domaine || 'domaine'}</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#5C4030] mb-2.5">Type de message</h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['offre', 'Offre commerciale', `Promotions, nouveautés. Envoyée aux ${stats?.destinataires_offre ?? '…'} clients qui l'ont accepté.`],
                ['info', 'Information de service', `Livraisons, changement important. Sans aucune promotion. ${stats?.destinataires_info ?? '…'} clients.`],
              ] as const).map(([t, l, d]) => (
                <button key={t} type="button" disabled={!modifiable} onClick={() => modifier({ type: t })} aria-pressed={c.type === t}
                  className={`text-left p-3 rounded-xl border-[1.5px] bg-white ${c.type === t ? 'border-[#3D2B1F] ring-1 ring-[#3D2B1F] ring-inset' : 'border-[#DDD0BF]'} disabled:cursor-default`}>
                  <strong className="block text-sm">{l}</strong><span className="block mt-1 text-xs leading-snug text-[#6F5A4B]">{d}</span>
                </button>
              ))}
            </div>
            {c.type === 'info' && <p className="mt-2 text-xs leading-snug text-[#B83200]">Une information de service ne doit contenir ni promotion, ni code promo, ni mise en avant de produits : sinon c&apos;est une offre commerciale, réservée aux clients qui l&apos;ont acceptée.</p>}
          </section>

          {modifiable && (
            <section>
              <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#5C4030] mb-2.5">Ajouter un bloc</h3>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ['titre', 'Titre', Type], ['texte', 'Texte', Minus], ['image', 'Image', IconeImage], ['bouton', 'Bouton', MousePointerClick],
                  ['code', 'Code promo', Tag], ['produits', 'Produits', LayoutGrid], ['separateur', 'Séparateur', Minus], ['espace', 'Espace', Space],
                ] as const).map(([t, l, I]) => (
                  <button key={t} type="button" onClick={() => ajouter(t)} disabled={c.type === 'info' && (t === 'code' || t === 'produits')}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-[1.5px] border-dashed border-[#C9BBAA] bg-white text-xs font-bold text-[#5C4030] hover:border-[#FF4500] disabled:opacity-35">
                    <I className="w-5 h-5 text-[#C73600]" aria-hidden />{l}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-[#5C4030] mb-2.5">Contenu</h3>
            <ol className="space-y-1.5">
              {c.blocs.map((b, i) => (
                <li key={b.id}>
                  <div className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-white border ${selection === b.id ? 'border-[#FF4500] ring-1 ring-[#FF4500] ring-inset' : 'border-[#E3D6C4]'}`}>
                    <button type="button" onClick={() => setSelection(selection === b.id ? null : b.id)} className="flex-1 min-w-0 text-left py-1.5 text-sm font-semibold truncate">{resumeBloc(b, produits)}</button>
                    {modifiable && <>
                      <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => deplacer(b.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5EAE0] disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
                      <button type="button" aria-label="Descendre" disabled={i === c.blocs.length - 1} onClick={() => deplacer(b.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5EAE0] disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
                      <button type="button" aria-label="Supprimer le bloc" onClick={() => supprimerBloc(b.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8C7867] hover:text-[#B83200] hover:bg-[#FFF1EA]"><Trash2 className="w-4 h-4" /></button>
                    </>}
                  </div>
                  {selection === b.id && modifiable && (
                    <div className="mt-1.5 mb-3 p-3.5 rounded-xl bg-white border border-[#E3D6C4]">
                      <EditeurBloc bloc={b} produits={produits} codes={codes} onChange={(champs) => majBloc(b.id, champs)} />
                    </div>
                  )}
                </li>
              ))}
              <li className="px-3 py-2.5 rounded-xl border border-dashed border-[#C9BBAA] text-[13px] text-[#8C7867]">Pied de page légal {c.type === 'offre' ? 'et lien de désinscription ' : ''}(ajouté automatiquement)</li>
            </ol>
          </section>
          {modifiable && <button type="button" onClick={supprimer} className="text-sm font-bold text-[#B83200] hover:underline">Supprimer ce brouillon</button>}
        </div>

        {/* APERÇU */}
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#E0D3C0]">
            <div className="inline-flex p-1 rounded-xl bg-[#E8DCCB]" role="group" aria-label="Taille de l'aperçu">
              {([['ordinateur', 'Ordinateur', Monitor], ['mobile', 'Mobile', Smartphone]] as const).map(([v, l, I]) => (
                <button key={v} type="button" aria-pressed={ecran === v} onClick={() => setEcran(v)} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold ${ecran === v ? 'bg-white text-[#3D2B1F] shadow-sm' : 'text-[#5C4030]'}`}><I className="w-4 h-4" />{l}</button>
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold">
              {verifs.map((v) => <li key={v.texte} className={v.ok ? 'text-[#166534]' : 'text-[#B83200]'}>{v.ok ? '✓' : '✗'} {v.texte}</li>)}
            </ul>
          </div>
          <div className="flex-1 flex justify-center p-4 md:p-6 bg-[#E8DCCB] overflow-auto">
            <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(61,43,31,0.12)] overflow-hidden" style={{ width: ecran === 'mobile' ? 390 : 680, maxWidth: '100%' }}>
              <div className="px-4 py-2.5 border-b border-[#F0E7DA] text-[13px] leading-snug text-[#6F5A4B]">
                <strong className="text-[#3D2B1F]">{c.expediteur_nom || 'Soleil et Saveurs'}</strong> &lt;{c.expediteur_local}@{etat?.domaine || 'domaine'}&gt;<br />
                <strong className="text-[#3D2B1F]">{c.objet || 'Sans objet'}</strong>{c.apercu ? ` — ${c.apercu}` : ''}
              </div>
              {/* allow-same-origin sans allow-scripts : aucun script ne s'exécute, la hauteur peut être lue */}
              <iframe title="Aperçu de l'e-mail" srcDoc={html} sandbox="allow-same-origin" className="block w-full border-0" style={{ height: hauteurApercu }}
                onLoad={(e) => { const h = e.currentTarget.contentDocument?.documentElement.scrollHeight; if (h) setHauteurApercu(h + 4); }} />
            </div>
          </div>
        </div>
      </div>

      {confirmation && (
        <Confirmation campagne={c} etat={etat} nbDestinataires={nbDest ?? null} html={html} verifs={verifs}
          onFermer={() => setConfirmation(false)} onLance={() => { setConfirmation(false); charger(); }} />
      )}
    </div>
  );
}

function resumeBloc(b: Bloc, produits: Produit[]): string {
  switch (b.type) {
    case 'titre': return `Titre · ${b.texte || '(vide)'}`;
    case 'texte': return `Texte · ${nettoyerTexte(b.html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim().slice(0, 60) || '(vide)'}`;
    case 'image': return `Image${b.alt ? ` · ${b.alt}` : b.url ? '' : ' · à choisir'}`;
    case 'bouton': return `Bouton · ${b.texte}`;
    case 'code': return `Code promo · ${b.code || 'à choisir'}`;
    case 'produits': return `Produits · ${b.ids.length ? b.ids.map((id) => produits.find((p) => p.id === id)?.name?.trim()).filter(Boolean).slice(0, 3).join(', ') : 'à choisir'}`;
    case 'separateur': return 'Séparateur';
    case 'espace': return `Espace · ${b.hauteur ?? 24} px`;
  }
}

// --- Édition d'un bloc --------------------------------------------------------

function EditeurBloc({ bloc, produits, codes, onChange }: { bloc: Bloc; produits: Produit[]; codes: CodePromo[]; onChange: (c: Partial<Bloc>) => void }) {
  switch (bloc.type) {
    case 'titre':
      return (<>
        <label className="block mb-1.5 text-[13px] font-bold text-[#5C4030]" htmlFor={`t-${bloc.id}`}>Titre</label>
        <input id={`t-${bloc.id}`} className={champ} value={bloc.texte} maxLength={120} onChange={(e) => onChange({ texte: e.target.value })} />
        <Alignement valeur={bloc.alignement} onChange={(alignement) => onChange({ alignement })} />
      </>);
    case 'texte':
      return <EditeurTexte bloc={bloc} onChange={onChange} />;
    case 'image':
      return <EditeurImage bloc={bloc} produits={produits} onChange={onChange} />;
    case 'bouton':
      return (<>
        <label className="block mb-1.5 text-[13px] font-bold text-[#5C4030]">Texte du bouton</label>
        <input className={champ} value={bloc.texte} maxLength={50} onChange={(e) => onChange({ texte: e.target.value })} />
        <label className={etiquette}>Lien (page du site comme /commander, ou adresse https://…)</label>
        <input className={champ} value={bloc.lien} maxLength={300} onChange={(e) => onChange({ lien: e.target.value.trim() })} />
        {!/^(https:\/\/|\/|mailto:|tel:)/.test(bloc.lien) && <p className="mt-1.5 text-xs font-bold text-[#B83200]">Lien invalide : commencez par / ou https://</p>}
        <div className="flex gap-2 mt-3">
          {(['orange', 'brun'] as const).map((k) => <button key={k} type="button" aria-pressed={(bloc.couleur || 'orange') === k} onClick={() => onChange({ couleur: k })} className={`flex-1 min-h-[40px] rounded-xl text-sm font-extrabold text-white ${k === 'orange' ? 'bg-[#FF4500]' : 'bg-[#3D2B1F]'} ${(bloc.couleur || 'orange') === k ? 'ring-2 ring-offset-2 ring-[#3D2B1F]' : 'opacity-60'}`}>{k === 'orange' ? 'Orange' : 'Brun'}</button>)}
        </div>
      </>);
    case 'code': {
      const choisir = (code: CodePromo) => {
        const morceaux = ['À saisir dans le panier'];
        if (code.debut || code.fin) morceaux.push(libellePeriode(code.debut, code.fin).replace(/^D/, 'd').replace(/^J/, 'j').replace(/^À/, 'à'));
        if (code.max_par_client) morceaux.push(libelleLimite(code.max_par_client));
        onChange({ code: code.code, legende: morceaux.join(' · ') });
      };
      const utilisables = codes.filter((x) => ['actif', 'programme'].includes(statutCode(x)));
      return (<>
        <label className="block mb-1.5 text-[13px] font-bold text-[#5C4030]">Code promo à mettre en avant</label>
        <div className="flex flex-wrap gap-1.5">
          {utilisables.length === 0 && <p className="text-sm text-[#6F5A4B]">Aucun code actif ou programmé. Créez-en un dans l&apos;onglet Codes promo.</p>}
          {utilisables.map((x) => <button key={x.id} type="button" aria-pressed={bloc.code === x.code} onClick={() => choisir(x)} className={`px-3 py-2 rounded-xl border-[1.5px] text-sm font-extrabold tracking-wide ${bloc.code === x.code ? 'bg-[#3D2B1F] border-[#3D2B1F] text-[#F5EAE0]' : 'border-[#DDD0BF] bg-white'}`}>{x.code} <span className="font-bold opacity-75">−{x.reduction_pct} %</span></button>)}
        </div>
        <label className={etiquette}>Conditions affichées sous le code</label>
        <input className={champ} value={bloc.legende || ''} maxLength={140} onChange={(e) => onChange({ legende: e.target.value })} />
      </>);
    }
    case 'produits': {
      const actifs = produits.filter((p) => p.actif !== false);
      const basculer = (pid: string) => onChange({ ids: bloc.ids.includes(pid) ? bloc.ids.filter((x) => x !== pid) : [...bloc.ids, pid].slice(0, 6) });
      return (<>
        <p className="mb-2 text-[13px] font-bold text-[#5C4030]">Produits affichés ({bloc.ids.length}/6) · nom, photo et prix du jour</p>
        <div className="max-h-[260px] overflow-y-auto grid grid-cols-2 gap-1.5 pr-1">
          {actifs.map((p) => {
            const on = bloc.ids.includes(String(p.id));
            return (
              <button key={p.id} type="button" aria-pressed={on} onClick={() => basculer(String(p.id))} disabled={!on && bloc.ids.length >= 6}
                className={`flex items-center gap-2 p-1.5 rounded-xl border-[1.5px] text-left text-[13px] font-semibold ${on ? 'border-[#166534] bg-[#ECF7EF]' : 'border-[#E3D6C4] bg-white'} disabled:opacity-40`}>
                {p.image_url ? <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" /> : <span className="w-9 h-9 rounded-lg bg-[#F5EAE0] shrink-0" />}
                <span className="truncate">{p.name}</span>
                {on && <Check className="w-4 h-4 ml-auto shrink-0 text-[#166534]" />}
              </button>
            );
          })}
        </div>
      </>);
    }
    case 'espace':
      return (<>
        <label className="block mb-1.5 text-[13px] font-bold text-[#5C4030]">Hauteur : {bloc.hauteur ?? 24} px</label>
        <input type="range" min={8} max={80} step={4} value={bloc.hauteur ?? 24} onChange={(e) => onChange({ hauteur: Number(e.target.value) })} className="w-full accent-[#FF4500]" />
      </>);
    default:
      return <p className="text-sm text-[#6F5A4B]">Ce bloc n&apos;a pas de réglage.</p>;
  }
}

function Alignement({ valeur, onChange }: { valeur?: 'gauche' | 'centre'; onChange: (v: 'gauche' | 'centre') => void }) {
  return (
    <div className="flex gap-1.5 mt-2.5" role="group" aria-label="Alignement">
      {(['gauche', 'centre'] as const).map((a) => <button key={a} type="button" aria-pressed={(valeur || 'gauche') === a} onClick={() => onChange(a)} className={`px-3 py-1.5 rounded-lg border-[1.5px] text-[13px] font-bold ${(valeur || 'gauche') === a ? 'border-[#3D2B1F] bg-[#3D2B1F] text-[#F5EAE0]' : 'border-[#DDD0BF]'}`}>{a === 'gauche' ? 'À gauche' : 'Centré'}</button>)}
    </div>
  );
}

// Texte mis en forme : gras, italique, souligné, couleurs du site, liens.
function EditeurTexte({ bloc, onChange }: { bloc: Extract<Bloc, { type: 'texte' }>; onChange: (c: Partial<Bloc>) => void }) {
  const zone = useRef<HTMLDivElement>(null);
  const initial = useRef(bloc.html);
  useEffect(() => { if (zone.current) zone.current.innerHTML = nettoyerTexte(initial.current); }, []);
  const publier = () => { if (zone.current) onChange({ html: nettoyerTexte(zone.current.innerHTML) }); };
  const commande = (cmd: string, valeur?: string) => {
    zone.current?.focus();
    document.execCommand('styleWithCSS', false, cmd === 'foreColor' ? 'true' : 'false');
    document.execCommand(cmd, false, valeur);
    publier();
  };
  const lien = () => {
    const url = window.prompt('Adresse du lien (page du site comme /commander, ou https://…)', '/commander');
    if (!url) return;
    if (!/^(https:\/\/|\/|mailto:|tel:)/.test(url.trim())) { window.alert('Le lien doit commencer par / ou https://'); return; }
    commande('createLink', url.trim());
  };
  const outil = 'w-9 h-9 flex items-center justify-center rounded-lg text-[#F5EAE0] hover:bg-[#5C4030]';
  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 p-1 mb-2 rounded-xl bg-[#3D2B1F]" role="toolbar" aria-label="Mise en forme">
        <button type="button" className={outil} aria-label="Gras" onMouseDown={(e) => { e.preventDefault(); commande('bold'); }}><Bold className="w-4 h-4" /></button>
        <button type="button" className={outil} aria-label="Italique" onMouseDown={(e) => { e.preventDefault(); commande('italic'); }}><Italic className="w-4 h-4" /></button>
        <button type="button" className={outil} aria-label="Souligné" onMouseDown={(e) => { e.preventDefault(); commande('underline'); }}><Underline className="w-4 h-4" /></button>
        <span className="w-px h-5 mx-1 bg-[#5C4030]" />
        {COULEURS_TEXTE.map((c) => <button key={c.valeur} type="button" aria-label={`Couleur ${c.nom}`} title={c.nom} onMouseDown={(e) => { e.preventDefault(); commande('foreColor', c.valeur); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#5C4030]"><span className="w-4 h-4 rounded-full border-2 border-white" style={{ background: c.valeur }} /></button>)}
        <span className="w-px h-5 mx-1 bg-[#5C4030]" />
        <button type="button" className={outil} aria-label="Lien" onMouseDown={(e) => { e.preventDefault(); lien(); }}><IconeLien className="w-4 h-4" /></button>
        <button type="button" className="h-9 px-2 rounded-lg text-xs font-extrabold text-[#F5EAE0] hover:bg-[#5C4030]" onMouseDown={(e) => { e.preventDefault(); commande('insertText', '{prenom}'); }} title="Remplacé par le prénom du client">+ Prénom</button>
      </div>
      <div ref={zone} contentEditable suppressContentEditableWarning onInput={publier} onBlur={publier} aria-label="Texte du bloc" role="textbox" aria-multiline="true"
        className="min-h-[120px] p-3 rounded-xl border-[1.5px] border-[#DDD0BF] bg-white text-[15px] leading-relaxed outline-none focus:border-[#FF4500] [&_a]:text-[#C73600] [&_a]:underline" />
      <p className="mt-1.5 text-xs text-[#6F5A4B]">« {'{prenom}'} » est remplacé par le prénom de chaque client (ou retiré s&apos;il est inconnu).</p>
      <Alignement valeur={bloc.alignement} onChange={(alignement) => onChange({ alignement })} />
    </>
  );
}

// Image : photo importée (réduite à 1200 px) ou photo d'un produit du site
function EditeurImage({ bloc, produits, onChange }: { bloc: Extract<Bloc, { type: 'image' }>; produits: Produit[]; onChange: (c: Partial<Bloc>) => void }) {
  const [envoi, setEnvoi] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const photos = [...new Set(produits.map((p) => p.image_url).filter((u): u is string => Boolean(u)))].slice(0, 40);

  async function importer(f: File) {
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(f.type)) { window.alert('Format non supporté (JPG, PNG, WEBP, GIF ou AVIF).'); return; }
    if (f.size > 20 * 1024 * 1024) { window.alert('Image trop lourde (20 Mo maximum).'); return; }
    setEnvoi(true);
    try {
      const img = await createImageBitmap(f);
      const echelle = Math.min(1, 1200 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * echelle);
      canvas.height = Math.round(img.height * echelle);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('conversion'))), 'image/jpeg', 0.85));
      const nom = `mail/${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const { error } = await supabase.storage.from('produits-images').upload(nom, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      onChange({ url: supabase.storage.from('produits-images').getPublicUrl(nom).data.publicUrl });
    } catch (e) {
      console.error(e);
      window.alert("Erreur lors de l'envoi de l'image.");
    } finally {
      setEnvoi(false);
    }
  }

  return (<>
    <input ref={fichier} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importer(f); }} />
    <button type="button" onClick={() => fichier.current?.click()} disabled={envoi} className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl border-[1.5px] border-[#3D2B1F] text-sm font-extrabold disabled:opacity-50">
      {envoi ? <Loader2 className="w-4 h-4 animate-spin" /> : <IconeImage className="w-4 h-4" />}Importer une photo
    </button>
    {photos.length > 0 && <>
      <p className="mt-3 mb-1.5 text-[13px] font-bold text-[#5C4030]">Ou une photo de vos produits</p>
      <div className="grid grid-cols-5 gap-1.5 max-h-[150px] overflow-y-auto pr-1">
        {photos.map((u) => <button key={u} type="button" aria-pressed={bloc.url === u} onClick={() => onChange({ url: u })} className={`aspect-square rounded-lg overflow-hidden ${bloc.url === u ? 'ring-2 ring-[#FF4500] ring-offset-1' : ''}`}><img src={u} alt="" className="w-full h-full object-cover" /></button>)}
      </div>
    </>}
    <label className={etiquette}>Description de l&apos;image (lue si l&apos;image ne s&apos;affiche pas)</label>
    <input className={champ} value={bloc.alt || ''} maxLength={120} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Ex. : étal de clémentines" />
    <label className={etiquette}>Lien au clic (facultatif)</label>
    <input className={champ} value={bloc.lien || ''} maxLength={300} onChange={(e) => onChange({ lien: e.target.value.trim() })} placeholder="/commander" />
  </>);
}

// --- Confirmation et envoi ----------------------------------------------------

function Confirmation({ campagne, etat, nbDestinataires, html, verifs, onFermer, onLance }: {
  campagne: Campagne; etat: EtatEnvoi | null; nbDestinataires: number | null; html: string;
  verifs: { ok: boolean; texte: string }[]; onFermer: () => void; onLance: () => void;
}) {
  const [quand, setQuand] = useState<'maintenant' | 'programmer'>('maintenant');
  const [date, setDate] = useState(() => isoVersParis(new Date(Date.now() + 3600_000).toISOString()).slice(0, 14) + '00');
  const [saisie, setSaisie] = useState('');
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const isoProgramme = quand === 'programmer' ? parisVersIso(date) : null;
  const bloque = !etat?.pret;
  const programmable = Boolean(etat?.envoi_auto);
  const [ouvertLe] = useState(() => Date.now());
  const dateOk = quand === 'maintenant' || (isoProgramme && new Date(isoProgramme).getTime() > ouvertLe);

  async function lancer() {
    setEncours(true);
    setErreur(null);
    const { error } = await supabase.rpc('programmer_campagne', { p_id: campagne.id, p_quand: isoProgramme, p_confirmation: saisie.trim() });
    if (error) { setEncours(false); setErreur(error.message); return; }
    if (quand === 'maintenant') await fetch('/api/mail/traiter', { method: 'POST' }).catch(() => null);
    setEncours(false);
    onLance();
  }

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape' && !encours) onFermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [encours, onFermer]);

  const typeLibelle = campagne.type === 'offre' ? "Offre commerciale : clients ayant accepté les offres (désinscrits et adresses en erreur exclus)" : "Information de service : tous les clients à l'adresse confirmée (adresses en erreur exclues)";
  return (
    <div className="fixed inset-0 z-[300] flex items-start md:items-center justify-center p-3 md:p-6 bg-[rgba(61,43,31,0.55)] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titre-confirmation">
      <div className="w-full max-w-[780px] bg-white rounded-[24px] overflow-hidden shadow-2xl text-[#3D2B1F]">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-[#F0E7DA]">
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#C73600]">Dernière vérification</p>
            <h2 id="titre-confirmation" className="titre text-[28px] leading-tight mt-1">Envoyer « {campagne.objet} » à {nbDestinataires ?? '…'} clients ?</h2>
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-[#F5EAE0]"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid md:grid-cols-[minmax(0,1fr)_210px] gap-5 px-6 py-5">
          <div className="text-[15px]">
            {[
              ['Objet', campagne.objet],
              ['Expéditeur', `${campagne.expediteur_nom} <${campagne.expediteur_local}@${etat?.domaine || '…'}>`],
              ['Destinataires', `${nbDestinataires ?? '…'} clients`],
              ['Type', typeLibelle],
              ['Envoi', quand === 'maintenant' ? 'Dès la confirmation' : isoProgramme ? dateParis(isoProgramme, { jour: true }) + ' (heure de Paris)' : 'Date à choisir'],
            ].map(([l, v]) => <p key={l} className="flex justify-between gap-4 py-2.5 border-b border-[#F0E7DA]"><span className="shrink-0 text-[#6F5A4B]">{l}</span><strong className="text-right">{v}</strong></p>)}
            <div className="flex gap-2 mt-3.5">
              <button type="button" aria-pressed={quand === 'maintenant'} onClick={() => setQuand('maintenant')} className={`flex-1 text-left p-3 rounded-xl border-[1.5px] ${quand === 'maintenant' ? 'border-[#3D2B1F] ring-1 ring-inset ring-[#3D2B1F]' : 'border-[#DDD0BF]'}`}><strong className="block text-sm">Maintenant</strong><span className="text-[13px] text-[#6F5A4B]">dès la confirmation</span></button>
              <button type="button" aria-pressed={quand === 'programmer'} disabled={!programmable} onClick={() => setQuand('programmer')} title={programmable ? undefined : "L'envoi programmé sera disponible après l'activation de l'envoi automatique"} className={`flex-1 text-left p-3 rounded-xl border-[1.5px] disabled:opacity-40 ${quand === 'programmer' ? 'border-[#3D2B1F] ring-1 ring-inset ring-[#3D2B1F]' : 'border-[#DDD0BF]'}`}><strong className="block text-sm">Programmer</strong><span className="text-[13px] text-[#6F5A4B]">{programmable ? 'à une date choisie' : 'bientôt disponible'}</span></button>
            </div>
            {quand === 'programmer' && <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={`${champ} mt-2.5`} aria-label="Date et heure d'envoi (heure de Paris)" />}
          </div>
          <div className="relative h-[300px] border border-[#E3D6C4] rounded-2xl overflow-hidden">
            <iframe title="Aperçu réduit" srcDoc={html} sandbox="" className="absolute top-0 left-0 border-0 origin-top-left" style={{ width: 640, height: 1200, transform: 'scale(0.33)' }} />
          </div>
        </div>
        <ul className="mx-6 px-4 py-3 rounded-2xl bg-[#ECF7EF] text-sm font-semibold leading-7 text-[#166534]">
          <li className={campagne.test_envoye_le ? '' : 'text-[#B83200]'}>{campagne.test_envoye_le ? `✓ E-mail de test envoyé le ${dateHeure(campagne.test_envoye_le)}` : '! Aucun e-mail de test envoyé (conseillé avant l’envoi)'}</li>
          {verifs.map((v) => <li key={v.texte} className={v.ok ? '' : 'text-[#B83200]'}>{v.ok ? '✓' : '✗'} {v.texte}</li>)}
        </ul>
        {bloque && <p className="mx-6 mt-3 flex gap-2.5 px-4 py-3 rounded-2xl bg-[#FFF1EA] text-sm leading-relaxed text-[#B83200]"><AlertTriangle className="w-5 h-5 shrink-0" /><span><strong>Envoi impossible pour l&apos;instant :</strong> {etat?.raison || 'état du prestataire inconnu.'}</span></p>}
        <div className="px-6 pt-5 pb-6">
          <label htmlFor="saisie-envoyer" className="block text-sm font-bold text-[#5C4030]">Pour confirmer, tapez <strong className="text-[#3D2B1F]">ENVOYER</strong></label>
          <input id="saisie-envoyer" value={saisie} onChange={(e) => setSaisie(e.target.value.toUpperCase())} autoComplete="off" disabled={bloque} className={`${champ} mt-2 text-lg tracking-[0.1em] font-extrabold`} />
          {erreur && <p role="alert" className="mt-2 text-sm font-bold text-[#B83200]">{erreur}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-4">
            <button type="button" onClick={onFermer} className="min-h-[54px] px-5 rounded-2xl border-[1.5px] border-[#3D2B1F] font-extrabold">Revenir modifier</button>
            <button type="button" onClick={lancer} disabled={bloque || encours || saisie.trim() !== 'ENVOYER' || !dateOk} className="flex-1 inline-flex items-center justify-center gap-2 min-h-[54px] px-5 rounded-2xl bg-[#FF4500] text-white font-extrabold disabled:opacity-40">
              {encours ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {quand === 'maintenant' ? `Envoyer à ${nbDestinataires ?? '…'} clients` : `Programmer l'envoi à ${nbDestinataires ?? '…'} clients`}
            </button>
          </div>
          <p className="mt-3 text-[13px] text-[#6F5A4B]">Une campagne programmée peut être annulée jusqu&apos;à l&apos;heure d&apos;envoi. Une fois partie, elle ne peut plus être rappelée.</p>
        </div>
      </div>
    </div>
  );
}

// Envoi lancé depuis l'administration : l'écran relance le traitement lot
// par lot tant qu'il reste des e-mails (la page doit rester ouverte).
function EnvoiEnCours({ campagneId, onFini }: { campagneId: string; onFini: () => void }) {
  const [message, setMessage] = useState('Envoi en cours…');
  const actif = useRef(true);
  useEffect(() => {
    actif.current = true;
    (async () => {
      for (let i = 0; i < 400 && actif.current; i++) {
        const r = await fetch('/api/mail/traiter', { method: 'POST' }).catch(() => null);
        const d = await r?.json().catch(() => ({}));
        if (!r?.ok) { setMessage(d?.error || "Envoi interrompu : réessayez dans quelques minutes."); break; }
        if (d.pause) { setMessage('Limite du prestataire atteinte : reprise dans une minute…'); await new Promise((ok) => setTimeout(ok, 60_000)); continue; }
        onFini();
        if (d.termine || (d.campagne_id && d.campagne_id !== campagneId)) { setMessage('Envoi terminé.'); break; }
        setMessage(`Envoi en cours… ${d.restants ?? ''} restant(s). Gardez cette page ouverte.`);
      }
    })();
    return () => { actif.current = false; };
  }, [campagneId, onFini]);
  return <p className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FFF1EA] text-sm font-bold text-[#C73600]"><Loader2 className="w-4 h-4 animate-spin shrink-0" />{message}</p>;
}
