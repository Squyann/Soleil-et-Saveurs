import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Client Supabase côté serveur (pages Server Components), avec la session du
// visiteur lue dans ses cookies : les règles d'accès de la base s'appliquent
// comme dans le navigateur (un admin connecté voit aussi les brouillons).
export async function supabaseServeur() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Impossible d'écrire des cookies pendant le rendu d'une page : le
          // middleware se charge déjà de rafraîchir la session.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}
