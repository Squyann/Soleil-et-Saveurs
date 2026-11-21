// Factures pros dans l'application : lecture et écriture (toujours confirmées
// par la base ; un brouillon modifié ailleurs entre-temps n'est jamais écrasé).
import { supabase } from '@/lib/supabase';
import { COLONNES_DOCUMENT, type ClientPro, type DocumentPro, type LignePro, type TypeDocumentPro } from '@/lib/facturePro';
import { reponse } from './memoire';

export const COLONNES_CLIENT_PRO = 'id, raison_sociale, siren, tva, adresse_facturation, adresse_livraison, email, telephone, notes, actif, updated_at';

export const listerDocuments = () =>
  reponse(supabase.from('documents_pro').select(COLONNES_DOCUMENT).order('cree_le', { ascending: false }).limit(500)) as Promise<DocumentPro[]>;

export const lireDocument = (id: string) =>
  reponse(supabase.from('documents_pro').select(COLONNES_DOCUMENT).eq('id', id).maybeSingle()) as Promise<DocumentPro | null>;

export const listerClientsPro = () =>
  reponse(supabase.from('clients_pro').select(COLONNES_CLIENT_PRO).order('raison_sociale')) as Promise<ClientPro[]>;

export type ChampsClient = Omit<ClientPro, 'id' | 'actif' | 'updated_at'>;

export async function enregistrerClientPro(id: string | null, champs: ChampsClient, version?: string): Promise<{ ok: true; client: ClientPro } | { ok: false }> {
  if (!id) {
    const c = await reponse(supabase.from('clients_pro').insert([champs]).select(COLONNES_CLIENT_PRO).single());
    return { ok: true, client: c as ClientPro };
  }
  const r = await supabase.from('clients_pro').update(champs).eq('id', id).eq('updated_at', version ?? '').select(COLONNES_CLIENT_PRO);
  if (r.error) throw r.error;
  return r.data?.length ? { ok: true, client: r.data[0] as ClientPro } : { ok: false };
}

export async function supprimerClientPro(id: string) {
  const r = await supabase.from('clients_pro').delete().eq('id', id).select('id');
  if (r.error) {
    if (r.error.code === '23503') throw new Error('Ce client figure sur des documents : il ne peut pas être supprimé');
    throw r.error;
  }
}

export async function creerBrouillon(type: TypeDocumentPro, clientId: string | null, extra: Partial<Pick<DocumentPro, 'avoir_de' | 'lignes'>> = {}) {
  return reponse(supabase.from('documents_pro').insert([{ type, client_id: clientId, ...extra }]).select(COLONNES_DOCUMENT).single()) as Promise<DocumentPro>;
}

export type ChampsBrouillon = Partial<Pick<DocumentPro, 'type' | 'client_id' | 'lignes' | 'date_livraison' | 'adresse_livraison' | 'delai_jours' | 'notes'>>;

// Enregistre seulement si le brouillon n'a pas changé depuis sa lecture
export async function enregistrerBrouillon(d: Pick<DocumentPro, 'id' | 'updated_at'>, champs: ChampsBrouillon): Promise<{ ok: true; doc: DocumentPro } | { ok: false; actuel: DocumentPro | null }> {
  const r = await supabase.from('documents_pro').update(champs).eq('id', d.id).eq('updated_at', d.updated_at).eq('statut', 'brouillon').select(COLONNES_DOCUMENT);
  if (r.error) throw r.error;
  if (r.data?.length) return { ok: true, doc: r.data[0] as DocumentPro };
  return { ok: false, actuel: await lireDocument(d.id) };
}

export const supprimerBrouillon = (id: string) =>
  reponse(supabase.from('documents_pro').delete().eq('id', id).eq('statut', 'brouillon').select('id'));

export async function emettre(d: Pick<DocumentPro, 'id' | 'updated_at'>) {
  const r = (await reponse(supabase.rpc('emettre_document_pro', { p_id: d.id, p_version: d.updated_at }))) as { ok: boolean; numero?: string; conflit?: boolean; deja?: boolean };
  return r;
}

export async function enregistrerReglement(d: Pick<DocumentPro, 'id'>, date: string | null, mode: DocumentPro['mode_reglement']) {
  const r = await reponse(supabase.from('documents_pro').update({ date_reglement: date, mode_reglement: date ? mode : null }).eq('id', d.id).eq('statut', 'emis').select(COLONNES_DOCUMENT));
  return (r as DocumentPro[])[0];
}

export async function envoyerParEmail(id: string) {
  const { data } = await supabase.auth.getSession();
  const rep = await fetch('/api/gestion/documents/envoyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ id }),
  });
  const corps = await rep.json().catch(() => ({}));
  if (!rep.ok) throw new Error(typeof corps.error === 'string' ? corps.error : `Erreur ${rep.status}`);
  return corps as { ok: true; envoye_le: string };
}

export const lienPublic = (jeton: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://soleiletsaveurs.fr'}/document/${jeton}`;

export const lignesSansTotal = (l: LignePro[]) => l.map(({ total_ht: _t, ...reste }) => { void _t; return reste; });

const jourParis = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());

// Pastille d'état d'un document (liste et fiche)
export function etatDocument(d: DocumentPro): { libelle: string; fond: string; texte: string } {
  if (d.statut === 'brouillon') return { libelle: 'Brouillon', fond: '#EFE6D8', texte: '#56654F' };
  if (d.type === 'bon') return { libelle: 'Bon', fond: '#E7EEDC', texte: '#2F4A2B' };
  if (d.type === 'avoir') return { libelle: 'Avoir', fond: '#F1E1DB', texte: '#8A3A1E' };
  if (d.date_reglement) return { libelle: 'Réglée', fond: '#2F4A2B', texte: '#F3E8D6' };
  if (d.date_echeance && d.date_echeance < jourParis()) return { libelle: 'En retard', fond: '#A94E25', texte: '#FFFFFF' };
  return { libelle: 'À régler', fond: '#ECAD44', texte: '#2F4A2B' };
}
