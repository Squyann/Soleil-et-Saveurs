import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rate limiting : in-memory par IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_API = 60;
const RATE_LIMIT_NOTIFY = 10;

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= max) return false;
  record.count++;
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getIp(request);

  // --- RATE LIMITING ---
  if (pathname.startsWith('/api/')) {
    const isNotify = pathname.startsWith('/api/notify-');
    const limit = isNotify ? RATE_LIMIT_NOTIFY : RATE_LIMIT_API;
    const key = `${ip}:${isNotify ? 'notify' : 'api'}`;

    if (!checkRateLimit(key, limit)) {
      return NextResponse.json(
        { error: 'Trop de requêtes, veuillez réessayer dans une minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // --- CSRF : vérifier l'origine sur les mutations ---
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    // On ne bloque que si on connaît l'URL du site ET que l'origine ne correspond pas
    if (origin && siteUrl && !origin.startsWith(siteUrl) && !origin.startsWith('http://localhost')) {
      return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
    }
  }

  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /compte
  if (pathname.startsWith('/compte') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect /admin (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/compte/:path*', '/admin/:path*', '/api/:path*'],
}
