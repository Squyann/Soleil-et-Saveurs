'use client';
import { WifiOff, X, Check, AlertTriangle } from 'lucide-react';
import type { EtatTempsReel } from './AppliGestion';

export type Message = {
  id: number;
  type: 'ok' | 'erreur' | 'info';
  texte: string;
  action?: { libelle: string; faire: () => void };
};

type Props = {
  enLigne: boolean;
  tempsReel: EtatTempsReel;
  miseAJour: boolean;
  enCours: number;
  appliquer: () => void;
  messages: Message[];
  fermer: (id: number) => void;
};

// Bandeau hors connexion (haut), messages et mise à jour (bas, au-dessus du menu)
export default function Bandeaux({ enLigne, tempsReel, miseAJour, enCours, appliquer, messages, fermer }: Props) {
  return (
    <>
      {!enLigne ? (
        <div role="status" className="sticky top-0 z-50 flex items-center gap-3 bg-olivier-gris px-4 py-3 text-[13.5px] leading-snug text-white pt-[max(12px,env(safe-area-inset-top))]">
          <WifiOff className="h-5 w-5 flex-none" aria-hidden="true" />
          <span><b>Hors connexion</b> · consultation possible, modifications en pause.</span>
        </div>
      ) : tempsReel === 'coupe' ? (
        <div role="status" className="sticky top-0 z-50 flex items-center gap-3 bg-[#FFF6E2] px-4 py-2.5 text-[13px] text-olivier border-b border-safran pt-[max(10px,env(safe-area-inset-top))]">
          <AlertTriangle className="h-4 w-4 flex-none text-brique" aria-hidden="true" />
          <span>Mise à jour en direct interrompue, reconnexion en cours…</span>
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-xl flex-col gap-2 px-3" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.id}
            role={m.type === 'erreur' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-[13.5px] leading-snug shadow-lg ${
              m.type === 'erreur' ? 'bg-[#1F2B1D] text-lin' : 'bg-olivier text-lin'}`}
          >
            {m.type === 'ok' && <Check className="h-5 w-5 flex-none text-safran" aria-hidden="true" />}
            <span className="flex-1">{m.texte}</span>
            {m.action && (
              <button
                type="button"
                onClick={() => { fermer(m.id); m.action!.faire(); }}
                className="min-h-[44px] flex-none rounded-xl px-2 font-extrabold text-safran"
              >
                {m.action.libelle}
              </button>
            )}
            {m.type === 'erreur' && (
              <button type="button" onClick={() => fermer(m.id)} aria-label="Fermer le message" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-lin/70">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}

        {miseAJour && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#E3D6C4] bg-white p-3 shadow-lg">
            <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
            <span className="flex-1 text-[13px] leading-snug">
              <b>Nouvelle version prête</b>
              <br />
              {enCours > 0 ? 'Elle s’installera après l’enregistrement en cours.' : 'Installée quand vous aurez fini.'}
            </span>
            <button
              type="button"
              onClick={appliquer}
              disabled={enCours > 0}
              className="min-h-[44px] rounded-xl bg-olivier px-3 text-[13px] font-extrabold text-lin disabled:opacity-40"
            >
              Mettre à jour
            </button>
          </div>
        )}
      </div>
    </>
  );
}
