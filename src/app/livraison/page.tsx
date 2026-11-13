'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import PointsRelais from '@/components/PointsRelais';
import { MapPin, Clock, Package, RefreshCcw, AlertCircle, Gift, Check, ArrowRight, Loader2 } from 'lucide-react';

// --- EXEMPLES DE VILLES DESSERVIES (la livraison couvre tout le 78) ---
const ELIGIBLE_ZONES = [
  // Zone CHATOU / CROISSY
  { cp: "78400", city: "Chatou" },
  { cp: "78290", city: "Croissy-sur-Seine" },
  { cp: "78360", city: "Montesson" },
  { cp: "78420", city: "Carrières-sur-Seine" },
  { cp: "78110", city: "Le Vésinet" },
  { cp: "78230", city: "Le Pecq" },
  
  // Zone SAINT-NOM-LA-BRETECHE
  { cp: "78860", city: "Saint-Nom-la-Bretèche" },
  { cp: "78590", city: "Noisy-le-Roi" },
  { cp: "78620", city: "L'Étang-la-Ville" },
  { cp: "78810", city: "Feucherolles" },
  { cp: "78450", city: "Chavenay" },

  // Zone MAREIL-SUR-MAULDRE
  { cp: "78124", city: "Mareil-sur-Mauldre" },
  { cp: "78580", city: "Maule" },
  { cp: "78124", city: "Montainville" },
  { cp: "78650", city: "Beynes" },
  { cp: "78580", city: "Herbeville" },

  // Zone VILLEPREUX / LES CLAYES
  { cp: "78370", city: "Plaisir" },
  { cp: "78450", city: "Villepreux" },
  { cp: "78340", city: "Les Clayes-sous-Bois" },
  { cp: "78330", city: "Fontenay-le-Fleury" },
  { cp: "78210", city: "Saint-Cyr-l'École" },
  { cp: "78640", city: "Neauphle-le-Château" },
  { cp: "78760", city: "Jouars-Pontchartrain" },
  { cp: "78640", city: "Villiers-Saint-Frédéric" },
].sort((a, b) => a.city.localeCompare(b.city)); // Tri alphabétique pour la clarté

export default function LivraisonPage() {
  const [userCP, setUserCP] = useState('');
  const [status, setStatus] = useState<'idle' | 'eligible' | 'not-eligible'>('idle');
  const [checking, setChecking] = useState(false);

  // Éligibilité : le code postal doit correspondre à une commune des Yvelines (78).
  const checkEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^78\d{3}$/.test(userCP)) { setStatus('not-eligible'); return; }
    setChecking(true);
    setStatus('idle');
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(userCP)}&type=municipality&limit=10`);
      const data = await res.json();
      const eligible = (data.features || []).some((f: any) =>
        String(f.properties?.citycode || f.properties?.postcode || '').startsWith('78')
      );
      setStatus(eligible ? 'eligible' : 'not-eligible');
    } catch {
      setStatus('not-eligible');
    } finally {
      setChecking(false);
    }
  };

  const SURTITRE = 'text-[11px] md:text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]';

  return (
    <div className="min-h-screen bg-[#EDE3D5] text-[#3D2B1F] pb-4">

      {/* EN-TÊTE : vérification du code postal */}
      <header className="bg-[#F5EAE0] border-b border-[#E3D6C4]">
        <div className="max-w-[1240px] mx-auto px-5 pt-6 pb-[26px] md:pt-8 md:pb-12 grid lg:grid-cols-2 gap-x-14 gap-y-5 lg:items-end">
          <div className="min-w-0">
            <nav aria-label="Fil d'Ariane" className="hidden md:flex items-center gap-2 mb-3.5 text-[13px] font-semibold text-[#6F5A4B]">
              <Link href="/" className="hover:text-[#C73600] transition-colors">Accueil</Link>
              <span aria-hidden>›</span>
              <span aria-current="page" className="font-bold text-[#3D2B1F]">Livraison</span>
            </nav>
            <p className={`${SURTITRE} mb-2 md:mb-2.5`}>Soleil et Saveurs — Logistique</p>
            <h1 className="titre text-[44px] md:text-[64px] leading-none mb-3 md:mb-4">Livraison <em className="text-[#FF4500] whitespace-nowrap">dans le 78</em></h1>
            <p className="text-base md:text-[17px] leading-normal text-[#5C4030] max-w-[520px]">
              Nous livrons dans tout le département des Yvelines (78), au départ de nos points relais.
            </p>
          </div>

          <div className="min-w-0">
            <form onSubmit={checkEligibility} className="flex items-center gap-2 md:gap-2.5 p-1.5 pl-4 rounded-[18px] bg-white border border-[#E0D3C0] shadow-[0_14px_30px_-20px_rgba(61,43,31,0.35)] focus-within:border-[#FF4500] transition-colors">
              <MapPin className="w-[18px] h-[18px] shrink-0 text-[#C73600]" aria-hidden />
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                aria-label="Votre code postal"
                placeholder="Code postal (ex: 78400)"
                className="flex-1 min-w-0 h-11 md:h-12 bg-transparent text-base md:text-[17px] font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium outline-none"
                value={userCP}
                onChange={(e) => setUserCP(e.target.value)}
              />
              <button disabled={checking} className="shrink-0 h-11 md:h-12 min-w-[92px] px-4 md:px-5 rounded-[13px] bg-[#3D2B1F] text-[#F5EAE0] text-sm md:text-[15px] font-bold flex items-center justify-center hover:bg-[#FF4500] transition-colors disabled:opacity-80">
                {checking ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Vérification" /> : 'Vérifier'}
              </button>
            </form>

            {/* Résultats du test */}
            <div aria-live="polite">
              {status === 'eligible' && (
                <p className="mt-3 flex gap-2.5 px-3.5 py-3 rounded-[14px] bg-[#ECF7EF] text-sm md:text-[15px] leading-snug font-bold text-[#166534] animate-in fade-in slide-in-from-top-1 duration-200">
                  <Check className="w-[18px] h-[18px] shrink-0 mt-px" strokeWidth={2.6} aria-hidden />
                  Génial ! Vous êtes dans notre zone de livraison. Livraison dès le lendemain, selon les dates proposées.
                </p>
              )}
              {status === 'not-eligible' && (
                <p className="mt-3 flex gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-sm md:text-[15px] leading-snug font-bold text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-[18px] h-[18px] shrink-0 mt-px" aria-hidden />
                  Nous ne livrons pas encore chez vous. Écrivez-nous sur WhatsApp pour être prévenu(e) !
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-3 md:px-5">

        {/* LES TROIS INFOS CLÉS */}
        <section className="mt-3.5 md:mt-7 bg-white rounded-3xl md:rounded-[28px] border border-[#E8DCCB] overflow-hidden grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F0E7DA]">
          {[
            { Icone: Clock, vert: false, titre: 'Dès le lendemain', texte: 'Commandez avant minuit et choisissez votre date : livraison dès le lendemain, entre 15h et 20h, selon les jours proposés.' },
            { Icone: Package, vert: false, titre: 'Cagette consignée', texte: 'Consigne gratuite : rendez votre cagette au livreur lors de la livraison suivante.' },
            { Icone: Gift, vert: true, titre: 'Frais de livraison', texte: 'Offerte à Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre et Saint-Nom-la-Bretèche. Ailleurs : offerte dès 40€, sinon 3€ à 5€ selon la distance à nos points relais.', lien: true },
          ].map(({ Icone, vert, titre, texte, lien }) => (
            <div key={titre} className="flex gap-3.5 p-[18px] md:p-7">
              <span className={`shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-[14px] md:rounded-[15px] flex items-center justify-center ${vert ? 'bg-[#ECF7EF] text-[#15803D]' : 'bg-[#FFF1EA] text-[#FF4500]'}`} aria-hidden>
                <Icone className="w-[21px] h-[21px] md:w-[22px] md:h-[22px]" />
              </span>
              <div>
                <h2 className="text-base md:text-[17px] font-extrabold mb-1">{titre}</h2>
                <p className="text-sm md:text-[15px] leading-normal text-[#5C4030]">{texte}</p>
                {lien && (
                  <Link href="/aide#frais-livraison" className="mt-1.5 inline-flex items-center min-h-8 text-sm font-extrabold text-[#C73600] hover:underline underline-offset-4">Voir le détail des frais</Link>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* POURQUOI LES YVELINES + POINTS RELAIS */}
        <section className="mt-11 md:mt-20 md:bg-white md:rounded-[36px] md:border md:border-[#E8DCCB] md:overflow-hidden grid lg:grid-cols-2 gap-y-[26px]">
          <div className="px-2 md:p-12 lg:p-[60px] flex flex-col justify-center">
            <p className={`${SURTITRE} mb-2 md:mb-2.5`}>Périmètre de sécurité fraîcheur</p>
            <h2 className="titre text-[34px] md:text-5xl lg:text-[54px] leading-none mb-3.5 md:mb-5">Pourquoi les <em className="text-[#FF4500]">Yvelines ?</em></h2>
            <p className="text-[15.5px] md:text-base leading-relaxed text-[#5C4030] mb-[18px] md:mb-7">
              Parce que la fraîcheur se joue aussi sur le dernier trajet.
              En concentrant nos livraisons sur le seul département des <strong className="font-extrabold text-[#3D2B1F]">Yvelines (78)</strong>, au départ de nos points relais, vos produits passent le moins de temps possible sur la route.
            </p>
            <ul className="grid grid-cols-2 gap-2.5 md:gap-3.5">
              <li className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3.5 md:p-4 rounded-[18px] bg-[#F5EAE0] border border-[#E3D6C4]">
                <span className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white text-[#15803D] flex items-center justify-center" aria-hidden><RefreshCcw className="w-[18px] h-[18px]" /></span>
                <span><strong className="block text-[14.5px] font-extrabold">Émissions Réduites</strong><span className="block mt-0.5 text-[13px] leading-snug text-[#5C4030]">Trajets courts = Impact minime</span></span>
              </li>
              <li className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3.5 md:p-4 rounded-[18px] bg-[#F5EAE0] border border-[#E3D6C4]">
                <span className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white text-[#FF4500] flex items-center justify-center" aria-hidden><MapPin className="w-[18px] h-[18px]" /></span>
                <span><strong className="block text-[14.5px] font-extrabold">Livraison locale</strong><span className="block mt-0.5 text-[13px] leading-snug text-[#5C4030]">100% Yvelines (78)</span></span>
              </li>
            </ul>
          </div>
          <div className="rounded-3xl md:rounded-none overflow-hidden border border-[#E3D6C4] md:border-0">
            <PointsRelais />
          </div>
        </section>

        {/* Liste des villes détaillées */}
        <section className="mt-11 md:mt-20 px-2 md:px-0">
          <h2 className="titre text-[30px] md:text-[40px] leading-[1.05] mb-4 md:mb-6">Exemples de villes <em className="text-[#FF4500]">desservies</em></h2>
          <ul className="flex flex-wrap gap-2 md:gap-2.5">
            {ELIGIBLE_ZONES.map((zone, i) => (
              <li key={i} className="inline-flex items-baseline gap-1.5 px-3 py-2 md:px-3.5 md:py-2.5 rounded-[13px] bg-white border border-[#E8DCCB] text-sm md:text-[15px] font-bold">
                {zone.city}
                <span className="text-xs md:text-[13px] font-semibold text-[#6F5A4B]">{zone.cp}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3.5 md:mt-5 text-[13.5px] md:text-[15px] leading-normal text-[#5C4030]">
            Liste non exhaustive. Nous livrons dans toutes les communes des Yvelines (78) — vérifiez votre code postal ci-dessus.
          </p>
        </section>

        {/* Appel final */}
        <section className="mt-9 md:mt-20">
          <div className="relative overflow-hidden rounded-[28px] md:rounded-[44px] bg-[#3D2B1F] text-[#F5EAE0] px-[22px] pt-11 pb-[26px] md:px-6 md:py-20 text-center">
            <svg className="ss-rayons absolute -right-[130px] -top-[170px] w-[290px] h-[290px] md:-right-[180px] md:-top-[220px] md:w-[560px] md:h-[560px] pointer-events-none" viewBox="0 0 600 600" aria-hidden>
              <circle cx="300" cy="300" r="100" fill="#FF4500" fillOpacity="0.9" />
              <circle cx="300" cy="300" r="226" fill="none" stroke="#FF4500" strokeOpacity="0.7" strokeWidth="110" strokeDasharray="12 47.2" />
            </svg>
            <h2 className="relative titre text-4xl sm:text-6xl lg:text-[72px] leading-none mb-[22px] md:mb-9">Vous êtes dans<br /><em className="text-[#FF7A47]">la zone ?</em></h2>
            <Link href="/commander" className="group relative flex md:inline-flex items-center justify-between md:justify-center gap-3 min-h-[60px] px-[22px] md:px-[34px] rounded-[18px] bg-[#FF4500] text-white text-[19px] font-extrabold shadow-[0_20px_40px_-16px_rgba(255,69,0,0.7)] transition-[background-color,transform] duration-200 hover:bg-[#E63E00] active:scale-[0.98]">
              Lancer ma commande
              <ArrowRight className="w-[22px] h-[22px] transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.4} aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
