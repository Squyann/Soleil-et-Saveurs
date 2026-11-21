'use client';
// Création / modification d'un client pro (feuille), réutilisée dans le carnet
// et directement depuis un brouillon de facture
import { useState } from 'react';
import { sirenValide, tvaDepuisSiren, type ClientPro } from '@/lib/facturePro';
import { enregistrerClientPro, supprimerClientPro } from '@/lib/gestion/documentsPro';
import { useGestion } from './AppliGestion';
import Feuille from './Feuille';

export default function FicheClientPro({ client, fermer, apres }: { client: ClientPro | null; fermer: () => void; apres: (c: ClientPro | null) => void }) {
  const { executer, notifier, enLigne } = useGestion();
  const [f, setF] = useState({
    raison_sociale: client?.raison_sociale ?? '', siren: client?.siren ?? '', tva: client?.tva ?? '',
    adresse_facturation: client?.adresse_facturation ?? '', adresse_livraison: client?.adresse_livraison ?? '',
    email: client?.email ?? '', telephone: client?.telephone ?? '', notes: client?.notes ?? '',
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setErreur(''); setF({ ...f, [k]: e.target.value }); };
  const siren = f.siren.replace(/\s/g, '');
  const avertissementSiren = siren.length === 9 && !sirenValide(siren);

  async function enregistrer() {
    if (!f.raison_sociale.trim()) return setErreur('La raison sociale est obligatoire.');
    if (!f.adresse_facturation.trim()) return setErreur('L’adresse de facturation est obligatoire.');
    if (siren && !/^\d{9}$/.test(siren)) return setErreur('Le SIREN compte 9 chiffres.');
    const tva = f.tva.replace(/\s/g, '').toUpperCase();
    if (tva && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(tva)) return setErreur('Numéro de TVA invalide (ex. FR12901234567).');
    const email = f.email.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErreur('Adresse e-mail invalide.');
    const champs = {
      raison_sociale: f.raison_sociale.trim().slice(0, 160), siren: siren || null, tva: tva || null,
      adresse_facturation: f.adresse_facturation.trim().slice(0, 300), adresse_livraison: f.adresse_livraison.trim().slice(0, 300) || null,
      email: email || null, telephone: f.telephone.trim().slice(0, 40) || null, notes: f.notes.trim().slice(0, 1000) || null,
    };
    setEnvoi(true);
    const r = await executer(client ? `Modification de ${champs.raison_sociale}` : `Ajout de ${champs.raison_sociale}`, () => enregistrerClientPro(client?.id ?? null, champs, client?.updated_at));
    setEnvoi(false);
    if (!r.ok) return;
    if (!r.donnees.ok) { notifier({ type: 'info', texte: 'Ce client a été modifié ailleurs entre-temps : rechargé, rien n’a été écrasé.' }); apres(null); return; }
    notifier({ type: 'ok', texte: `${champs.raison_sociale} enregistré` });
    apres(r.donnees.client);
  }

  async function supprimer() {
    if (!client) return;
    setEnvoi(true);
    const r = await executer(`Suppression de ${client.raison_sociale}`, () => supprimerClientPro(client.id), { reussite: `${client.raison_sociale} supprimé` });
    setEnvoi(false);
    if (r.ok) apres(null);
  }

  async function archiver() {
    if (!client) return;
    setEnvoi(true);
    const r = await executer(client.actif ? 'Archivage du client' : 'Réactivation du client', async () => {
      const { supabase } = await import('@/lib/supabase');
      const res = await supabase.from('clients_pro').update({ actif: !client.actif }).eq('id', client.id).select('id');
      if (res.error) throw res.error;
    }, { reussite: client.actif ? `${client.raison_sociale} archivé` : `${client.raison_sociale} réactivé` });
    setEnvoi(false);
    if (r.ok) apres(null);
  }

  const champ = 'w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-3.5 py-3 text-[16px] outline-none focus:border-olivier';
  const libelle = 'mb-1 block text-[12.5px] font-bold text-olivier-gris';
  return (
    <Feuille titre={client ? client.raison_sociale : 'Nouveau client pro'} fermer={fermer}>
      <div className="max-h-[72dvh] space-y-3 overflow-y-auto px-4 pb-1">
        <div><label htmlFor="cp-rs" className={libelle}>Raison sociale</label><input id="cp-rs" value={f.raison_sociale} onChange={maj('raison_sociale')} placeholder="ex. Le Bistrot du Marché" className={champ} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cp-siren" className={libelle}>SIREN</label>
            <input id="cp-siren" inputMode="numeric" value={f.siren} onChange={(e) => { const v = e.target.value.replace(/[^\d ]/g, ''); setErreur(''); setF({ ...f, siren: v, tva: f.tva || (v.replace(/\s/g, '').length === 9 ? tvaDepuisSiren(v.replace(/\s/g, '')) : '') }); }} placeholder="9 chiffres" className={champ} />
          </div>
          <div><label htmlFor="cp-tva" className={libelle}>N° de TVA</label><input id="cp-tva" value={f.tva} onChange={maj('tva')} placeholder="FR…" className={champ} /></div>
        </div>
        {avertissementSiren && <p className="text-[12.5px] font-semibold text-brique">Ce SIREN semble erroné (clé de contrôle). Vérifiez-le sur l’extrait Kbis ou annuaire-entreprises.data.gouv.fr.</p>}
        <p className="-mt-1 text-[12px] text-olivier-gris">Obligatoire sur les factures entre professionnels. Le n° de TVA est proposé à partir du SIREN.</p>
        <div><label htmlFor="cp-af" className={libelle}>Adresse de facturation</label><textarea id="cp-af" rows={2} value={f.adresse_facturation} onChange={maj('adresse_facturation')} className={champ} /></div>
        <div><label htmlFor="cp-al" className={libelle}>Adresse de livraison (si différente)</label><textarea id="cp-al" rows={2} value={f.adresse_livraison} onChange={maj('adresse_livraison')} className={champ} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="cp-mail" className={libelle}>E-mail</label><input id="cp-mail" type="email" inputMode="email" value={f.email} onChange={maj('email')} className={champ} /></div>
          <div><label htmlFor="cp-tel" className={libelle}>Téléphone</label><input id="cp-tel" type="tel" value={f.telephone} onChange={maj('telephone')} className={champ} /></div>
        </div>
        <div><label htmlFor="cp-notes" className={libelle}>Notes (internes)</label><textarea id="cp-notes" rows={2} value={f.notes} onChange={maj('notes')} placeholder="ex. livrer avant 10 h, contact : Julien" className={champ} /></div>
        {erreur && <p role="alert" className="rounded-xl bg-[#F1E1DB] px-3 py-2 text-[13.5px] font-semibold text-[#8A3A1E]">{erreur}</p>}
        <button type="button" disabled={envoi || !enLigne} onClick={enregistrer} className="min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        {client && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={envoi || !enLigne} onClick={archiver} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] text-[13.5px] font-bold disabled:opacity-40">{client.actif ? 'Archiver' : 'Réactiver'}</button>
            {suppression
              ? <button type="button" disabled={envoi || !enLigne} onClick={supprimer} className="min-h-[48px] rounded-2xl bg-brique text-[13.5px] font-bold text-white disabled:opacity-40">Confirmer</button>
              : <button type="button" disabled={envoi || !enLigne} onClick={() => setSuppression(true)} className="min-h-[48px] rounded-2xl border border-[#E3D6C4] text-[13.5px] font-bold text-brique disabled:opacity-40">Supprimer</button>}
          </div>
        )}
        {suppression && <p className="text-[12px] text-olivier-gris">Possible seulement si aucun document n’est à son nom. Sinon, archivez-le.</p>}
      </div>
    </Feuille>
  );
}
