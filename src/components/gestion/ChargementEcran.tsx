// Squelette affiché tout de suite à chaque appui, le temps que l'écran
// suivant arrive (l'appli répond au doigt même quand le serveur est lent)
export default function ChargementEcran() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="mb-3 h-6 w-28 animate-pulse rounded-xl bg-[#EFE6D8]" />
      <div className="mb-4 aspect-[3/2] w-full animate-pulse rounded-3xl bg-[#EFE6D8]" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-3xl bg-[#EFE6D8]" />
        ))}
      </div>
    </div>
  );
}
