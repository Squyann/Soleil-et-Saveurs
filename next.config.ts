import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api-adresse.data.gouv.fr",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Par défaut, Turbopack exécute PostCSS (Tailwind) dans des processus
    // `node` enfants, résolus via le PATH. Sur le build Hostinger, ce processus
    // se termine avant que Turbopack ne s'y connecte et le build échoue
    // (« node process exited before we could connect to it »). Les worker
    // threads tournent dans le processus du build : plus aucun `node` lancé.
    turbopackPluginRuntimeStrategy: 'workerThreads',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
