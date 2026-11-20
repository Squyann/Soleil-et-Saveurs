// Page affichée par le service worker quand l'appli est ouverte sans réseau
// et qu'aucune copie de l'écran demandé n'est disponible.
export const metadata = { title: 'Hors connexion' };

export default function HorsLigne() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-lin px-6 text-center text-olivier">
      <img src="/icon-192.png" alt="" className="h-16 w-16 rounded-2xl" />
      <h1 className="titre mt-6 text-[28px]">Pas de connexion</h1>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-olivier-doux">
        Cet écran n’a pas encore été ouvert sur ce téléphone. Il s’affichera dès le retour du réseau.
      </p>
      <a href="/gestion" className="mt-8 inline-flex min-h-[48px] items-center rounded-2xl bg-olivier px-6 font-bold text-lin">
        Réessayer
      </a>
    </main>
  );
}
