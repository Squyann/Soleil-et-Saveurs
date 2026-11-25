'use client';
// Contenu d'une unité de vente (ex. barquette de 250 g, sachet de 1 kg,
// filet de 3 pièces). Sans objet pour une vente au kg ou au poids.
import { libelleUnite } from '@/lib/format';
import { contenanceSaisie, UNITES_CONTENANCE } from '@/lib/variantes';

export const avecContenu = (unite: string | null | undefined) => !['kg', 'g'].includes(unite || '');

export default function ChampContenu({ id, unite, quantite, uniteContenu, changer, indication, desactive }: {
  id: string;
  unite: string;
  quantite: string;
  uniteContenu: string;
  changer: (quantite: string, uniteContenu: string) => void;
  indication?: string; // ce qui s'affiche si le champ reste vide
  desactive?: boolean;
}) {
  if (!avecContenu(unite)) return null;
  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier disabled:opacity-60';
  const contenu = contenanceSaisie(unite, quantite, uniteContenu);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-bold text-olivier-gris">Contenu d’{unite === 'sachet' || unite === 'filet' ? 'un' : 'une'} {unite || 'pièce'} (facultatif)</label>
      <div className="grid grid-cols-[1.3fr_1fr] gap-3">
        <input id={id} inputMode="decimal" value={quantite} disabled={desactive} onChange={(e) => changer(e.target.value.replace(/[^\d,.]/g, ''), uniteContenu)} placeholder="ex. 250" className={champ} />
        <select aria-label="Unité du contenu" value={uniteContenu} disabled={desactive} onChange={(e) => changer(quantite, e.target.value)} className={champ}>
          {UNITES_CONTENANCE.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <p className="mt-1 text-[12.5px] font-semibold text-brique">
        Affiché sur le site : « {libelleUnite(unite, contenu.contenance ? contenu : null)} »{!contenu.contenance && indication ? ` ${indication}` : ''}
      </p>
    </div>
  );
}
