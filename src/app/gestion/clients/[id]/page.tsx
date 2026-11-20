'use client';
// Fiche client : coordonnées, fidélité, parrainage, préférences e-mail,
// produits préférés et historique des commandes
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrix } from '@/lib/format';
import { lienWhatsApp, telephoneLisible } from '@/lib/gestion/commandes';
import { statutNormalise } from '@/lib/gestion/statuts';
import { useGestion } from '@/components/gestion/AppliGestion';
import { Carte, Chargement, dateCourte, PastilleStatut } from '@/components/gestion/Elements';

type Fiche = {
  user_id: string; email: string; prenom: string | null; nom: string | null; telephone: string | null; inscrit_le: string;
  points: number; code_parrainage: string | null; parraine_par: string | null; filleuls: number; accepte_offres: boolean;
  commandes: { id: number; created_at: string; date_livraison: string | null; total: number; statut: string; nom_client: string | null; telephone_client: string | null; adresse_livraison: string | null }[];
  produits_preferes: string[];
};

export default function FicheClient() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const { peut } = useGestion();
  const [f, setF] = useState<Fiche | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let actif = true;
    supabase.rpc('gestion_client', { p_user: id }).then(({ data, error }) => {
      if (!actif) return;
      if (error) setErreur(/introuvable/i.test(error.message) ? 'Client introuvable.' : /42501|refus/i.test(error.message) ? 'Accès réservé à l’administrateur et au gérant.' : 'Impossible de charger ce client.');
      else setF(data as Fiche);
    });
    return () => { actif = false; };
  }, [id]);

  const retour = (
    <Link href="/gestion/clients" className="-ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-[14px] font-bold text-olivier-gris">
      <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Clients
    </Link>
  );
  if (!peut('clients')) return (<>{retour}<Carte><p>Accès réservé à l’administrateur et au gérant.</p></Carte></>);
  if (erreur) return (<>{retour}<Carte><p>{erreur}</p></Carte></>);
  if (!f) return (<>{retour}<Chargement lignes={4} /></>);

  const derniere = f.commandes[0];
  const nom = [f.prenom, f.nom].filter(Boolean).join(' ') || derniere?.nom_client || f.email;
  const tel = f.telephone || derniere?.telephone_client || null;
  const actives = f.commandes.filter((c) => statutNormalise(c.statut) !== 'annulee');
  const total = actives.reduce((a, c) => a + (Number(c.total) || 0), 0);
  const wa = lienWhatsApp(tel);

  return (
    <>
      {retour}
      <h1 className="titre text-[28px] leading-tight">{nom}</h1>
      <p className="mb-4 text-[13.5px] text-olivier-gris">Client depuis le {new Date(f.inscrit_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Chiffre valeur={String(actives.length)} libelle={`commande${actives.length > 1 ? 's' : ''}`} />
        <Chiffre valeur={formatPrix(total)} libelle="au total" />
        <Chiffre valeur={String(f.points)} libelle="points fidélité" />
      </div>

      <Carte className="mb-3">
        <p className="text-[14.5px]">{f.email}</p>
        <p className="text-[14.5px]">{telephoneLisible(tel) || 'Pas de téléphone'}</p>
        {derniere?.adresse_livraison && <p className="mt-1 text-[13.5px] text-olivier-gris">{derniere.adresse_livraison}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Action href={tel ? `tel:${tel.replace(/[^\d+]/g, '')}` : null} Icone={Phone} libelle="Appeler" />
          <Action href={wa} Icone={MessageCircle} libelle="WhatsApp" />
          <Action href={`mailto:${f.email}`} Icone={Mail} libelle="E-mail" />
        </div>
      </Carte>

      <Carte className="mb-3 space-y-1 text-[13.5px]">
        <p className="flex justify-between"><span className="text-olivier-gris">Offres par e-mail</span><b>{f.accepte_offres ? 'Accepte' : 'Refuse'}</b></p>
        {f.code_parrainage && <p className="flex justify-between"><span className="text-olivier-gris">Code de parrainage</span><b>{f.code_parrainage}</b></p>}
        {f.parraine_par && <p className="flex justify-between"><span className="text-olivier-gris">Parrainé par</span><b className="truncate pl-3">{f.parraine_par}</b></p>}
        {f.filleuls > 0 && <p className="flex justify-between"><span className="text-olivier-gris">Filleuls</span><b>{f.filleuls}</b></p>}
      </Carte>

      {f.produits_preferes.length > 0 && (
        <Carte className="mb-3">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Produits préférés</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {f.produits_preferes.map((p) => <span key={p} className="rounded-full bg-lin px-3 py-1 text-[13px] font-bold">{p}</span>)}
          </div>
        </Carte>
      )}

      <h2 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-olivier-gris">Commandes</h2>
      {f.commandes.length === 0 ? (
        <Carte><p className="text-[14px] text-olivier-doux">Aucune commande pour l’instant.</p></Carte>
      ) : (
        <ul className="space-y-2">
          {f.commandes.map((c) => (
            <li key={c.id}>
              <Link href={`/gestion/commandes/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white px-4 py-3 active:bg-[#FBF6F0]">
                <span className="min-w-0 flex-1">
                  <b className="block text-[15px]">N° {c.id}</b>
                  <span className="text-[12.5px] text-olivier-gris">Livraison {dateCourte(c.date_livraison) || 'sans date'}</span>
                </span>
                <b className="text-[14.5px]">{formatPrix(Number(c.total) || 0)}</b>
                <PastilleStatut statut={statutNormalise(c.statut)} petite />
                <ChevronRight className="h-5 w-5 flex-none text-olivier-pale" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="rounded-2xl border border-[#E3D6C4] bg-white px-3 py-3">
      <b className="block text-[18px] leading-tight">{valeur}</b>
      <span className="text-[11.5px] text-olivier-gris">{libelle}</span>
    </div>
  );
}

function Action({ href, Icone, libelle }: { href: string | null; Icone: typeof Phone; libelle: string }) {
  const classe = 'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#E3D6C4] text-[12.5px] font-bold';
  if (!href) return <span className={`${classe} opacity-40`}><Icone className="h-5 w-5" aria-hidden="true" />{libelle}</span>;
  return <a href={href} className={`${classe} active:bg-lin`} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}><Icone className="h-5 w-5" aria-hidden="true" />{libelle}</a>;
}
