'use client';
// Regrouper un produit existant comme variante (ex. « Ananas doux préparé »
// dans « Ananas doux »), mêmes règles que l'admin du site : le produit
// regroupé garde son nom, sa photo, son prix, son unité, sa description, sa
// remise et son stock ; sa page détaillée devient la fiche de la variante ;
// son ancienne fiche est seulement désactivée (« Dégrouper » la remet).
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { reponse } from '@/lib/gestion/memoire';
import type { Produit, Variante } from '@/lib/gestion/produits';
import { useGestion } from './AppliGestion';
import Feuille from './Feuille';

type Candidat = {
  id: string; name: string; price: number; unite: string | null; actif: boolean; image_url: string | null;
  description: string | null; pas_g: number | null; promotion: number | null; stock: number | null;
};

const sansAccents = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Regroupement({ p, variantes, fermer, apres }: { p: Produit; variantes: Variante[]; fermer: () => void; apres: () => void }) {
  const { executer, enLigne } = useGestion();
  const [candidats, setCandidats] = useState<Candidat[] | null>(null);
  const [recherche, setRecherche] = useState('');
  const [choisi, setChoisi] = useState<Candidat | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void Promise.all([
      supabase.from('products').select('id, name, price, unite, actif, image_url, description, pas_g, promotion, stock').order('name'),
      supabase.from('product_variants').select('source_product_id').not('source_product_id', 'is', null),
    ]).then(([a, b]) => {
      // Produits déjà regroupés quelque part : exclus (on ne regroupe pas deux fois)
      const regroupes = new Set(((b.data as { source_product_id: string }[]) ?? []).map((x) => String(x.source_product_id)));
      setCandidats(((a.data as Candidat[]) ?? []).filter((c) => String(c.id) !== String(p.id) && !regroupes.has(String(c.id)))
        .sort((x, y) => Number(y.actif) - Number(x.actif) || x.name.localeCompare(y.name, 'fr')));
    });
  }, [p.id]);

  const q = sansAccents(recherche.trim());
  const liste = useMemo(() => (candidats ?? []).filter((c) => !q || sansAccents(c.name).includes(q)).slice(0, 40), [candidats, q]);

  async function regrouper(source: Candidat) {
    const premier = variantes.length === 0;
    const ordreMax = variantes.length ? Math.max(...variantes.map((v) => v.ordre ?? 0)) : -1;
    const uniteSource = (source.unite ?? null) !== (p.unite ?? null) ? source.unite : null;
    const pct = Number(source.promotion) || 0;
    setEnvoi(true);
    const r = await executer(`Regroupement de ${source.name.trim()}`, async () => {
      if (premier) await reponse(supabase.from('product_variants').insert([{ product_id: String(p.id), nom: p.name.trim(), ordre: 0 }]).select('id'));
      const ins = await reponse(supabase.from('product_variants').insert([{
        product_id: String(p.id),
        nom: source.name.trim(),
        prix: Number(source.price) !== Number(p.price) ? source.price : null,
        image_url: source.image_url || null,
        description: source.description || null,
        unite: uniteSource,
        pas_g: (uniteSource ?? p.unite) === 'g' && source.pas_g && source.pas_g !== p.pas_g ? source.pas_g : null,
        promotion: pct !== (Number(p.promotion) || 0) ? pct : null,
        stock: source.stock ?? null,
        source_product_id: source.id,
        ordre: ordreMax + (premier ? 2 : 1),
      }]).select('id')) as { id: string }[];
      // Son ancienne page détaillée devient la fiche de la variante
      const ancienne = await reponse(supabase.from('fiches_produits').select('*').eq('product_id', source.id).maybeSingle()) as Record<string, unknown> | null;
      if (ins?.[0] && ancienne) {
        const t = (x: unknown) => (typeof x === 'string' && x.trim() ? x : null);
        const liste = (x: unknown) => (Array.isArray(x) && x.length ? x : null);
        await reponse(supabase.from('fiches_variantes').upsert({
          variant_id: ins[0].id,
          accroche: t(ancienne.accroche), description: t(ancienne.description), origine_detail: t(ancienne.origine_detail),
          caracteristiques: t(ancienne.caracteristiques), gout: t(ancienne.gout), conservation: t(ancienne.conservation), preparation: t(ancienne.preparation),
          saison_mois: liste(ancienne.saison_mois), photos: liste(ancienne.photos), recettes: liste(ancienne.recettes),
        }, { onConflict: 'variant_id' }).select('variant_id'));
      }
      await reponse(supabase.from('products').update({ actif: false }).eq('id', source.id).select('id'));
    }, { reussite: `« ${source.name.trim()} » regroupé dans « ${p.name.trim()} »` });
    setEnvoi(false);
    if (r.ok) apres();
  }

  return (
    <Feuille titre={`Regrouper dans ${p.name}`} fermer={fermer}>
      <div className="max-h-[70dvh] space-y-3 overflow-y-auto px-4 pb-1">
        {choisi ? (
          <div className="rounded-2xl bg-lin p-3 text-[13.5px] leading-relaxed">
            <b className="block text-[15px]">Regrouper « {choisi.name.trim()} » ?</b>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {variantes.length === 0 && <li>« {p.name.trim()} » reste le produit principal et devient le premier choix.</li>}
              <li>« {choisi.name.trim()} » devient une variante, avec son nom, sa photo, son prix, son unité, sa description, sa remise et son stock.</li>
              <li>Sa page détaillée devient la fiche de la variante.</li>
              <li>Son ancien article est désactivé (rien n’est supprimé : « Dégrouper » le remet en ligne).</li>
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setChoisi(null)} className="min-h-[48px] rounded-2xl border border-olivier font-bold">Retour</button>
              <button type="button" disabled={envoi || !enLigne} onClick={() => regrouper(choisi)} className="min-h-[48px] rounded-2xl bg-olivier font-bold text-lin disabled:opacity-40">{envoi ? 'Regroupement…' : 'Regrouper'}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] leading-relaxed text-olivier-gris">Vous aviez créé deux articles (ex. « Ananas doux » et « Ananas doux préparé ») ? Choisissez l’autre : il devient une variante de celui-ci.</p>
            <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" className="w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier" />
            {candidats == null ? <p className="py-4 text-center text-[13.5px] text-olivier-gris">Chargement…</p> : (
              <ul className="divide-y divide-[#F0E7DA]">
                {liste.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setChoisi(c)} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left">
                      <img src={c.image_url || '/icon-192.png'} alt="" className={`h-10 w-[60px] flex-none rounded-lg object-cover ${c.actif ? '' : 'opacity-50 grayscale'}`} />
                      <span className="min-w-0 flex-1">
                        <b className={`block truncate text-[14.5px] ${c.actif ? '' : 'text-[#8C877E]'}`}>{c.name.trim()}</b>
                        <span className="text-[12.5px] text-olivier-gris">{formatPrix(Number(c.price))}{c.unite === 'g' || c.unite === 'kg' ? ' /kg' : ` · ${c.unite || 'pièce'}`}{c.actif ? '' : ' · désactivé'}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {!liste.length && <li className="py-4 text-center text-[13.5px] text-olivier-gris">Aucun produit trouvé.</li>}
              </ul>
            )}
          </>
        )}
      </div>
    </Feuille>
  );
}
