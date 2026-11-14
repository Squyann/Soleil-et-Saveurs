// Contenu de la fiche produit sous l'en-tête : description, rubriques,
// saisonnalité et recettes. Reçoit la fiche déjà fusionnée (variante choisie +
// produit principal) : changer de variante change tout ce contenu.
import React from 'react';
import { MapPin, Sparkles, Utensils, Refrigerator, ChefHat, Leaf, Clock, Users, Check, ChevronDown } from 'lucide-react';
import Rubrique from '@/components/fiche/Rubrique';
import { MOIS, MOIS_COURTS, type FicheAffichee, type Recette } from '@/lib/fiches';

// Texte d'une rubrique ; `liste` : une ligne par point, avec une coche
function TexteRubrique({ texte, liste = false }: { texte: string; liste?: boolean }) {
  const lignes = texte.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (liste && lignes.length > 1) {
    return (
      <ul className="flex flex-col gap-2 lg:gap-[9px] text-[15px] lg:text-base leading-snug text-[#5C4030]">
        {lignes.map((ligne, i) => (
          <li key={i} className="flex gap-2.5">
            <Check className="w-[17px] h-[17px] lg:w-[18px] lg:h-[18px] shrink-0 mt-0.5 text-[#15803D]" strokeWidth={2.6} aria-hidden />
            {ligne}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-[15px] lg:text-base leading-relaxed text-[#5C4030] whitespace-pre-line">{texte.trim()}</p>;
}

function FriseSaison({ mois, moisCourant, deSaison }: { mois: number[]; moisCourant: number; deSaison: boolean }) {
  return (
    <section className="bg-white rounded-3xl lg:rounded-[28px] border border-[#E8DCCB] p-5 lg:px-9 lg:py-[30px]">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4 lg:mb-5">
        <h2 className="titre text-[26px] leading-[1.1]">Saisonnalité</h2>
        {deSaison && (
          <p className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-full bg-[#ECF7EF] text-[13px] lg:text-sm font-extrabold text-[#166534]">
            <Leaf className="w-4 h-4" aria-hidden />De saison en ce moment
          </p>
        )}
      </div>
      <ol className="grid grid-cols-12 gap-[5px] lg:gap-2">
        {MOIS.map((nom, i) => {
          const m = i + 1;
          const enSaison = mois.includes(m);
          const courant = m === moisCourant;
          return (
            <li key={nom} aria-current={courant ? 'true' : undefined} className="flex flex-col items-center gap-1.5 lg:gap-2" title={`${nom}${enSaison ? ' : de saison' : ''}`}>
              <span className={`w-full h-[34px] lg:h-11 rounded-lg lg:rounded-xl ${enSaison ? 'bg-[#15803D]' : 'bg-[#EDE3D5]'} ${courant ? 'outline outline-[2.5px] lg:outline-[3px] outline-offset-2 lg:outline-offset-[3px] outline-[#FF4500]' : ''}`} />
              <span className={`text-xs ${courant ? 'font-extrabold text-[#C73600]' : enSaison ? 'font-extrabold text-[#166534]' : 'font-bold text-[#6F5A4B]'}`}>
                <span className="lg:hidden" aria-hidden>{nom[0]}</span>
                <span className="sr-only lg:not-sr-only">{MOIS_COURTS[i]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 lg:mt-5 flex items-center gap-4 lg:gap-5 flex-wrap text-[12.5px] lg:text-[13px] font-semibold text-[#6F5A4B]">
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded bg-[#15803D]" />Mois de saison</span>
        <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-[3px] outline outline-2 outline-offset-2 outline-[#FF4500]" />Mois en cours</span>
      </p>
    </section>
  );
}

function CarteRecette({ recette }: { recette: Recette }) {
  const ingredients = recette.ingredients?.filter(Boolean) ?? [];
  const etapes = recette.etapes?.filter(Boolean) ?? [];
  return (
    <details className="group bg-white rounded-3xl lg:rounded-[28px] border border-[#E8DCCB] overflow-hidden">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex flex-wrap items-center gap-x-4 gap-y-3 lg:gap-x-[22px] p-[18px] lg:px-[26px] lg:py-[22px] hover:bg-[#FFFBF7] transition-colors">
        {recette.photo ? (
          <img src={recette.photo} alt="" className="w-20 lg:w-24 aspect-[3/2] object-cover rounded-[14px] shrink-0" loading="lazy" />
        ) : (
          <span className="hidden sm:flex w-[60px] h-[60px] rounded-[18px] bg-[#FFF1EA] text-[#FF4500] items-center justify-center shrink-0" aria-hidden><ChefHat className="w-[26px] h-[26px]" /></span>
        )}
        <div className="min-w-0 flex-1 basis-[200px]">
          <h3 className="text-[17px] lg:text-[19px] font-extrabold leading-snug text-[#3D2B1F]">{recette.titre}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] lg:text-sm font-semibold text-[#6F5A4B]">
            {recette.temps && <span className="inline-flex items-center gap-1.5"><Clock className="w-[15px] h-[15px]" aria-hidden />{recette.temps}</span>}
            {recette.personnes && <span className="inline-flex items-center gap-1.5"><Users className="w-[15px] h-[15px]" aria-hidden />{recette.personnes} pers.</span>}
            {ingredients.length > 0 && <span>{ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <span className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 h-12 px-[18px] rounded-[14px] sm:rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold text-[#3D2B1F] group-hover:bg-[#3D2B1F] group-hover:text-[#F5EAE0] transition-colors">
          <span className="group-open:hidden">Voir la recette</span>
          <span className="hidden group-open:inline">Fermer la recette</span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" strokeWidth={2.4} aria-hidden />
        </span>
      </summary>
      <div className="px-[18px] pb-5 lg:px-[26px] lg:pb-7 grid md:grid-cols-[1fr_1.6fr] gap-6 border-t border-[#F0E7DA] pt-5">
        {ingredients.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">Ingrédients</p>
            <ul className="flex flex-col gap-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2.5 text-[15px] leading-snug text-[#5C4030]"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#FF4500] shrink-0" aria-hidden />{ing}</li>
              ))}
            </ul>
          </div>
        )}
        {etapes.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">Préparation</p>
            <ol className="flex flex-col gap-3.5">
              {etapes.map((etape, i) => (
                <li key={i} className="flex gap-3 text-[15px] text-[#5C4030] leading-relaxed">
                  <span className="titre w-7 h-7 rounded-full bg-[#3D2B1F] text-[#F5EAE0] text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="pt-0.5">{etape}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </details>
  );
}

export default function ContenuFiche({ fiche, moisCourant }: { fiche: FicheAffichee; moisCourant: number }) {
  const saison = fiche.saison_mois;
  const deSaison = saison.includes(moisCourant);
  const recettes = fiche.recettes;
  const rubriques = [
    { cle: 'origine', titre: 'Origine', texte: fiche.origine_detail, icone: <MapPin className="w-[22px] h-[22px]" /> },
    { cle: 'caracteristiques', titre: 'Caractéristiques', texte: fiche.caracteristiques, icone: <Sparkles className="w-[22px] h-[22px]" />, liste: true },
    { cle: 'gout', titre: 'Goût et saveurs', texte: fiche.gout, icone: <Utensils className="w-[22px] h-[22px]" /> },
    { cle: 'conservation', titre: 'Conservation', texte: fiche.conservation, icone: <Refrigerator className="w-[22px] h-[22px]" /> },
    { cle: 'preparation', titre: 'Conseils de préparation', texte: fiche.preparation, icone: <ChefHat className="w-[22px] h-[22px]" />, large: true },
  ].filter(r => r.texte?.trim());
  const description = fiche.description?.trim();
  // Sur mobile, la première rubrique est dépliée ; la dernière, seule sur sa ligne, prend toute la largeur
  const rubriquesCourtes = rubriques.filter(r => !r.large);

  return (
    <>
      {(description || rubriques.length > 0) && (
        <div className="bg-white rounded-3xl border border-[#E8DCCB] overflow-hidden lg:bg-transparent lg:border-0 lg:rounded-none lg:overflow-visible lg:grid lg:grid-cols-2 lg:gap-[22px]">
          {description && (
            <section className="p-5 lg:col-span-2 lg:bg-white lg:rounded-[28px] lg:border lg:border-[#E8DCCB] lg:px-9 lg:py-[34px]">
              <p className="hidden lg:block mb-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]">Le produit</p>
              <h2 className="titre text-[26px] lg:text-[34px] leading-[1.05] mb-2.5 lg:mb-4">Description</h2>
              <p className="text-[15.5px] lg:text-[17px] leading-relaxed lg:leading-[1.7] text-[#5C4030] whitespace-pre-line">{description}</p>
            </section>
          )}
          {rubriques.map((r, i) => (
            <Rubrique
              key={r.cle}
              icone={r.icone}
              titre={r.titre}
              ouverteSurMobile={!description ? i === 0 : r.cle === 'caracteristiques'}
              teinte={!!r.large}
              large={!!r.large || (rubriquesCourtes.length % 2 === 1 && r === rubriquesCourtes[rubriquesCourtes.length - 1])}
            >
              <TexteRubrique texte={r.texte as string} liste={r.liste} />
            </Rubrique>
          ))}
        </div>
      )}

      {saison.length > 0 && <FriseSaison mois={saison} moisCourant={moisCourant} deSaison={deSaison} />}

      {recettes.length > 0 && (
        <section className="pt-5 lg:pt-4">
          <h2 className="titre text-[32px] lg:text-[40px] leading-none mb-3.5 lg:mb-[18px] px-2 lg:px-0">
            Idées <em className="text-[#FF4500]">recettes</em>
          </h2>
          <div className="flex flex-col gap-3">
            {recettes.map((r, i) => <CarteRecette key={`${r.titre}-${i}`} recette={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
