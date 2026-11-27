import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { roleEquipe } from '@/lib/gestion/roles';

export async function middleware(request: NextRequest) {
  // Navigation interne de l'application de gestion (requêtes RSC, préchargements
  // compris) : pas d'aller-retour vers Supabase à chaque appui. La page a déjà
  // été contrôlée à son ouverture, l'appli suit la session côté téléphone, et
  // ces réponses ne contiennent aucune donnée (tout passe par la base, qui
  // vérifie chaque lecture et écriture).
  // (Next retire l'en-tête « RSC » avant le middleware ; « Next-Url » n'est
  // envoyé que par la navigation interne, jamais au chargement d'une page.)
  if (estPageGestionProtegee(request.nextUrl.pathname) && request.headers.has('next-url')) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    const response = NextResponse.redirect(
      new URL('/admin/login', request.url)
    );
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) response.cookies.delete(name);
    });
    const isAdminRoute =
      request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login');
    if (isAdminRoute) return response;
    if (estPageGestionProtegee(request.nextUrl.pathname)) {
      response.headers.set('Location', new URL('/gestion/connexion', request.url).toString());
      return response;
    }
    return NextResponse.next({ request });
  }

  const isAdminRoute =
    request.nextUrl.pathname.startsWith('/admin') &&
    !request.nextUrl.pathname.startsWith('/admin/login');

  if (isAdminRoute) {
    const isAdmin = user && user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }
  }

  // Application de gestion : réservée à l'équipe (administrateur, gérant,
  // préparateur). La base vérifie de nouveau chaque lecture et écriture.
  if (estPageGestionProtegee(request.nextUrl.pathname) && !roleEquipe(user?.app_metadata?.role)) {
    const connexion = request.nextUrl.clone();
    connexion.pathname = '/gestion/connexion';
    connexion.search = '';
    return NextResponse.redirect(connexion);
  }

  return supabaseResponse;
}

// Pages de /gestion accessibles sans être connecté : connexion, page hors
// connexion et service worker (qui doit pouvoir se mettre à jour).
function estPageGestionProtegee(chemin: string) {
  if (chemin !== '/gestion' && !chemin.startsWith('/gestion/')) return false;
  return !['/gestion/connexion', '/gestion/hors-ligne', '/gestion/sw.js'].includes(chemin);
}

export const config = {
  matcher: ['/admin/:path*', '/gestion', '/gestion/:path*'],
};
