// Appel serveur → fonction Supabase « notifications » (notifications sur les
// téléphones de l'équipe). Jamais bloquant : une notification qui ne part pas
// n'empêche ni la commande ni le changement de statut.

export async function notifierEquipe(jeton: string, corps: { action: 'commande' | 'annulation'; id: number }) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !cle || !jeton) return;
  try {
    const rep = await fetch(`${base}/functions/v1/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}`, apikey: cle },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(8000),
    });
    if (!rep.ok) console.warn('[notifications]', corps.action, rep.status);
  } catch (e) {
    console.warn('[notifications]', corps.action, e instanceof Error ? e.message : e);
  }
}
