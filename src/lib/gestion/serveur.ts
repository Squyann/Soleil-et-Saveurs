// Routes serveur de l'application de gestion : identification de l'équipe.
//
// L'appli envoie son jeton de session (Authorization: Bearer) ; le serveur le
// vérifie auprès de Supabase et agit AVEC ce jeton. Les règles de la base
// (rôles, droits, statut attendu) s'appliquent donc exactement comme si le
// téléphone écrivait lui-même : la route n'a aucun droit de plus.

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { roleEquipe, type Role } from './roles';

export type Equipe = { supabase: SupabaseClient; user: User; role: Role };

export async function equipe(req: NextRequest): Promise<Equipe | NextResponse> {
  const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jeton || jeton.length > 4000) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(jeton);
  const role = roleEquipe(data.user?.app_metadata?.role);
  if (error || !data.user || !role) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return { supabase, user: data.user, role };
}
