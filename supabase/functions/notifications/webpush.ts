// Envoi de notifications Web Push, avec les seules fonctions cryptographiques
// standard (WebCrypto) : chiffrement « aes128gcm » (RFC 8291 / RFC 8188) et
// identification de l'expéditeur par VAPID (RFC 8292).

const te = new TextEncoder();

export function b64url(octets: Uint8Array): string {
  let s = '';
  for (const o of octets) s += String.fromCharCode(o);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(texte: string): Uint8Array {
  const b = texte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texte.length % 4)) % 4);
  const s = atob(b);
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

function concat(...parties: Uint8Array[]): Uint8Array {
  const o = new Uint8Array(parties.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parties) { o.set(p, i); i += p.length; }
  return o;
}

async function hmac(cle: Uint8Array, donnees: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', cle, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, donnees));
}

// HKDF (une seule itération suffit : longueurs ≤ 32 octets)
async function hkdf(sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, longueur: number) {
  const prk = await hmac(sel, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, longueur);
}

export type CleVapid = { publique: string; privee: JsonWebKey };

export async function creerClesVapid(): Promise<CleVapid> {
  const paire = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const brute = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey));
  return { publique: b64url(brute), privee: await crypto.subtle.exportKey('jwk', paire.privateKey) };
}

// Jeton VAPID (JWT ES256) pour le service de notification du navigateur
async function jetonVapid(audience: string, sujet: string, privee: JsonWebKey): Promise<string> {
  const entete = b64url(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const corps = b64url(te.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: sujet })));
  const cle = await crypto.subtle.importKey('jwk', privee, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, te.encode(`${entete}.${corps}`)));
  return `${entete}.${corps}.${b64url(signature)}`;
}

// Chiffre le message pour un abonnement (clés p256dh et auth du navigateur)
export async function chiffrer(message: Uint8Array, p256dh: string, auth: string, sel = crypto.getRandomValues(new Uint8Array(16)), ephemere?: CryptoKeyPair) {
  const uaPublique = deB64url(p256dh);
  const secretAuth = deB64url(auth);
  const paire = ephemere ?? (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublique = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey));
  const cleUa = await crypto.subtle.importKey('raw', uaPublique, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secretEcdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cleUa }, paire.privateKey, 256));

  const ikm = await hkdf(secretAuth, secretEcdh, concat(te.encode('WebPush: info\0'), uaPublique, asPublique), 32);
  const cek = await hkdf(sel, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sel, ikm, te.encode('Content-Encoding: nonce\0'), 12);

  const cleAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cleAes, concat(message, new Uint8Array([2]))));

  const tailleBloc = new Uint8Array(4);
  new DataView(tailleBloc.buffer).setUint32(0, 4096);
  return concat(sel, tailleBloc, new Uint8Array([asPublique.length]), asPublique, chiffre);
}

export type Abonnement = { endpoint: string; p256dh: string; auth: string };
export type ResultatEnvoi = { ok: boolean; statut: number; expire: boolean };

export async function envoyer(ab: Abonnement, contenu: unknown, vapid: CleVapid, sujet: string, options: { ttl?: number; urgence?: 'high' | 'normal'; sujetNotif?: string } = {}): Promise<ResultatEnvoi> {
  const url = new URL(ab.endpoint);
  if (url.protocol !== 'https:') return { ok: false, statut: 0, expire: true };
  const corps = await chiffrer(te.encode(JSON.stringify(contenu)), ab.p256dh, ab.auth);
  const jeton = await jetonVapid(url.origin, sujet, vapid.privee);
  const rep = await fetch(ab.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: String(options.ttl ?? 6 * 3600),
      Urgency: options.urgence ?? 'high',
      ...(options.sujetNotif ? { Topic: options.sujetNotif.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}),
      Authorization: `vapid t=${jeton}, k=${vapid.publique}`,
    },
    body: corps,
  });
  await rep.body?.cancel();
  return { ok: rep.status >= 200 && rep.status < 300, statut: rep.status, expire: rep.status === 404 || rep.status === 410 };
}
