import Bientot from '@/components/gestion/Bientot';
export const metadata = { title: 'Produits' };
export default function Page() {
  return <Bientot titre="Produits" texte="Le stock (+1 / −1), la disponibilité, les prix, les promotions, les variantes et les photos arrivent à l’étape suivante." />;
}
