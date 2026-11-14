'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PointsRelais from '@/components/PointsRelais';
import { RELAIS, estDansLesYvelines, estVilleRelais, distanceAuRelais, fraisLivraison, listeVillesRelais } from '@/lib/livraison';
import { supabase } from '@/lib/supabase';
import { estEnPromo, etiquettesPromo } from '@/lib/promos';
import { ajouterUnPas, stockDisponible } from '@/lib/panier';
import { variantesActives, prixVariante, imageVariante, nomVariante, produitPourVariante, variantesCumulables, type Variante } from '@/lib/variantes';
import { formatPrix, libelleUnite } from '@/lib/format';
import { preparerCatalogue } from '@/lib/catalogue';
import {
  ArrowRight, Volume2, VolumeX, MapPin, Truck, Check, Plus, Gift, Banknote,
  CheckCircle2, Clock, ShieldCheck, Loader2, AlertCircle,
} from 'lucide-react';

// Points relais, zone et frais : src/lib/livraison.ts (mêmes règles que le serveur)

const ANNONCES = [
  'Livraison offerte dès 40 € de produits',
  `Offerte à ${listeVillesRelais()}`,
  '-10 % sur votre 1re commande avec le code SOLEIL78',
  'Livraison dès le lendemain, entre 15h et 20h',
];

const PROMESSES = [
  { numero: '01', etiquette: 'Le choix', titre: 'Choisis à maturité', texte: 'Nous sélectionnons des fruits et légumes à point, en privilégiant les producteurs français de saison.', Icone: Clock },
  { numero: '02', etiquette: 'La sélection', titre: 'Tri sélectif', texte: 'Nous vérifions chaque pièce manuellement. Seul le meilleur arrive dans votre cagette.', Icone: ShieldCheck },
  { numero: '03', etiquette: 'La livraison', titre: 'Livré à partir de 15h', texte: 'Directement à votre porte, sans perdre aucune fraîcheur !', Icone: Truck },
];

const CHIFFRES = [
  { valeur: '100 %', libelle: 'Fraîcheur', detail: '' },
  { valeur: 'Optim.', libelle: 'Maturité', detail: 'Choisis à point' },
  { valeur: 'Claire', libelle: 'Origine', detail: 'Sur chaque fiche' },
];

const SURTITRE = 'text-[11px] md:text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]';
const TITRE_SECTION = 'titre text-[34px] md:text-5xl lg:text-[54px] leading-none';

// Prix affiché d'un produit en promotion (remise % déduite)
function prixPromo(produit: any, variante: Variante | null) {
  const pv = produitPourVariante(produit, variante);
  const base = prixVariante(produit, variante);
  const pct = Number(pv.promotion) || 0;
  return { pv, base, prix: pct > 0 ? base * (1 - pct / 100) : base, etiquette: etiquettesPromo(pv)[0] };
}

// Carte d'une promo du moment : ajout direct au panier (un pas de vente)
function CartePromo({ produit, variantes, slug }: { produit: any; variantes: Variante[]; slug?: string }) {
  const variante = variantes[0] ?? null;
  const { pv, base, prix, etiquette } = prixPromo(produit, variante);
  const image = imageVariante(produit, variante);
  const nom = nomVariante(produit, variante);
  const unite = pv.unite === 'g' ? 'kg' : pv.unite || 'pièce';
  const [etat, setEtat] = useState<'repos' | 'ajoute' | 'complet'>('repos');

  const ajouter = () => {
    const resultat = ajouterUnPas(produit, variante);
    setEtat(resultat.ok ? 'ajoute' : 'complet');
    setTimeout(() => setEtat('repos'), 1400);
  };

  return (
    <article className="group relative shrink-0 snap-start w-[236px] sm:w-auto flex flex-col bg-white rounded-3xl border border-[#E8DCCB] p-2.5 sm:p-3 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_26px_50px_-18px_rgba(61,43,31,0.28)]">
      <Link
        href={slug ? `/produits/${slug}` : '/commander'}
        onClick={() => { if (!slug) preparerCatalogue('promos'); }}
        className="relative block aspect-[3/2] rounded-2xl overflow-hidden bg-white"
      >
        {image && (
          <img src={image} alt={nom} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        )}
        {etiquette && (
          <span className="absolute left-2 top-2 px-2.5 py-1 rounded-full bg-[#D43A00] text-white text-[13px] font-extrabold">{etiquette.court}</span>
        )}
      </Link>
      <div className="flex-1 flex flex-col gap-3 px-1.5 pt-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold leading-tight truncate">{nom}</h3>
            <p className="mt-0.5 text-[13px] font-semibold text-[#6F5A4B]">
              <span className="sm:hidden">{produit.provenance ? `${produit.provenance} · ` : ''}{libelleUnite(pv.unite)}</span>
              <span className="hidden sm:inline">
                Vendu {libelleUnite(pv.unite)}
                {variantes.length > 1 ? ` · ${variantes.length} ${variantesCumulables(produit) ? 'variétés' : 'versions'}` : ''}
              </span>
            </p>
          </div>
          {produit.provenance && (
            <span className="hidden sm:inline-block shrink-0 px-2 py-1 rounded-lg bg-[#FFF1EA] text-[#C73600] text-[11px] font-extrabold uppercase tracking-wide">{produit.provenance}</span>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <p className="flex flex-col">
            {prix < base - 0.005 && <s className="text-[13px] font-semibold text-[#6F5A4B]">{formatPrix(base)}</s>}
            <span className="text-2xl font-black tracking-tight text-[#FF4500]">
              {formatPrix(prix)}<span className="text-[13px] font-bold tracking-normal text-[#6F5A4B]"> /{unite}</span>
            </span>
          </p>
          <button
            type="button"
            onClick={ajouter}
            aria-label={`Ajouter ${nom} au panier`}
            className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-[#F5EAE0] transition-[background-color,transform] duration-200 active:scale-95 ${
              etat === 'ajoute' ? 'bg-[#166534]' : etat === 'complet' ? 'bg-[#6F5A4B]' : 'bg-[#3D2B1F] hover:bg-[#FF4500]'}`}
          >
            {etat === 'ajoute' ? <Check key="ok" className="ss-pop w-5 h-5" strokeWidth={3} aria-hidden /> : <Plus className="w-5 h-5" strokeWidth={2.6} aria-hidden />}
          </button>
        </div>
        <p aria-live="polite" className="sr-only">{etat === 'ajoute' ? `${nom} ajouté au panier` : etat === 'complet' ? 'Stock maximum atteint' : ''}</p>
      </div>
    </article>
  );
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  // Vidéo d'accueil : démarre sans le son (les navigateurs bloquent la lecture
  // automatique avec le son), le bouton permet de l'activer ou le couper.
  const videoAccueil = useRef<HTMLVideoElement>(null);
  const [sonActif, setSonActif] = useState(false);
  const basculerSon = () => {
    const v = videoAccueil.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.paused) v.play().catch(() => {});
    setSonActif(!v.muted);
  };

  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [distanceValide, setDistanceValide] = useState<boolean | null>(null);
  const [adresseIntrouvable, setAdresseIntrouvable] = useState(false);
  // Frais de livraison pour l'adresse testée (sous 40 € de produits)
  const [infoLivraison, setInfoLivraison] = useState<{ villeRelais: boolean; frais: number } | null>(null);

  // Produits affichés sur l'accueil : promos du moment et rayons
  const [produits, setProduits] = useState<any[] | null>(null);
  const [variantesParProduit, setVariantesParProduit] = useState<Record<string, Variante[]>>({});
  const [slugs, setSlugs] = useState<Record<string, string>>({});

  const router = useRouter();

  useEffect(() => {
    // onAuthStateChange se déclenche immédiatement avec la session courante
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
        if (error || !data || annule) { if (!annule) setProduits([]); return; }
        const actifs = data.filter((p: any) => p.actif !== false);
        setProduits(actifs);
        const ids = choisirPromos(actifs).map((p: any) => String(p.id));
        if (ids.length === 0) return;
        const [{ data: variantes }, { data: fiches }] = await Promise.all([
          supabase.from('product_variants').select('*').in('product_id', ids).order('ordre', { ascending: true }),
          // En cas d'erreur (table absente…), aucun lien vers les pages produits
          supabase.from('fiches_produits').select('product_id, slug').eq('publiee', true).in('product_id', ids),
        ]);
        if (annule) return;
        const groupes: Record<string, Variante[]> = {};
        (variantes ?? []).forEach((v: any) => { (groupes[v.product_id] ??= []).push(v); });
        setVariantesParProduit(groupes);
        const parProduit: Record<string, string> = {};
        (fiches ?? []).forEach((f: any) => { parProduit[String(f.product_id)] = f.slug; });
        setSlugs(parProduit);
      } catch (err) {
        console.error(err);
        if (!annule) setProduits([]);
      }
    })();
    return () => { annule = true; };
  }, []);

  const handleAddressChange = async (val: string) => {
    setAddress(val);
    setDistanceValide(null);
    setAdresseIntrouvable(false);
    if (val && val.length > 5) {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) {
        console.error(err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const selectionnerAdresse = (feat: any) => {
    const [lonSaisie, latSaisie] = feat.geometry.coordinates;
    setAddress(feat.properties.label);
    setSuggestions([]);
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);

      if (estDansLesYvelines(feat.properties)) {
        const villeRelais = estVilleRelais(feat.properties);
        setInfoLivraison({ villeRelais, frais: fraisLivraison({ sousTotal: 1, distance: distanceAuRelais(latSaisie, lonSaisie), villeRelais }) });
        setDistanceValide(true);
        setShowResult(true);
      } else {
        setDistanceValide(false);
      }
    }, 800);
  };

  // Bouton « Vérifier » (ou touche Entrée) : première adresse proposée
  const verifierAdresse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    if (suggestions.length > 0) { selectionnerAdresse(suggestions[0]); return; }
    const saisie = address.trim();
    if (saisie.length < 4) { setAdresseIntrouvable(true); return; }
    setIsVerifying(true);
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(saisie)}&limit=1`);
      const data = await res.json();
      const premiere = (data.features || [])[0];
      if (premiere) { selectionnerAdresse(premiere); return; }
    } catch (err) {
      console.error(err);
    }
    setIsVerifying(false);
    setAdresseIntrouvable(true);
  };

  const promos = produits ? choisirPromos(produits) : [];
  const nombreParRayon = (rayon: string) => (produits ?? []).filter(p => p.category?.toLowerCase() === rayon.toLowerCase()).length;
  const remiseMax = (produits ?? []).reduce((m, p) => Math.max(m, Number(p.promotion) || 0), 0);
  const photoRayon = (rayon: string, prefere: RegExp) => {
    const avecPhoto = (produits ?? []).filter(p => p.image_url);
    return (avecPhoto.find(p => prefere.test(p.name || '')) ?? avecPhoto.find(p => p.category?.toLowerCase() === rayon.toLowerCase()))?.image_url ?? null;
  };
  const rayons = [
    { nom: 'Fruits', photo: photoRayon('Fruits', /cl[ée]mentine/i) },
    { nom: 'Légumes', photo: photoRayon('Légumes', /tomate/i) },
  ];

  return (
    <div className="bg-[#EDE3D5] text-[#3D2B1F] selection:bg-[#FF4500]/15 overflow-x-clip">

      {/* Pop-up de succès d'éligibilité */}
      {showResult && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowResult(false); }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#3D2B1F]/60 backdrop-blur-sm animate-in fade-in duration-300"
        >
          <div role="dialog" aria-modal="true" aria-labelledby="titre-eligible" className="ss-pop bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center border border-[#E8DCCB]">
            <div className="w-16 h-16 bg-[#ECF7EF] text-[#15803D] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" aria-hidden />
            </div>
            <h3 id="titre-eligible" className="titre text-3xl mb-2">Vous êtes éligible !</h3>
            {infoLivraison && (
              <p className="text-[15px] font-semibold text-[#5C4030] mb-6 leading-snug">
                {infoLivraison.villeRelais
                  ? <><span className="text-[#15803D] font-extrabold">Livraison offerte</span> chez vous, quel que soit le montant.</>
                  : <>Livraison {infoLivraison.frais.toFixed(0)} €, <span className="text-[#15803D] font-extrabold">offerte dès 40 €</span> de produits.</>}
              </p>
            )}
            <div className="space-y-2">
              <button
                onClick={() => router.push('/commander')}
                className="w-full min-h-14 bg-[#FF4500] text-white rounded-2xl text-lg font-extrabold hover:bg-[#E63E00] active:scale-[0.98] transition-all shadow-[0_16px_30px_-14px_rgba(255,69,0,0.55)]"
              >
                Voir la récolte du jour
              </button>
              <button onClick={() => setShowResult(false)} className="w-full min-h-11 text-[#5C4030] text-sm font-bold hover:text-[#3D2B1F] transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau d'informations */}
      <div className="bg-[#3D2B1F] text-[#F5EAE0] overflow-hidden whitespace-nowrap text-[11px] md:text-xs font-bold uppercase tracking-[0.08em]">
        <div className="ss-defile inline-flex gap-9 md:gap-14 py-2.5 pl-9 md:pl-14">
          {[...ANNONCES, ...ANNONCES].map((texte, i) => (
            <React.Fragment key={i}>
              <span aria-hidden={i >= ANNONCES.length}>{texte}</span>
              <span aria-hidden className="text-[#FF9466]">✦</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Héro */}
      <section className="relative bg-[#F5EAE0]">
        <div className="max-w-[1240px] mx-auto px-5 pt-7 pb-12 md:pt-16 md:pb-32 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">

          <div className="contents lg:flex lg:flex-col lg:flex-[1.25] lg:min-w-0 lg:gap-7 lg:relative lg:z-[5]">
            <div className="order-1 ss-monte self-start inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white border border-[#E8DCCB] text-[11px] md:text-xs font-extrabold uppercase tracking-[0.1em] text-[#C73600]">
              <span className="ss-pouls w-2 h-2 rounded-full bg-[#FF4500]" />
              Fruits &amp; légumes frais · Yvelines (78)
            </div>
            <h1 className="order-2 titre ss-monte text-[46px] leading-none sm:text-6xl lg:text-[54px] xl:text-[68px] xl:leading-[0.98] [animation-delay:80ms]">
              Le goût du soleil,<br />
              <em className="text-[#FF4500]">livré chez vous.</em>
            </h1>

            <div className="order-4 relative z-[5] ss-monte flex flex-col gap-3 md:gap-3.5 w-full lg:max-w-[480px] [animation-delay:180ms]">
              <Link
                href="/commander"
                className="group flex items-center justify-between gap-4 min-h-[60px] px-5 sm:px-6 rounded-[18px] bg-[#FF4500] text-white text-[17px] sm:text-[19px] font-extrabold shadow-[0_18px_34px_-14px_rgba(255,69,0,0.55)] transition-[background-color,transform] duration-200 hover:bg-[#E63E00] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                Accéder directement au catalogue
                <ArrowRight className="w-[22px] h-[22px] transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.4} aria-hidden />
              </Link>

              <div className="relative">
                <form onSubmit={verifierAdresse} className="flex items-center gap-2.5 p-1.5 pl-4 rounded-[18px] bg-white border border-[#E0D3C0] shadow-[0_14px_30px_-20px_rgba(61,43,31,0.35)] focus-within:border-[#FF4500] transition-colors">
                  <MapPin className="w-[18px] h-[18px] shrink-0 text-[#C73600]" aria-hidden />
                  <label htmlFor="adresse-accueil" className="sr-only">Votre adresse</label>
                  <input
                    id="adresse-accueil"
                    type="text"
                    autoComplete="off"
                    placeholder="Saisissez votre adresse…"
                    className="flex-1 min-w-0 h-11 bg-transparent text-base font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium focus:outline-none"
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="shrink-0 h-11 min-w-[92px] px-4 rounded-[13px] bg-[#3D2B1F] text-[#F5EAE0] text-sm font-bold flex items-center justify-center hover:bg-[#FF4500] transition-colors disabled:opacity-80"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Vérification en cours" /> : 'Vérifier'}
                  </button>
                </form>

                {suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-[#E0D3C0] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectionnerAdresse(s)}
                        className="w-full min-h-12 px-4 py-3 text-left text-sm font-semibold border-b border-[#F0E7DA] last:border-b-0 hover:bg-[#F5EAE0] transition-colors flex items-center gap-3"
                      >
                        <MapPin className="w-4 h-4 shrink-0 text-[#FF4500]" aria-hidden />
                        {s.properties.label}
                      </button>
                    ))}
                  </div>
                )}

                {(distanceValide === false || adresseIntrouvable) && (
                  <div role="alert" className="mt-2 p-3 bg-red-50 rounded-xl text-red-700 flex items-center gap-2 animate-in fade-in zoom-in-95">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                    <p className="text-[13px] font-bold">
                      {distanceValide === false
                        ? 'Désolé, nous livrons uniquement dans les Yvelines (78).'
                        : 'Adresse introuvable. Saisissez une adresse complète.'}
                    </p>
                  </div>
                )}
              </div>
              <p className="pl-1 text-[13px] font-semibold text-[#6F5A4B]">Livraison dans tout le département des Yvelines (78)</p>
            </div>

            <ul className="order-5 hidden lg:flex ss-monte flex-wrap gap-x-6 gap-y-2.5 mt-1 text-sm font-semibold text-[#5C4030] [animation-delay:280ms]">
              <li className="flex items-center gap-2"><Clock className="w-[18px] h-[18px] text-[#C73600]" aria-hidden />Dès le lendemain, 15h – 20h</li>
              <li className="flex items-center gap-2"><Gift className="w-[18px] h-[18px] text-[#C73600]" aria-hidden />Offerte dès 40 €</li>
              <li className="flex items-center gap-2"><Banknote className="w-[18px] h-[18px] text-[#C73600]" aria-hidden />Paiement à la livraison</li>
            </ul>
          </div>

          {/* Vidéo, dans une arche entourée d'un soleil */}
          <div className="order-3 lg:order-none lg:flex-1 lg:min-w-0 relative overflow-hidden -mx-5 px-7 -my-6 py-6 md:-my-16 md:py-16 lg:-mx-20 lg:px-[120px] flex justify-center">
            <div className="relative w-full max-w-[340px] md:max-w-[470px]">
              <svg className="ss-rayons absolute left-1/2 top-[46%] w-[148%] -ml-[74%] -mt-[74%] pointer-events-none" viewBox="0 0 600 600" aria-hidden>
                <circle cx="300" cy="300" r="262" fill="none" stroke="#FF4500" strokeOpacity="0.2" strokeWidth="64" strokeDasharray="5 63.6" />
                <circle cx="300" cy="300" r="205" fill="none" stroke="#F97316" strokeOpacity="0.14" strokeWidth="2" />
              </svg>

              <div className="ss-monte isolate relative aspect-[1/1.08] md:aspect-[4/5] rounded-t-[170px] rounded-b-[28px] md:rounded-t-[240px] md:rounded-b-[36px] overflow-hidden border-[6px] md:border-8 border-white bg-[#DDD0BF] shadow-[0_40px_70px_-30px_rgba(61,43,31,0.5)] [animation-delay:120ms]">
                {/* Trois encodages de la même vidéo : chaque navigateur lit le premier
                    qu'il sait décoder (AV1 le plus léger, HEVC pour Safari/iPhone, H.264 en secours) */}
                <video
                  ref={videoAccueil}
                  autoPlay muted loop playsInline
                  poster="/video/accueil-poster.jpg"
                  className="absolute inset-0 w-full h-full object-cover"
                  suppressHydrationWarning
                >
                  <source src="/video/accueil-av1.mp4" type='video/mp4; codecs="av01.0.08M.08, mp4a.40.2"' />
                  <source src="/video/accueil-hevc.mp4" type='video/mp4; codecs="hvc1.1.6.L120.90, mp4a.40.2"' />
                  <source src="/video/accueil-h264.mp4" type="video/mp4" />
                </video>
                <div className="absolute left-3 right-3 bottom-3 md:left-[18px] md:right-[18px] md:bottom-[18px] flex items-center justify-between pl-4 pr-2 py-1.5 rounded-2xl bg-[#3D2B1F]/60 backdrop-blur-md text-white">
                  <span className="flex items-center gap-2 text-[11px] md:text-xs font-extrabold uppercase tracking-[0.12em]">
                    <span className="ss-pouls w-2 h-2 rounded-full bg-[#FF4500]" />
                    En direct du champ
                  </span>
                  <button
                    type="button"
                    onClick={basculerSon}
                    aria-label={sonActif ? 'Couper le son' : 'Activer le son'}
                    aria-pressed={sonActif}
                    className="flex items-center gap-2 h-11 px-2 text-[11px] font-extrabold uppercase tracking-[0.1em] rounded-xl hover:bg-white/10 transition-colors"
                  >
                    {sonActif ? <Volume2 className="w-[18px] h-[18px]" aria-hidden /> : <VolumeX className="w-[18px] h-[18px]" aria-hidden />}
                    {sonActif ? 'Son' : 'Son coupé'}
                  </button>
                </div>
              </div>

              {/* Deux promos du moment flottent autour de la vidéo (une seule sur mobile) */}
              {promos.slice(0, 2).map((p, i) => {
                const { base, prix, etiquette } = prixPromo(p, variantesActives(variantesParProduit[String(p.id)])[0] ?? null);
                return (
                  <Link
                    key={p.id}
                    href="/commander"
                    onClick={() => preparerCatalogue('promos')}
                    style={{ ['--r' as any]: i === 0 ? '-5deg' : '4deg', animationDelay: i === 0 ? undefined : '-3.5s' }}
                    className={`ss-flotte absolute items-center gap-2.5 md:gap-3 p-1.5 pr-3 md:p-2.5 md:pr-4 rounded-full bg-white shadow-[0_20px_40px_-18px_rgba(61,43,31,0.45)] text-[#3D2B1F] ${
                      i === 0 ? 'flex -left-4 top-[16%] md:-left-9 md:top-[34%]' : 'hidden md:flex -right-8 bottom-[21%]'}`}
                  >
                    <span className="w-11 h-11 md:w-[58px] md:h-[58px] shrink-0 rounded-full overflow-hidden bg-white border border-[#EFE6D8]">
                      {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                    </span>
                    <span className="flex flex-col gap-0.5 text-xs md:text-[13px]">
                      <span className="font-extrabold whitespace-nowrap">{p.name}</span>
                      <span className="font-semibold text-[#6F5A4B] whitespace-nowrap">
                        <strong className="font-extrabold text-[#C73600]">{formatPrix(prix)}</strong>
                        {prix < base - 0.005 && <> <s>{formatPrix(base)}</s></>}
                      </span>
                    </span>
                    {etiquette?.cle === 'remise' && (
                      <span className="px-2 py-1 rounded-full bg-[#D43A00] text-white text-xs font-extrabold">{etiquette.court}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Réassurance */}
      <section className="relative z-[3] max-w-[1240px] mx-auto -mt-5 md:-mt-16 px-4 md:px-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#F0E7DA] rounded-3xl md:rounded-[28px] border border-[#E8DCCB] shadow-[0_30px_60px_-34px_rgba(61,43,31,0.4)] overflow-hidden">
          {[
            { Icone: Truck, titre: 'Livraison rapide', texte: 'Dès le lendemain, à la date de votre choix, entre 15h et 20h.', vert: false, href: '/livraison' },
            { Icone: MapPin, titre: 'Zone 78', texte: 'Livraison dans tout le département des Yvelines (78).', vert: false },
            { Icone: Gift, titre: 'Livraison offerte', texte: `Dès 40 € de produits, et dans nos ${RELAIS.length} villes relais quel que soit le montant.`, vert: true },
            { Icone: Banknote, titre: 'Paiement à la livraison', texte: 'En espèces ou par carte, à la réception de votre commande.', vert: false },
          ].map(({ Icone, titre, texte, vert, href }) => {
            const contenu = (
              <>
                <span className={`shrink-0 w-[38px] h-[38px] lg:w-[46px] lg:h-[46px] rounded-xl lg:rounded-[14px] flex items-center justify-center ${vert ? 'bg-[#ECF7EF] text-[#15803D]' : 'bg-[#FFF1EA] text-[#FF4500]'}`}>
                  <Icone className="w-[19px] h-[19px] lg:w-[22px] lg:h-[22px]" aria-hidden />
                </span>
                <span className="block">
                  <span className="block text-sm lg:text-base font-extrabold mb-0.5 lg:mb-1">{titre}</span>
                  <span className="block text-[12.5px] lg:text-sm leading-snug text-[#6F5A4B]">{texte}</span>
                </span>
              </>
            );
            const classes = 'bg-white flex flex-col lg:flex-row gap-2.5 lg:gap-3.5 px-4 py-[18px] lg:px-6 lg:py-[26px]';
            return href
              ? <Link key={titre} href={href} className={`${classes} hover:bg-[#FFFBF7] transition-colors`}>{contenu}</Link>
              : <div key={titre} className={classes}>{contenu}</div>;
          })}
        </div>
      </section>

      {/* Les promos du moment */}
      {(produits === null || promos.length > 0) && (
        <section className="max-w-[1240px] mx-auto pt-14 md:pt-24">
          <div className="px-5 flex items-end justify-between gap-4 mb-5 md:mb-9">
            <div>
              <p className={`${SURTITRE} mb-2 md:mb-2.5`}>La récolte</p>
              <h2 className={TITRE_SECTION}>Les promos <em className="text-[#FF4500] whitespace-nowrap">du moment</em></h2>
            </div>
            <Link
              href="/commander"
              onClick={() => preparerCatalogue('promos')}
              className="group shrink-0 inline-flex items-center gap-2.5 min-h-11 text-[13px] font-extrabold text-[#C73600] md:px-5 md:py-3 md:rounded-full md:border-[1.5px] md:border-[#3D2B1F] md:text-sm md:font-bold md:text-[#3D2B1F] md:hover:bg-[#3D2B1F] md:hover:text-[#F5EAE0] transition-colors"
            >
              <span className="md:hidden">Tout voir</span>
              <span className="hidden md:inline">Voir toute la récolte</span>
              <ArrowRight className="hidden md:block w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <div className="ss-ruban flex gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-px-5 px-5 pt-2 pb-5 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:overflow-visible">
            {produits === null
              ? [0, 1, 2, 3].map(i => (
                <div key={i} aria-hidden className="shrink-0 w-[236px] sm:w-auto rounded-3xl border border-[#E8DCCB] bg-white/60 p-3">
                  <div className="aspect-[3/2] rounded-2xl bg-[#EDE3D5] animate-pulse" />
                  <div className="h-[108px]" />
                </div>
              ))
              : promos.map(p => (
                <CartePromo key={p.id} produit={p} variantes={variantesActives(variantesParProduit[String(p.id)])} slug={slugs[String(p.id)]} />
              ))}
          </div>
        </section>
      )}

      {/* Les rayons */}
      <section className="max-w-[1240px] mx-auto px-5 pt-6 md:pt-14">
        <div className={`grid grid-cols-2 gap-3 md:gap-6 ${remiseMax > 0 ? 'md:grid-cols-3' : ''}`}>
          {rayons.map(r => (
            <Link
              key={r.nom}
              href="/commander"
              onClick={() => preparerCatalogue(r.nom)}
              className="group relative h-[168px] md:h-[260px] rounded-3xl md:rounded-[32px] overflow-hidden bg-white border border-[#E8DCCB] flex flex-col justify-end p-4 md:p-[26px] transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              {r.photo && (
                <img src={r.photo} alt="" loading="lazy" className="absolute -right-[10%] -top-[6%] md:-right-[6%] md:-top-[4%] w-[86%] h-[66%] md:w-[78%] md:h-[78%] object-cover rounded-bl-[70px] md:rounded-bl-[120px] transition-transform duration-700 ease-out group-hover:scale-105" />
              )}
              {produits !== null && (
                <span className={`relative ${SURTITRE}`}>{nombreParRayon(r.nom)} produits</span>
              )}
              <span className="relative titre flex items-center gap-3 text-[28px] md:text-[40px] leading-[1.1]">
                {r.nom}
                <ArrowRight className="hidden md:block w-[26px] h-[26px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
          {remiseMax > 0 && (
            <Link
              href="/commander"
              onClick={() => preparerCatalogue('promos')}
              className="group hidden md:flex relative h-[260px] rounded-[32px] overflow-hidden bg-[#FF4500] text-white flex-col justify-end p-[26px] transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <svg viewBox="0 0 600 600" aria-hidden className="absolute -right-[90px] -top-[110px] w-[360px] h-[360px]">
                <circle cx="300" cy="300" r="92" fill="#fff" fillOpacity="0.16" />
                <circle cx="300" cy="300" r="210" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="90" strokeDasharray="9 46" />
              </svg>
              <span className="relative self-start mb-2.5 px-3 py-1.5 rounded-full bg-white text-[#C73600] text-xs font-extrabold uppercase tracking-[0.1em]">Jusqu&apos;à -{remiseMax} %</span>
              <span className="relative titre flex items-center gap-3 text-[40px] leading-[1.05]">
                Promos
                <ArrowRight className="w-[26px] h-[26px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Notre promesse */}
      <section className="max-w-[1240px] mx-auto px-5 pt-16 md:pt-28">
        <div className="md:text-center mb-7 md:mb-12">
          <p className={`${SURTITRE} mb-2 md:mb-2.5`}>Du choix à votre porte</p>
          <h2 className={TITRE_SECTION}>Notre <em className="text-[#FF4500]">promesse</em></h2>
        </div>

        {/* Mobile : les trois étapes en frise verticale */}
        <ol className="md:hidden flex flex-col">
          {PROMESSES.map((p, i) => (
            <li key={p.numero} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className={`titre shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center text-xl ${i === PROMESSES.length - 1 ? 'bg-[#3D2B1F] text-[#F5EAE0]' : 'bg-[#FF4500] text-white'}`}>{i + 1}</span>
                {i < PROMESSES.length - 1 && <span className="flex-1 w-0.5 bg-[#E0D3C0]" />}
              </div>
              <div className={i < PROMESSES.length - 1 ? 'pb-7' : ''}>
                <p className="mt-0.5 mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C73600]">{p.etiquette}</p>
                <h3 className="titre text-[23px] leading-[1.1] mb-1.5">{p.titre}</h3>
                <p className="text-[15px] leading-normal text-[#5C4030]">{p.texte}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Ordinateur : trois cartes */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {PROMESSES.map(({ numero, etiquette, titre, texte, Icone }, i) => {
            const sombre = i === PROMESSES.length - 1;
            return (
              <div key={numero} className={`relative rounded-[28px] p-[30px] border ${sombre ? 'bg-[#3D2B1F] border-[#3D2B1F] text-[#F5EAE0]' : i === 0 ? 'bg-[#FFF6F0] border-[#F6DFD2]' : 'bg-white border-[#E8DCCB]'}`}>
                <span aria-hidden className={`titre absolute right-6 top-3.5 text-[76px] leading-none ${sombre ? 'text-[#F5EAE0]/[0.12]' : i === 0 ? 'text-[#FF4500]/[0.16]' : 'text-[#3D2B1F]/10'}`}>{numero}</span>
                <span className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center mb-[22px] ${sombre ? 'bg-[#F5EAE0]/10 text-[#FF7A47]' : i === 0 ? 'bg-white text-[#FF4500] shadow-[0_10px_20px_-12px_rgba(61,43,31,0.3)]' : 'bg-[#FFF1EA] text-[#FF4500]'}`}>
                  <Icone className="w-6 h-6" aria-hidden />
                </span>
                <p className={`mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] ${sombre ? 'text-[#FF9466]' : 'text-[#C73600]'}`}>{etiquette}</p>
                <h3 className="titre text-[26px] leading-[1.1] mb-2.5">{titre}</h3>
                <p className={`text-[15px] leading-relaxed ${sombre ? 'text-[#E1D2C2]' : 'text-[#5C4030]'}`}>{texte}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 md:mt-6 grid grid-cols-3 gap-px bg-[#E3D6C4] rounded-[22px] md:rounded-[28px] border border-[#DDD0BF] overflow-hidden">
          {CHIFFRES.map(c => (
            <div key={c.libelle} className="bg-[#F5EAE0] px-3 py-4 md:px-[30px] md:py-7">
              <p className="titre text-[25px] md:text-[44px] leading-none text-[#FF4500]">{c.valeur}</p>
              <p className="mt-2 md:mt-2.5 text-[10.5px] md:text-xs font-extrabold uppercase tracking-[0.1em] md:tracking-[0.14em]">{c.libelle}</p>
              {c.detail && <p className="mt-0.5 text-[11px] md:text-xs font-semibold text-[#6F5A4B]">{c.detail}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Vos avantages */}
      <section className="max-w-[1240px] mx-auto pt-16 md:pt-28">
        <div className="px-5 mb-5 md:mb-9">
          <p className={`${SURTITRE} mb-2 md:mb-2.5`}>Bons plans</p>
          <h2 className={TITRE_SECTION}>Vos <em className="text-[#FF4500]">avantages</em></h2>
        </div>
        <div className="ss-ruban flex gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-px-5 px-5 pb-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {[
            { titre: 'Bienvenue', texte: '-10 % sur votre 1re commande avec le code', code: 'SOLEIL78', fond: 'bg-[#FF4500] text-white' },
            { titre: 'Fidélité', texte: 'Chaque euro de commande vous rapporte 1 point. Dès 100 points, activez une remise de -10 % dans le panier.', fond: 'bg-[#3D2B1F] text-[#F5EAE0]' },
            { titre: 'Parrainage', texte: 'Votre parrain reçoit -10 % sur sa prochaine commande, et vous -10 % sur votre 2e commande.', fond: 'bg-[#15803D] text-white' },
          ].map(a => (
            <div key={a.titre} className="shrink-0 snap-start w-[300px] lg:w-auto flex bg-white rounded-[22px] lg:rounded-3xl border border-[#E8DCCB] overflow-hidden">
              <div className={`shrink-0 w-[88px] lg:w-28 flex items-center justify-center border-r-2 border-dashed border-[#F5EAE0] ${a.fond}`}>
                <span className="titre text-[27px] lg:text-[34px] leading-none">-10 %</span>
              </div>
              <div className="p-4 lg:p-[22px]">
                <h3 className="text-base lg:text-[17px] font-extrabold mb-1 lg:mb-1.5">{a.titre}</h3>
                <p className="text-[13px] lg:text-sm leading-normal text-[#5C4030]">{a.texte}</p>
                {a.code && (
                  <span className="inline-block mt-2.5 lg:mt-3 px-2.5 py-1.5 lg:px-3 rounded-[10px] border-[1.5px] border-dashed border-[#C73600] text-[13px] lg:text-sm font-extrabold tracking-[0.12em] text-[#C73600]">{a.code}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Zone de fraîcheur */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-5 pt-11 md:pt-24">
        <div className="bg-white rounded-[28px] md:rounded-[36px] border border-[#E8DCCB] overflow-hidden grid lg:grid-cols-2">
          <div className="px-[22px] pt-[26px] pb-[22px] md:p-12 lg:p-[60px] flex flex-col justify-center">
            <p className={`${SURTITRE} mb-2 md:mb-2.5`}>Livraison</p>
            <h2 className={`${TITRE_SECTION} mb-3.5 md:mb-5`}>Zone de <em className="text-[#FF4500]">fraîcheur</em></h2>
            <p className="text-[15px] md:text-base leading-relaxed text-[#5C4030] mb-3.5">
              Livraison dans toutes les Yvelines (78), au départ de nos {RELAIS.length} points relais : des trajets courts pour des produits frais.
            </p>
            <p className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ECF7EF] text-[13px] md:text-sm font-extrabold text-[#166534]">
              <Check className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={2.6} aria-hidden />
              Livraison offerte dans ces {RELAIS.length} villes.
            </p>
            <div className="mt-5 md:mt-7">
              <Link href="/livraison" className="group inline-flex items-center gap-2.5 min-h-11 px-5 py-3 rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">
                Voir les détails de livraison
                <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
          <PointsRelais />
        </div>
      </section>

      {/* Appel final */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-5 pt-11 md:pt-24">
        <div className="relative overflow-hidden rounded-[32px] md:rounded-[44px] bg-[#3D2B1F] text-[#F5EAE0] px-[22px] pt-[54px] pb-[30px] md:px-6 md:py-24 text-center">
          <svg className="ss-rayons absolute -right-[140px] -top-[180px] w-[300px] h-[300px] md:-right-[180px] md:-top-[220px] md:w-[620px] md:h-[620px] pointer-events-none" viewBox="0 0 600 600" aria-hidden>
            <circle cx="300" cy="300" r="100" fill="#FF4500" fillOpacity="0.9" />
            <circle cx="300" cy="300" r="226" fill="none" stroke="#FF4500" strokeOpacity="0.75" strokeWidth="110" strokeDasharray="12 47.2" />
          </svg>
          <h2 className="relative titre text-[40px] sm:text-6xl lg:text-[76px] leading-none mb-[26px] md:mb-9">
            Prêt à goûter<br /><em className="text-[#FF7A47]">la différence ?</em>
          </h2>
          <div className="relative flex flex-col md:flex-row md:flex-wrap md:justify-center gap-1.5 md:gap-3.5">
            <Link
              href={user ? '/commander' : '/signup'}
              suppressHydrationWarning
              className="group flex items-center justify-center gap-3 min-h-[60px] md:px-[34px] rounded-[18px] bg-[#FF4500] text-white text-[19px] font-extrabold shadow-[0_20px_40px_-16px_rgba(255,69,0,0.7)] transition-[background-color,transform] duration-200 hover:bg-[#E63E00] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              <span suppressHydrationWarning>{user ? 'Voir la récolte' : 'Créer mon compte'}</span>
              <ArrowRight className="w-[22px] h-[22px] transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.4} aria-hidden />
            </Link>
            {!user && (
              <Link href="/commander" className="flex items-center justify-center min-h-[52px] md:min-h-[60px] md:px-[30px] rounded-[18px] md:border-[1.5px] md:border-[#F5EAE0]/45 text-base md:text-lg font-bold hover:bg-[#F5EAE0]/10 transition-colors">
                Voir la récolte
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Promos mises en avant sur l'accueil : produits en promotion et en stock, les
// plus fortes remises d'abord (4 au plus).
function choisirPromos(produits: any[]): any[] {
  return produits
    .filter(p => estEnPromo(p) && stockDisponible(p) > 0)
    .sort((a, b) => (Number(b.promotion) || 0) - (Number(a.promotion) || 0) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 4);
}
