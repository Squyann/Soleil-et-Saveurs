// Verrouillage de l'application sur ce téléphone (option des réglages) :
// code à 4 chiffres, et empreinte / visage si le téléphone le permet.
//
// C'est un verrou d'écran local : il empêche qu'une personne qui prend le
// téléphone ouvert accède à l'appli. La sécurité des données reste assurée
// par la session et les règles de la base. Le code n'est jamais stocké en
// clair (empreinte SHA-256 salée). 5 codes faux : déconnexion.

const CLE = 'gestion:verrou';
export const ESSAIS_MAX = 5;

type Config = { sel: string; empreinte: string; biometrie?: string; essais?: number };

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function lire(): Config | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null');
    return v?.sel && v?.empreinte ? v : null;
  } catch {
    return null;
  }
}
function ecrire(c: Config | null) {
  try {
    if (c) localStorage.setItem(CLE, JSON.stringify(c));
    else localStorage.removeItem(CLE);
  } catch {}
}

async function empreinte(sel: string, code: string) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sel}:${code}`)));
}

export const verrouActif = () => !!lire();
export const biometrieActive = () => !!lire()?.biometrie;

export async function definirCode(code: string) {
  if (!/^\d{4}$/.test(code)) throw new Error('Le code doit faire 4 chiffres');
  const sel = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  ecrire({ sel, empreinte: await empreinte(sel, code), biometrie: lire()?.biometrie, essais: 0 });
}

export function retirerVerrou() {
  ecrire(null);
}

// Renvoie true si le code est bon ; le nombre d'essais restants sinon
export async function verifierCode(code: string): Promise<true | number> {
  const c = lire();
  if (!c) return true;
  if ((await empreinte(c.sel, code)) === c.empreinte) {
    ecrire({ ...c, essais: 0 });
    return true;
  }
  const essais = (c.essais ?? 0) + 1;
  ecrire({ ...c, essais });
  return Math.max(0, ESSAIS_MAX - essais);
}

export async function biometriePossible() {
  try {
    return typeof PublicKeyCredential !== 'undefined' && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

// Enregistre l'empreinte / le visage du téléphone (le code reste en secours)
export async function activerBiometrie() {
  const c = lire();
  if (!c) throw new Error('Créez d’abord un code');
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Soleil et Saveurs · Gestion', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'gestion', displayName: 'Application de gestion' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Empreinte non enregistrée');
  ecrire({ ...c, biometrie: b64(cred.rawId) });
}

export function retirerBiometrie() {
  const c = lire();
  if (c) ecrire({ ...c, biometrie: undefined });
}

export async function deverrouillerBiometrie() {
  const c = lire();
  if (!c?.biometrie) return false;
  try {
    const r = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: deB64(c.biometrie) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    if (r) ecrire({ ...c, essais: 0 });
    return !!r;
  } catch {
    return false;
  }
}
