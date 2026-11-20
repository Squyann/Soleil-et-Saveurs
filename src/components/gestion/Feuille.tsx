'use client';
// Feuille d'actions qui monte du bas de l'écran (à portée de pouce)
import { useEffect } from 'react';

export default function Feuille({ titre, fermer, children }: { titre: string; fermer: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [fermer]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/35" onClick={fermer} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()} className="mx-auto w-full max-w-xl rounded-t-3xl bg-white p-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#E3D6C4]" aria-hidden="true" />
        <p className="px-4 pb-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">{titre}</p>
        {children}
        <button type="button" onClick={fermer} className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-lin text-[15px] font-bold">Fermer</button>
      </div>
    </div>
  );
}

