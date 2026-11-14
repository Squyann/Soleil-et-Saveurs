'use client';

// Fiche propre à une variante (admin, fenêtre « Variantes du produit »).
// Chaque rubrique : « Reprendre le produit » (rien n'est enregistré, la page
// affiche la rubrique du produit principal et suit ses changements) ou
// « Texte propre ». Une variante sans rubrique propre n'a pas de ligne en base.
import React, { useEffect, useRef, useState } from 'react';
import { X, Save, Loader2, ImagePlus, Trash2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Plus, ChefHat, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CadrageImage from '@/components/CadrageImage';
import {
  MOIS, MOIS_COURTS, PHOTOS_MAX, RUBRIQUES_TEXTE, TOTAL_RUBRIQUES_VARIANTE, rubriquesPropres,
  type Fiche, type FicheVariante, type Recette, type RubriqueTexte,
} from '@/lib/fiches';
import { nomVariante, slugVariante, type Variante } from '@/lib/variantes';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const TAILLE_MAX_SOURCE = 20 * 1024 * 1024;
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;
const BUCKET = 'produits-images';

const LIBELLES: Record<RubriqueTexte, { titre: string; aide: string; court?: boolean }> = {
  accroche: { titre: 'Phrase d’accroche', aide: 'Affichée sous le titre.', court: true },
  description: { titre: 'Description', aide: 'Présentation de la variante.' },
  origine_detail: { titre: 'Origine', aide: 'Région, producteur, mode de culture…' },
  caracteristiques: { titre: 'Caractéristiques', aide: 'Une ligne par point (affichées avec une coche).' },
  gout: { titre: 'Goût et saveurs', aide: 'Sucré, acidulé, parfumé, croquant…' },
  conservation: { titre: 'Conservation', aide: 'Où et combien de temps la conserver.' },
  preparation: { titre: 'Conseils de préparation', aide: 'Lavage, découpe, cuisson…' },
};

type RecetteSaisie = { titre: string; temps: string; personnes: string; ingredients: string; etapes: string; photo: string };
const recetteVide = (): RecetteSaisie => ({ titre: '', temps: '', personnes: '', ingredients: '', etapes: '', photo: '' });
const versSaisie = (r: Recette): RecetteSaisie => ({
  titre: r.titre ?? '', temps: r.temps ?? '', personnes: r.personnes ?? '',
  ingredients: (r.ingredients ?? []).join('\n'), etapes: (r.etapes ?? []).join('\n'), photo: r.photo ?? '',
});
const lignes = (t: string) => t.split('\n').map(l => l.trim()).filter(Boolean);

// null = reprendre le produit
type Formulaire = {
  textes: Record<RubriqueTexte, string | null>;
  photos: string[] | null;
  saison_mois: number[] | null;
  recettes: RecetteSaisie[] | null;
};

function versFormulaire(fv: FicheVariante | null): Formulaire {
  return {
    textes: Object.fromEntries(RUBRIQUES_TEXTE.map(c => [c, fv?.[c]?.trim() ? fv[c] as string : null])) as Record<RubriqueTexte, string | null>,
    photos: fv?.photos ? [...fv.photos] : null,
    saison_mois: fv?.saison_mois ? [...fv.saison_mois].map(Number).sort((a, b) => a - b) : null,
    recettes: fv?.recettes ? fv.recettes.map(versSaisie) : null,
  };
}

const photosUtilisees = (f: Formulaire) => [...(f.photos ?? []), ...(f.recettes ?? []).map(r => r.photo)].filter(Boolean);
function cheminFiche(url: string): string | null {
  const chemin = url.split(`/${BUCKET}/`)[1];
  return chemin && chemin.startsWith('fiches/variantes/') ? decodeURIComponent(chemin) : null;
}
async function supprimerPhotos(urls: string[]) {
  const chemins = urls.map(cheminFiche).filter((c): c is string => !!c);
  if (chemins.length) await supabase.storage.from(BUCKET).remove(chemins);
}

function Choix({ propre, onChange }: { propre: boolean; onChange: (propre: boolean) => void }) {
  return (
    <div className="inline-flex p-[3px] rounded-xl bg-[#EDE3D5] shrink-0" role="group">
      <button type="button" aria-pressed={!propre} onClick={() => onChange(false)} className={`px-2.5 sm:px-3 py-1.5 rounded-[9px] text-xs sm:text-[13px] font-bold ${!propre ? 'bg-white text-[#3D2B1F] shadow-sm' : 'text-[#5C4030]'}`}>Reprendre le produit</button>
      <button type="button" aria-pressed={propre} onClick={() => onChange(true)} className={`px-2.5 sm:px-3 py-1.5 rounded-[9px] text-xs sm:text-[13px] font-bold ${propre ? 'bg-white text-[#3D2B1F] shadow-sm' : 'text-[#5C4030]'}`}>Propre</button>
    </div>
  );
}

function Bloc({ titre, propre, onChange, aide, children, herite }: { titre: string; propre: boolean; onChange: (p: boolean) => void; aide?: string; children?: React.ReactNode; herite: React.ReactNode }) {
  return (
    <section className={`p-4 rounded-[18px] border ${propre ? 'border-[#3D2B1F] bg-[#FBF6F0]' : 'border-[#E3D6C4] bg-white'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-extrabold text-[15px]">{titre}</p>
        <Choix propre={propre} onChange={onChange} />
      </div>
      {propre ? (
        <div className="mt-2.5">{aide && <p className="mb-1.5 text-xs text-[#6F5A4B]">{aide}</p>}{children}</div>
      ) : (
        <div className="mt-2.5 px-3.5 py-3 rounded-xl bg-[#F8F1E8] text-sm leading-relaxed text-[#8C7867]">
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#6F5A4B]">Affiché : repris du produit</p>
          {herite}
        </div>
      )}
    </section>
  );
}

export default function EditeurFicheVariante({
  produit, variante, ficheProduit, ficheVariante, onFermer, onEnregistre,
}: {
  produit: any;
  variante: Variante;
  ficheProduit: Fiche | null;
  ficheVariante: FicheVariante | null;
  onFermer: () => void;
  onEnregistre: (fv: FicheVariante | null) => void;
}) {
  const [enregistree, setEnregistree] = useState<FicheVariante | null>(ficheVariante);
  const [form, setForm] = useState<Formulaire>(() => versFormulaire(ficheVariante));
  const reference = useRef(JSON.stringify(versFormulaire(ficheVariante)));
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [cadrage, setCadrage] = useState<{ src: string; cible: 'galerie' | number } | null>(null);
  const deposees = useRef<Set<string>>(new Set());

  const modifie = JSON.stringify(form) !== reference.current;
  const propres = rubriquesPropres({
    ...form.textes, photos: form.photos, saison_mois: form.saison_mois,
    recettes: form.recettes as unknown as Recette[] | null,
  });
  const titre = nomVariante(produit, variante);

  useEffect(() => {
    if (!modifie) return;
    const avertir = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [modifie]);

  const texteProduit = (c: RubriqueTexte) => (ficheProduit?.[c] as string | null | undefined)?.trim() || null;
  const majTexte = (c: RubriqueTexte, v: string | null) => setForm(f => ({ ...f, textes: { ...f.textes, [c]: v } }));
  const majRecette = (i: number, champs: Partial<RecetteSaisie>) =>
    setForm(f => ({ ...f, recettes: (f.recettes ?? []).map((r, j) => (j === i ? { ...r, ...champs } : r)) }));
  const deplacer = <T,>(liste: T[], i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= liste.length) return liste;
    const copie = [...liste];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    return copie;
  };

  function fermer() {
    if (modifie && !confirm('Des modifications ne sont pas enregistrées. Fermer quand même ?')) return;
    const gardees = new Set(photosUtilisees(versFormulaire(enregistree)));
    supprimerPhotos([...deposees.current].filter(u => !gardees.has(u)));
    onFermer();
  }

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>, cible: 'galerie' | number) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { alert('Format non supporté. Utilisez une image JPG, PNG, WEBP, GIF ou AVIF.'); return; }
    if (file.size > TAILLE_MAX_SOURCE) { alert('Image trop lourde (20 Mo maximum).'); return; }
    setCadrage({ src: URL.createObjectURL(file), cible });
  }
  function fermerCadrage() {
    if (cadrage?.src.startsWith('blob:')) URL.revokeObjectURL(cadrage.src);
    setCadrage(null);
  }
  async function envoyerPhoto(image: Blob) {
    if (!cadrage) return;
    if (image.size > TAILLE_MAX_IMAGE) { alert('Image trop lourde (5 Mo maximum).'); return; }
    try {
      const nom = `fiches/variantes/${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(nom, image, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const url = supabase.storage.from(BUCKET).getPublicUrl(nom).data.publicUrl;
      deposees.current.add(url);
      if (cadrage.cible === 'galerie') setForm(f => ({ ...f, photos: [...(f.photos ?? []), url].slice(0, PHOTOS_MAX) }));
      else majRecette(cadrage.cible, { photo: url });
      fermerCadrage();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la photo.");
    }
  }

  async function enregistrer() {
    setMessage(null);
    setEnCours(true);
    try {
      const textes = Object.fromEntries(RUBRIQUES_TEXTE.map(c => [c, form.textes[c]?.trim() || null]));
      const recettes = form.recettes
        ? form.recettes.filter(r => r.titre.trim()).map(r => ({
          titre: r.titre.trim(), temps: r.temps.trim(), personnes: r.personnes.trim(),
          ingredients: lignes(r.ingredients), etapes: lignes(r.etapes), photo: r.photo,
        }))
        : null;
      const donnees = { variant_id: variante.id, ...textes, photos: form.photos, saison_mois: form.saison_mois, recettes };
      let nouvelle: FicheVariante | null = null;
      if (rubriquesPropres(donnees as Partial<FicheVariante>) === 0) {
        // Tout est repris du produit : pas de fiche propre
        const { error } = await supabase.from('fiches_variantes').delete().eq('variant_id', variante.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('fiches_variantes').upsert(donnees, { onConflict: 'variant_id' }).select().single();
        if (error) throw error;
        nouvelle = data as FicheVariante;
      }
      const avant = photosUtilisees(versFormulaire(enregistree));
      const maintenant = new Set(photosUtilisees(versFormulaire(nouvelle)));
      await supprimerPhotos([...avant, ...deposees.current].filter(u => !maintenant.has(u)));
      deposees.current.clear();
      const f = versFormulaire(nouvelle);
      setEnregistree(nouvelle);
      setForm(f);
      reference.current = JSON.stringify(f);
      onEnregistre(nouvelle);
      setMessage({ type: 'ok', texte: nouvelle ? 'Fiche de la variante enregistrée.' : 'Enregistré : la variante reprend entièrement la fiche du produit.' });
    } catch (err: any) {
      console.error(err);
      const texte = err?.code === '42P01' || err?.code === 'PGRST205'
        ? "La base n'est pas encore à jour : faites lancer la migration 20261116_fiches_variantes.sql."
        : `Erreur : ${err?.message ?? 'enregistrement impossible'}`;
      setMessage({ type: 'erreur', texte });
    } finally {
      setEnCours(false);
    }
  }

  const champ = 'w-full rounded-xl border-[1.5px] border-[#DDD0BF] bg-white p-3 text-[15px] leading-relaxed text-[#3D2B1F] outline-none focus:border-[#FF4500] transition-colors';
  const vide = <span className="italic">Rubrique vide sur le produit : rien ne s’affiche.</span>;
  const lienApercu = ficheProduit ? `/produits/${ficheProduit.slug}?variete=${encodeURIComponent(slugVariante(produit, variante))}` : null;

  return (
    <div className="fixed inset-0 z-[160] flex items-stretch sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-[#F5EAE0] text-[#3D2B1F] w-full sm:max-w-3xl h-full sm:h-[92vh] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-[#F0E7DA]">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F5EAE0] shrink-0">
            {(variante.image_url || produit.image_url) && <img src={variante.image_url || produit.image_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#C73600]">Fiche de la variante</p>
            <p className="titre text-[22px] sm:text-[26px] leading-tight truncate">{titre}</p>
          </div>
          <p className="hidden sm:block text-right text-[13px] text-[#6F5A4B]"><strong className="block text-xl text-[#3D2B1F]">{propres} / {TOTAL_RUBRIQUES_VARIANTE}</strong>rubriques propres</p>
          <button onClick={fermer} aria-label="Fermer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F5EAE0] text-[#5C4030] hover:bg-[#EDE3D5] shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 space-y-3">
          {!ficheProduit && (
            <p className="flex gap-2.5 px-4 py-3 rounded-2xl bg-[#FFF1EA] text-sm leading-relaxed text-[#B83200]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>« {produit.name.trim()} » n’a pas encore de page détaillée : créez-la et publiez-la d’abord (bouton « Créer la fiche » sur la carte du produit). Sans elle, la fiche de la variante ne sera pas visible.</span>
            </p>
          )}

          {RUBRIQUES_TEXTE.map(c => {
            const propre = form.textes[c] !== null;
            const produitTexte = texteProduit(c);
            return (
              <Bloc key={c} titre={LIBELLES[c].titre} aide={LIBELLES[c].aide} propre={propre}
                onChange={(p) => majTexte(c, p ? (form.textes[c] ?? produitTexte ?? '') : null)}
                herite={produitTexte ? <span className="whitespace-pre-line">{produitTexte}</span> : vide}>
                {LIBELLES[c].court
                  ? <input className={champ} maxLength={200} value={form.textes[c] ?? ''} onChange={e => majTexte(c, e.target.value)} />
                  : <textarea className={`${champ} min-h-[110px]`} rows={c === 'description' ? 6 : 4} value={form.textes[c] ?? ''} onChange={e => majTexte(c, e.target.value)} />}
              </Bloc>
            );
          })}

          <Bloc titre="Photos" propre={form.photos !== null} onChange={(p) => setForm(f => ({ ...f, photos: p ? (f.photos ?? []) : null }))}
            aide={`La photo de la variante s’affiche en premier. Ajoutez jusqu’à ${PHOTOS_MAX} photos propres ; sans photo propre, celles du produit sont affichées après.`}
            herite={(ficheProduit?.photos?.length ?? 0) > 0
              ? <span className="flex gap-2 flex-wrap">{ficheProduit!.photos.map(u => <img key={u} src={u} alt="" className="w-16 h-11 object-cover rounded-lg" />)}</span>
              : <span className="italic">Aucune photo supplémentaire sur le produit.</span>}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(form.photos ?? []).map((url, i, liste) => (
                <div key={url} className="relative aspect-[3/2] rounded-xl overflow-hidden bg-[#EDE3D5]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-1.5 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setForm(f => ({ ...f, photos: deplacer(liste, i, -1) }))} disabled={i === 0} aria-label="Déplacer à gauche" className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center disabled:opacity-30"><ArrowLeft className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => setForm(f => ({ ...f, photos: deplacer(liste, i, 1) }))} disabled={i === liste.length - 1} aria-label="Déplacer à droite" className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center disabled:opacity-30"><ArrowRight className="w-3.5 h-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, photos: liste.filter((_, j) => j !== i) }))} aria-label="Retirer la photo" className="w-7 h-7 rounded-lg bg-[#B83200] text-white flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {(form.photos?.length ?? 0) < PHOTOS_MAX && (
                <label className="relative aspect-[3/2] rounded-xl border-2 border-dashed border-[#C9BBAA] bg-white flex flex-col items-center justify-center gap-1 text-[#8C7867] hover:border-[#FF4500] hover:text-[#FF4500] cursor-pointer">
                  <ImagePlus className="w-6 h-6" /><span className="text-xs font-bold">Ajouter</span>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => choisirPhoto(e, 'galerie')} />
                </label>
              )}
            </div>
          </Bloc>

          <Bloc titre="Saisonnalité" propre={form.saison_mois !== null} onChange={(p) => setForm(f => ({ ...f, saison_mois: p ? (f.saison_mois ?? [...(ficheProduit?.saison_mois ?? [])].map(Number)) : null }))}
            herite={(ficheProduit?.saison_mois?.length ?? 0) > 0 ? <span>{ficheProduit!.saison_mois.map(m => MOIS_COURTS[Number(m) - 1]).join(', ')}</span> : vide}>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {MOIS.map((nom, i) => {
                const m = i + 1;
                const actif = (form.saison_mois ?? []).includes(m);
                return (
                  <button key={nom} type="button" aria-pressed={actif}
                    onClick={() => setForm(f => ({ ...f, saison_mois: actif ? (f.saison_mois ?? []).filter(x => x !== m) : [...(f.saison_mois ?? []), m].sort((a, b) => a - b) }))}
                    className={`py-2.5 rounded-xl text-xs font-extrabold ${actif ? 'bg-[#166534] text-white' : 'bg-white border border-[#E3D6C4] text-[#6F5A4B]'}`}>
                    {MOIS_COURTS[i]}
                  </button>
                );
              })}
            </div>
          </Bloc>

          <Bloc titre={`Recettes${form.recettes ? ` (${form.recettes.length})` : ''}`} propre={form.recettes !== null}
            onChange={(p) => setForm(f => ({ ...f, recettes: p ? (f.recettes ?? []) : null }))}
            aide="Ces recettes remplacent celles du produit pour cette variante."
            herite={(ficheProduit?.recettes?.length ?? 0) > 0 ? <span>{ficheProduit!.recettes.map(r => r.titre).join(' · ')}</span> : <span className="italic">Aucune recette sur le produit.</span>}>
            <div className="space-y-3">
              {(form.recettes ?? []).map((r, i, liste) => (
                <div key={i} className="rounded-2xl border border-[#E3D6C4] bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-[#FF4500] shrink-0" />
                    <input className={`${champ} font-bold`} placeholder="Titre de la recette (obligatoire)" value={r.titre} onChange={e => majRecette(i, { titre: e.target.value })} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, recettes: deplacer(liste, i, -1) }))} disabled={i === 0} aria-label="Monter" className="w-8 h-8 shrink-0 rounded-lg bg-[#F5EAE0] flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => setForm(f => ({ ...f, recettes: deplacer(liste, i, 1) }))} disabled={i === liste.length - 1} aria-label="Descendre" className="w-8 h-8 shrink-0 rounded-lg bg-[#F5EAE0] flex items-center justify-center disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { if (confirm('Supprimer cette recette ?')) setForm(f => ({ ...f, recettes: liste.filter((_, j) => j !== i) })); }} aria-label="Supprimer la recette" className="w-8 h-8 shrink-0 rounded-lg bg-[#FFF1EA] text-[#B83200] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={champ} placeholder="Temps (ex. : 20 min)" value={r.temps} onChange={e => majRecette(i, { temps: e.target.value })} />
                    <input className={champ} placeholder="Personnes (ex. : 4)" value={r.personnes} onChange={e => majRecette(i, { personnes: e.target.value })} />
                  </div>
                  <textarea className={`${champ} min-h-[90px]`} placeholder={'Ingrédients, un par ligne'} value={r.ingredients} onChange={e => majRecette(i, { ingredients: e.target.value })} />
                  <textarea className={`${champ} min-h-[110px]`} placeholder={'Étapes, une par ligne'} value={r.etapes} onChange={e => majRecette(i, { etapes: e.target.value })} />
                  <div className="flex items-center gap-3">
                    {r.photo ? (
                      <><img src={r.photo} alt="" className="w-24 aspect-[3/2] object-cover rounded-lg" /><button type="button" onClick={() => majRecette(i, { photo: '' })} className="text-xs font-bold text-[#B83200]">Retirer la photo</button></>
                    ) : (
                      <label className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#C9BBAA] text-xs font-bold text-[#6F5A4B] cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5" /> Photo de la recette (facultatif)
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => choisirPhoto(e, i)} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setForm(f => ({ ...f, recettes: [...(f.recettes ?? []), recetteVide()] }))} className="w-full py-3 rounded-xl border-2 border-dashed border-[#C9BBAA] text-sm font-bold text-[#6F5A4B] hover:border-[#FF4500] hover:text-[#FF4500] flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter une recette
              </button>
            </div>
          </Bloc>
        </div>

        <div className="bg-white border-t border-[#F0E7DA] px-3 py-3 sm:px-6 sm:py-4 space-y-2">
          {message && (
            <p role="status" className={`flex items-center gap-2 text-sm font-bold ${message.type === 'ok' ? 'text-[#166534]' : 'text-[#B83200]'}`}>
              {message.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}{message.texte}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 min-w-[200px] text-xs text-[#6F5A4B]">Les rubriques « Reprendre le produit » suivent automatiquement les changements de la fiche de « {produit.name.trim()} ».</p>
            {lienApercu && !modifie && enregistree && (
              <a href={lienApercu} target="_blank" rel="noopener" className="inline-flex items-center gap-2 min-h-12 px-4 rounded-2xl border-[1.5px] border-[#3D2B1F] text-sm font-extrabold">Aperçu <ExternalLink className="w-4 h-4" /></a>
            )}
            <button onClick={enregistrer} disabled={enCours || !modifie} className="inline-flex items-center gap-2 min-h-12 px-5 rounded-2xl bg-[#FF4500] text-white text-sm font-extrabold disabled:opacity-40">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
            </button>
          </div>
        </div>
      </div>
      {cadrage && <CadrageImage src={cadrage.src} onAnnuler={fermerCadrage} onValider={envoyerPhoto} />}
    </div>
  );
}
