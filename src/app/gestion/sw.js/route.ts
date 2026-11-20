// Service worker de l'application de gestion (portée /gestion : la page
// d'accueil /gestion comprise, d'où l'en-tête Service-Worker-Allowed).
//
// Servi par une route pour porter le numéro de version de la publication :
// à chaque mise en ligne, le contenu change, le téléphone télécharge la
// nouvelle version et la met en attente. Elle ne remplace l'ancienne que
// quand l'utilisateur appuie sur « Mettre à jour » (jamais pendant une saisie
// ou un enregistrement), ou au prochain démarrage de l'appli.
//
// Hors connexion : seules les pages de l'appli et les fichiers de Next.js sont
// gardés. Les données (Supabase) ne passent jamais par ce cache.

const VERSION = process.env.NEXT_PUBLIC_VERSION_GESTION ?? 'dev';

const SCRIPT = `'use strict';
const VERSION = ${JSON.stringify(VERSION)};
const CACHE = 'gestion-' + VERSION;
const HORS_LIGNE = '/gestion/hors-ligne';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([HORS_LIGNE, '/icon-192.png', '/badge-notification.png'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n.startsWith('gestion-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ACTIVER') self.skipWaiting();
  if (event.data && event.data.type === 'VERSION' && event.ports[0]) event.ports[0].postMessage(VERSION);
});

const pageDeLAppli = (url) => url.pathname === '/gestion' || (url.pathname.startsWith('/gestion/') && url.pathname !== '/gestion/sw.js');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers de Next.js : leur nom change à chaque version, on peut les garder
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.open(CACHE).then(async (c) => {
      const deja = await c.match(req);
      if (deja) return deja;
      const rep = await fetch(req);
      if (rep.ok) c.put(req, rep.clone());
      return rep;
    }));
    return;
  }

  // Pages : toujours le réseau d'abord, la dernière copie si hors connexion
  if (req.mode === 'navigate' && pageDeLAppli(url)) {
    event.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const rep = await fetch(req);
        if (rep.ok && !rep.redirected && url.pathname !== '/gestion/connexion') c.put(url.pathname, rep.clone());
        return rep;
      } catch {
        return (await c.match(url.pathname)) || (await c.match('/gestion')) || (await c.match(HORS_LIGNE)) || Response.error();
      }
    })());
  }
});

// Notifications (étape 4) : affichage et ouverture directe de la commande
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { titre: event.data ? event.data.text() : '' }; }
  const titre = d.titre || 'Soleil et Saveurs';
  event.waitUntil(self.registration.showNotification(titre, {
    body: d.texte || '',
    icon: '/icon-192.png',
    // Petite icône de la barre d'état (Android n'en garde que la silhouette) :
    // logo blanc sur fond transparent, sinon un carré blanc s'affiche
    badge: '/badge-notification.png',
    tag: d.cle || undefined,
    data: { url: typeof d.url === 'string' && d.url.startsWith('/gestion') ? d.url : '/gestion' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const cible = (event.notification.data && event.notification.data.url) || '/gestion';
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).pathname.startsWith('/gestion')) {
        await f.focus();
        f.postMessage({ type: 'OUVRIR', url: cible });
        return;
      }
    }
    await self.clients.openWindow(cible);
  })());
});
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'",
      'Service-Worker-Allowed': '/gestion',
    },
  });
}
