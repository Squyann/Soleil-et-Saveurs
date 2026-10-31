'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Save, Eye, Globe, EyeOff, ImagePlus, Trash2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Plus, ChefHat, Loader2, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CadrageImage from '@/components/CadrageImage';
import { MOIS, MOIS_COURTS, PHOTOS_MAX, SLUG_VALIDE, creerSlug, completudeFiche, type Fiche, type Recette } from '@/lib/fiches';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const TAILLE_MAX_SOURCE = 20 * 1024 * 1024; // photo choisie, avant cadrage
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024; // limite du bucket
const BUCKET = 'produits-images';

// Recette telle qu'éditée : ingrédients et étapes saisis un par ligne
type RecetteSaisie = { titre: string; temps: string; personnes: string; ingredients: string; etapes: string; photo: string };

type Formulaire = {
  slug: string;
  titre_complet: string;
  accroche: string;
  description: string;
  origine_detail: string;
  caracteristiques: string;
  gout: string;
  conservation: string;
  preparation: string;
  saison_mois: number[];
  photos: string[];
  recettes: RecetteSaisie[];
};

const RUBRIQUES: { cle: keyof Formulaire; titre: string; aide: string }[] = [
  { cle: 'description', titre: 'Description', aide: 'Présentation du produit (obligatoire pour publier la page).' },
  { cle: 'origine_detail', titre: 'Origine', aide: 'Région, producteur, mode de culture…' },
  { cle: 'caracteristiques', titre: 'Caractéristiques et particularités', aide: 'Variété, calibre, couleur, texture…' },
  { cle: 'gout', titre: 'Goût et saveurs', aide: 'Sucré, acidulé, parfumé, croquant…' },
  { cle: 'conservation', titre: 'Conservation', aide: 'Où et combien de temps le conserver.' },
  { cle: 'preparation', titre: 'Conseils de préparation', aide: 'Lavage, découpe, cuisson…' },
];

const recetteVide = (): RecetteSaisie => ({ titre: '', temps: '', personnes: '', ingredients: '', etapes: '', photo: '' });

function versFormulaire(fiche: Fiche | null, nomProduit: string): Formulaire {
  return {
    slug: fiche?.slug ?? creerSlug(nomProduit),
    titre_complet: fiche?.titre_complet ?? '',
    accroche: fiche?.accroche ?? '',
    description: fiche?.description ?? '',
    origine_detail: fiche?.origine_detail ?? '',
    caracteristiques: fiche?.caracteristiques ?? '',
    gout: fiche?.gout ?? '',
    conservation: fiche?.conservation ?? '',
    preparation: fiche?.preparation ?? '',
    saison_mois: [...(fiche?.saison_mois ?? [])].map(Number).sort((a, b) => a - b),
    photos: [...(fiche?.photos ?? [])],
    recettes: (fiche?.recettes ?? []).map(r => ({
      titre: r.titre ?? '', temps: r.temps ?? '', personnes: r.personnes ?? '',
      ingredients: (r.ingredients ?? []).join('\n'), etapes: (r.etapes ?? []).join('\n'), photo: r.photo ?? '',
    })),
  };
}

const lignes = (texte: string) => texte.split('\n').map(l => l.trim()).filter(Boolean);
const texteOuNull = (texte: string) => texte.trim() || null;

// Toutes les photos de la fiche (galerie + recettes)
const photosUtilisees = (f: Formulaire) => [...f.photos, ...f.recettes.map(r => r.photo)].filter(Boolean);

// Chemin dans le bucket d'une photo de fiche (null si ce n'est pas une photo
// déposée par l'éditeur : on ne supprime jamais les images du catalogue).
function cheminFiche(url: string): string | null {
  const chemin = url.split(`/${BUCKET}/`)[1];
  return chemin && chemin.startsWith('fiches/') ? decodeURIComponent(chemin) : null;
}

async function supprimerPhotos(urls: string[]) {
  const chemins = urls.map(cheminFiche).filter((c): c is string => !!c);
  if (chemins.length) await supabase.storage.from(BUCKET).remove(chemins);
}

// Section repliable de l'éditeur (définie hors du composant : sinon elle serait
// recréée à chaque frappe et perdrait le focus et son état ouvert/fermé)
function Section({ titre, rempli, ouvert = false, children }: { titre: string; rempli: boolean; ouvert?: boolean; children: React.ReactNode }) {
  return (
    <details open={ouvert} className="group bg-white rounded-2xl border border-slate-100 shadow-sm">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <span className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700">
          <span className={`w-2 h-2 rounded-full ${rempli ? 'bg-green-500' : 'bg-slate-200'}`} />
          {titre}
        </span>
        <span className="text-slate-300 font-black text-lg transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  );
}

type Props = {
  produit: any;
  fiche: Fiche | null;
  slugsPris: string[]; // adresses des autres fiches
  onFermer: () => void;
  onEnregistre: (fiche: Fiche) => void;
};

export default function EditeurFiche({ produit, fiche, slugsPris, onFermer, onEnregistre }: Props) {
  const [ficheEnregistree, setFicheEnregistree] = useState<Fiche | null>(fiche);
  const [form, setForm] = useState<Formulaire>(() => versFormulaire(fiche, produit.name));
  const reference = useRef(JSON.stringify(versFormulaire(fiche, produit.name)));
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [cadrage, setCadrage] = useState<{ src: string; cible: 'galerie' | number } | null>(null);
  // Photos déposées pendant cette session et pas encore enregistrées dans la fiche
  const deposees = useRef<Set<string>>(new Set());

  const modifie = JSON.stringify(form) !== reference.current;
  const publiee = ficheEnregistree?.publiee ?? false;
  const { remplies, total } = completudeFiche({
    ...form, saison_mois: form.saison_mois, photos: form.photos,
    recettes: form.recettes.filter(r => r.titre.trim()) as unknown as Recette[],
  });

  const erreurSlug = useMemo(() => {
    if (!form.slug) return "L'adresse est obligatoire.";
    if (!SLUG_VALIDE.test(form.slug)) return 'Lettres minuscules, chiffres et tirets uniquement (ex : ananas-victoria).';
    if (slugsPris.includes(form.slug)) return 'Cette adresse est déjà utilisée par une autre fiche.';
    return null;
  }, [form.slug, slugsPris]);

  // Avertissement si l'onglet est fermé avec des modifications non enregistrées
  useEffect(() => {
    if (!modifie) return;
    const avertir = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [modifie]);

  const maj = <K extends keyof Formulaire>(cle: K, valeur: Formulaire[K]) => setForm(f => ({ ...f, [cle]: valeur }));
  const majRecette = (i: number, champs: Partial<RecetteSaisie>) =>
    setForm(f => ({ ...f, recettes: f.recettes.map((r, j) => (j === i ? { ...r, ...champs } : r)) }));
  const deplacer = <T,>(liste: T[], i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= liste.length) return liste;
    const copie = [...liste];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    return copie;
  };

  function fermer() {
    if (modifie && !confirm('Des modifications ne sont pas enregistrées. Fermer quand même ?')) return;
    // Photos déposées mais jamais enregistrées : on ne laisse pas de fichiers orphelins
    const gardees = new Set(ficheEnregistree ? photosUtilisees(versFormulaire(ficheEnregistree, produit.name)) : []);
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
      const nom = `fiches/${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(nom, image, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(nom);
      deposees.current.add(data.publicUrl);
      if (cadrage.cible === 'galerie') {
        setForm(f => ({ ...f, photos: [...f.photos, data.publicUrl].slice(0, PHOTOS_MAX) }));
      } else {
        majRecette(cadrage.cible, { photo: data.publicUrl });
      }
      fermerCadrage();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la photo.");
    }
  }

  async function enregistrer(publier?: boolean) {
    setMessage(null);
    if (erreurSlug) { setMessage({ type: 'erreur', texte: erreurSlug }); return; }
    const publieeCible = publier ?? publiee;
    if (publieeCible && !form.description.trim()) {
      setMessage({ type: 'erreur', texte: 'Ajoutez une description pour pouvoir publier la page.' });
      return;
    }
    setEnCours(true);
    try {
      const donnees = {
        product_id: produit.id,
        slug: form.slug,
        publiee: publieeCible,
        titre_complet: texteOuNull(form.titre_complet),
        accroche: texteOuNull(form.accroche),
        description: texteOuNull(form.description),
        origine_detail: texteOuNull(form.origine_detail),
        caracteristiques: texteOuNull(form.caracteristiques),
        gout: texteOuNull(form.gout),
        conservation: texteOuNull(form.conservation),
        preparation: texteOuNull(form.preparation),
        saison_mois: form.saison_mois,
        photos: form.photos,
        recettes: form.recettes
          .filter(r => r.titre.trim())
          .map(r => ({
            titre: r.titre.trim(), temps: r.temps.trim(), personnes: r.personnes.trim(),
            ingredients: lignes(r.ingredients), etapes: lignes(r.etapes), photo: r.photo,
          })),
      };
      const { data, error } = await supabase
        .from('fiches_produits')
        .upsert(donnees, { onConflict: 'product_id' })
        .select()
        .single();
      if (error) throw error;

      // Photos retirées de la fiche : supprimées du stockage
      const avant = ficheEnregistree ? photosUtilisees(versFormulaire(ficheEnregistree, produit.name)) : [];
      const maintenant = new Set(photosUtilisees(form));
      await supprimerPhotos([...avant, ...deposees.current].filter(u => !maintenant.has(u)));
      deposees.current.clear();

      const nouvelle = data as Fiche;
      const formEnregistre = versFormulaire(nouvelle, produit.name);
      setFicheEnregistree(nouvelle);
      setForm(formEnregistre);
      reference.current = JSON.stringify(formEnregistre);
      onEnregistre(nouvelle);
      setMessage({
        type: 'ok',
        texte: publier === undefined ? 'Fiche enregistrée.' : publier ? 'Page publiée : elle est visible dans le catalogue.' : 'Page dépubliée : son contenu est conservé.',
      });
    } catch (err: any) {
      console.error(err);
      const texte = err?.code === '23505'
        ? 'Cette adresse est déjà utilisée par une autre fiche.'
        : err?.code === '42P01' || err?.code === 'PGRST205'
          ? "La table des fiches n'existe pas encore : lancez la migration 20261101_fiches_produits.sql dans Supabase."
          : `Erreur : ${err?.message ?? 'enregistrement impossible'}`;
      setMessage({ type: 'erreur', texte });
    } finally {
      setEnCours(false);
    }
  }

  const champ = 'w-full bg-slate-50 border border-transparent focus:border-[#FF4500]/40 focus:bg-white rounded-xl p-3 text-sm outline-none transition-colors';
  const libelle = 'text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block';

  return (
    <div className="fixed inset-0 z-[150] flex items-stretch sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative bg-[#F6F1EA] w-full sm:max-w-3xl h-full sm:h-[92vh] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        {/* EN-TÊTE */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-slate-100">
          <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
            {produit.image_url && <img src={produit.image_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Page détaillée</p>
            <p className="font-black uppercase italic text-slate-800 truncate">{produit.name}</p>
          </div>
          <span className={`hidden sm:inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${!ficheEnregistree ? 'bg-slate-100 text-slate-400' : publiee ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {!ficheEnregistree ? 'Nouvelle' : publiee ? 'En ligne' : 'Brouillon'}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full" title="Rubriques remplies">{remplies}/{total}</span>
          <button onClick={fermer} aria-label="Fermer" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 shrink-0"><X className="w-4 h-4" /></button>
        </div>

        {/* CONTENU */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5 space-y-3">
          <Section titre="Général" rempli={!!form.slug} ouvert>
            <div className="space-y-3">
              <div>
                <label className={libelle}>Titre complet (facultatif — sinon le nom du produit)</label>
                <input className={champ} value={form.titre_complet} placeholder={produit.name} onChange={e => maj('titre_complet', e.target.value)} />
              </div>
              <div>
                <label className={libelle}>Phrase d’accroche</label>
                <input className={champ} value={form.accroche} placeholder="Ex : Juteux et parfumé, cueilli à maturité." onChange={e => maj('accroche', e.target.value)} maxLength={200} />
              </div>
              <div>
                <label className={libelle}>Adresse de la page</label>
                <div className={`flex items-center rounded-xl bg-slate-50 border ${erreurSlug ? 'border-red-300' : 'border-transparent'} overflow-hidden`}>
                  <span className="pl-3 text-xs text-slate-400 font-bold whitespace-nowrap">soleiletsaveurs.fr/produits/</span>
                  <input
                    className="flex-1 min-w-0 bg-transparent p-3 pl-0.5 text-sm font-bold outline-none"
                    value={form.slug}
                    onChange={e => maj('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    onBlur={e => maj('slug', creerSlug(e.target.value))}
                  />
                </div>
                {erreurSlug
                  ? <p className="text-[10px] font-bold text-red-500 mt-1">{erreurSlug}</p>
                  : ficheEnregistree && form.slug !== ficheEnregistree.slug && <p className="text-[10px] font-bold text-amber-600 mt-1">Attention : les liens déjà partagés vers l’ancienne adresse ne fonctionneront plus.</p>}
              </div>
            </div>
          </Section>

          <Section titre={`Photos (${form.photos.length + (produit.image_url ? 1 : 0)})`} rempli={form.photos.length > 0}>
            <p className="text-[10px] text-slate-400 font-bold mb-3">La photo du catalogue est toujours affichée en premier (elle se change avec « Modifier » sur la carte du produit). Ajoutez jusqu’à {PHOTOS_MAX} photos supplémentaires.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {produit.image_url && (
                <div className="relative aspect-[3/2] rounded-xl overflow-hidden ring-2 ring-[#FF4500]/40">
                  <img src={produit.image_url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1.5 left-1.5 bg-white/90 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Catalogue</span>
                </div>
              )}
              {form.photos.map((url, i) => (
                <div key={url} className="relative aspect-[3/2] rounded-xl overflow-hidden bg-slate-100 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-1.5 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => maj('photos', deplacer(form.photos, i, -1))} disabled={i === 0} aria-label="Déplacer à gauche" className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center disabled:opacity-30"><ArrowLeft className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => maj('photos', deplacer(form.photos, i, 1))} disabled={i === form.photos.length - 1} aria-label="Déplacer à droite" className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center disabled:opacity-30"><ArrowRight className="w-3.5 h-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => maj('photos', form.photos.filter((_, j) => j !== i))} aria-label="Retirer la photo" className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {form.photos.length < PHOTOS_MAX && (
                <label className="relative aspect-[3/2] rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-1 text-slate-300 hover:border-[#FF4500]/40 hover:text-[#FF4500] cursor-pointer transition-colors">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Ajouter</span>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => choisirPhoto(e, 'galerie')} />
                </label>
              )}
            </div>
          </Section>

          {RUBRIQUES.map(({ cle, titre, aide }) => (
            <Section key={cle} titre={titre} rempli={!!(form[cle] as string).trim()} ouvert={cle === 'description'}>
              <p className="text-[10px] text-slate-400 font-bold mb-2">{aide} Les retours à la ligne sont conservés.</p>
              <textarea className={`${champ} min-h-[110px] leading-relaxed`} rows={cle === 'description' ? 6 : 4} value={form[cle] as string} onChange={e => maj(cle, e.target.value as any)} />
            </Section>
          ))}

          <Section titre="Saisonnalité" rempli={form.saison_mois.length > 0}>
            <p className="text-[10px] text-slate-400 font-bold mb-3">Cochez les mois de saison. Pendant ces mois, la page affiche « De saison en ce moment ».</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {MOIS.map((nom, i) => {
                const m = i + 1;
                const actif = form.saison_mois.includes(m);
                return (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => maj('saison_mois', actif ? form.saison_mois.filter(x => x !== m) : [...form.saison_mois, m].sort((a, b) => a - b))}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${actif ? 'bg-green-600 text-white shadow' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    {MOIS_COURTS[i]}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => maj('saison_mois', MOIS.map((_, i) => i + 1))} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700">Toute l’année</button>
              <span className="text-slate-200">·</span>
              <button type="button" onClick={() => maj('saison_mois', [])} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700">Effacer</button>
            </div>
          </Section>

          <Section titre={`Recettes (${form.recettes.length})`} rempli={form.recettes.some(r => r.titre.trim())}>
            <div className="space-y-3">
              {form.recettes.map((r, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-[#FF4500] shrink-0" />
                    <input className={`${champ} font-bold bg-white`} placeholder="Titre de la recette (obligatoire)" value={r.titre} onChange={e => majRecette(i, { titre: e.target.value })} />
                    <button type="button" onClick={() => maj('recettes', deplacer(form.recettes, i, -1))} disabled={i === 0} aria-label="Monter" className="w-8 h-8 shrink-0 rounded-lg bg-white flex items-center justify-center text-slate-400 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => maj('recettes', deplacer(form.recettes, i, 1))} disabled={i === form.recettes.length - 1} aria-label="Descendre" className="w-8 h-8 shrink-0 rounded-lg bg-white flex items-center justify-center text-slate-400 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { if (confirm('Supprimer cette recette ?')) maj('recettes', form.recettes.filter((_, j) => j !== i)); }} aria-label="Supprimer la recette" className="w-8 h-8 shrink-0 rounded-lg bg-red-50 text-red-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={`${champ} bg-white`} placeholder="Temps (ex : 20 min)" value={r.temps} onChange={e => majRecette(i, { temps: e.target.value })} />
                    <input className={`${champ} bg-white`} placeholder="Personnes (ex : 4)" value={r.personnes} onChange={e => majRecette(i, { personnes: e.target.value })} />
                  </div>
                  <textarea className={`${champ} bg-white min-h-[90px]`} placeholder={'Ingrédients, un par ligne\nEx : 2 mangues\n1 citron vert'} value={r.ingredients} onChange={e => majRecette(i, { ingredients: e.target.value })} />
                  <textarea className={`${champ} bg-white min-h-[110px]`} placeholder={'Étapes, une par ligne\nEx : Éplucher les mangues.\nCouper en dés.'} value={r.etapes} onChange={e => majRecette(i, { etapes: e.target.value })} />
                  <div className="flex items-center gap-3">
                    {r.photo ? (
                      <>
                        <img src={r.photo} alt="" className="w-24 aspect-[3/2] object-cover rounded-lg" />
                        <button type="button" onClick={() => majRecette(i, { photo: '' })} className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600">Retirer la photo</button>
                      </>
                    ) : (
                      <label className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-dashed border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF4500] cursor-pointer">
                        <ImagePlus className="w-3.5 h-3.5" /> Photo de la recette (facultatif)
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => choisirPhoto(e, i)} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => maj('recettes', [...form.recettes, recetteVide()])} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-[#FF4500]/40 hover:text-[#FF4500] flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter une recette
              </button>
            </div>
          </Section>
        </div>

        {/* PIED : actions */}
        <div className="bg-white border-t border-slate-100 px-3 py-3 sm:px-6 sm:py-4 space-y-2">
          {message && (
            <p className={`flex items-center gap-2 text-[11px] font-bold ${message.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
              {message.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}{message.texte}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => enregistrer()} disabled={enCours || !modifie} className="flex-1 min-w-[140px] bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-40">
              {enCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
            </button>
            {ficheEnregistree && !modifie ? (
              <a href={`/produits/${ficheEnregistree.slug}`} target="_blank" rel="noopener" className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200">
                <Eye className="w-4 h-4" /> Aperçu <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="px-4 py-3 rounded-xl bg-slate-50 text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2" title="Enregistrez pour voir l'aperçu">
                <Eye className="w-4 h-4" /> Aperçu
              </span>
            )}
            <button
              onClick={() => enregistrer(!publiee)}
              disabled={enCours}
              className={`flex-1 min-w-[140px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 ${publiee ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-[#FF4500] text-white hover:bg-[#e63e00] shadow-lg'}`}
            >
              {publiee ? <><EyeOff className="w-4 h-4" /> Dépublier</> : <><Globe className="w-4 h-4" /> {modifie ? 'Enregistrer et publier' : 'Publier'}</>}
            </button>
          </div>
        </div>
      </div>

      {cadrage && <CadrageImage src={cadrage.src} onAnnuler={fermerCadrage} onValider={envoyerPhoto} />}
    </div>
  );
}
