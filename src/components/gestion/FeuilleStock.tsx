'use client';
// Stock et visibilité d'un produit ou d'une variante (préparateur compris)
import { useState } from 'react';
import { definirDisponibilite, definirStock, estIllimite, STOCK_ILLIMITE } from '@/lib/gestion/produits';
import { useGestion } from './AppliGestion';
import Feuille from './Feuille';

type Cible = { produit: string; variante: string | null; nom: string; stock: number | null; actif: boolean; unite?: string | null };

export default function FeuilleStock({ cible, fermer, apres }: { cible: Cible; fermer: () => void; apres: () => void }) {
  const { executer, enLigne } = useGestion();
  const [saisie, setSaisie] = useState(estIllimite(cible.stock) ? '' : String(cible.stock ?? 0).replace('.', ','));
  const [envoi, setEnvoi] = useState(false);
  const decimal = cible.unite === 'kg';

  async function fixer(valeur: number | null, libelle: string) {
    setEnvoi(true);
    const r = await executer(`Stock de ${cible.nom}`, () => definirStock(cible.produit, cible.variante, valeur), { reussite: `${cible.nom} : ${libelle}` });
    setEnvoi(false);
    if (r.ok) { apres(); fermer(); }
  }

  async function visibilite() {
    setEnvoi(true);
    const r = await executer(cible.actif ? `Masquer ${cible.nom}` : `Afficher ${cible.nom}`, () => definirDisponibilite(cible.produit, cible.variante, !cible.actif), {
      reussite: `${cible.nom} ${cible.actif ? 'masqué du site' : 'visible sur le site'}`,
    });
    setEnvoi(false);
    if (r.ok) { apres(); fermer(); }
  }

  const nombre = Number(saisie.replace(',', '.'));
  const valide = saisie.trim() !== '' && Number.isFinite(nombre) && nombre >= 0 && (decimal || Number.isInteger(nombre));

  return (
    <Feuille titre={cible.nom} fermer={fermer}>
      <div className="px-4">
        <label htmlFor="stock" className="block text-[13px] font-bold text-olivier-gris">Stock{cible.unite ? ` (${cible.unite === 'g' ? 'grammes' : cible.unite})` : ''}</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="stock"
            inputMode={decimal ? 'decimal' : 'numeric'}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value.replace(/[^\d,.]/g, ''))}
            placeholder={estIllimite(cible.stock) ? 'Illimité' : '0'}
            className="min-w-0 flex-1 rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-4 py-3 text-[18px] font-bold outline-none focus:border-olivier"
          />
          <button type="button" disabled={!valide || envoi || !enLigne} onClick={() => fixer(nombre, `stock ${saisie}`)} className="min-h-[52px] rounded-2xl bg-olivier px-5 font-extrabold text-lin disabled:opacity-40">
            OK
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" disabled={envoi || !enLigne} onClick={() => fixer(STOCK_ILLIMITE, 'stock illimité')} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] text-[14px] font-bold disabled:opacity-40">Illimité</button>
          <button type="button" disabled={envoi || !enLigne} onClick={() => fixer(0, 'en rupture')} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] text-[14px] font-bold disabled:opacity-40">Rupture (0)</button>
        </div>
        <button type="button" disabled={envoi || !enLigne} onClick={visibilite} className={`mt-3 min-h-[52px] w-full rounded-2xl text-[15px] font-extrabold disabled:opacity-40 ${cible.actif ? 'bg-[#F1E1DB] text-[#8A3A1E]' : 'bg-[#E7EEDC] text-olivier'}`}>
          {cible.actif ? 'Masquer du site' : 'Afficher sur le site'}
        </button>
        {!enLigne && <p className="mt-2 text-center text-[12.5px] text-olivier-gris">Hors connexion : modifications impossibles.</p>}
      </div>
    </Feuille>
  );
}
