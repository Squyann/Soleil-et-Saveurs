import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

export async function requireAdmin() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }

  return { user, error: null };
}

/**
 * Consomme un jeton de quota pour l'utilisateur courant.
 * Renvoie false si le quota est dépassé (l'appelant doit répondre 429).
 * Le compteur est stocké en base : fiable même avec plusieurs instances.
 */
export async function consommerQuota(action: string, max: number, fenetreMinutes: number): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.rpc('consommer_quota', {
      p_action: action,
      p_max: max,
      p_fenetre_minutes: fenetreMinutes,
    });
    if (error) {
      console.error('[quota] erreur RPC consommer_quota:', error.message);
      return true; // ne pas bloquer un envoi légitime si le compteur est indisponible
    }
    return data !== false;
  } catch (e) {
    console.error('[quota] exception:', e);
    return true;
  }
}

export async function requireAuth() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }

  return { user, error: null };
}
