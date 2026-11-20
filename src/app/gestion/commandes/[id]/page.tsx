import Bientot from '@/components/gestion/Bientot';
export const metadata = { title: 'Commande' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Bientot titre={`Commande n° ${id.replace(/\D/g, '')}`} texte="La fiche de la commande (contenu, client, statut, annulation) arrive à l’étape suivante." />;
}
