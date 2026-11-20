'use client';
// Réglages des notifications et du verrouillage (page « Plus »)
import { useCallback, useEffect, useState } from 'react';
import { BellRing, Check } from 'lucide-react';
import {
  abonnementActuel, activerSurCetAppareil, desactiverSurCetAppareil, enregistrerPreferences, envoyerEssai, estIos, lirePreferences,
  listerAppareils, pushPossible, retirerAppareil, PREFERENCES_DEFAUT, type Appareil, type Preferences,
} from '@/lib/gestion/push';
import { activerBiometrie, biometrieActive, biometriePossible, definirCode, retirerBiometrie, retirerVerrou, verrouActif } from '@/lib/gestion/verrou';
import { useGestion } from './AppliGestion';
import { Carte } from './Elements';
import Feuille from './Feuille';

function Interrupteur({ on, libelle, detail, changer, desactive }: { on: boolean; libelle: string; detail?: string; changer: () => void; desactive?: boolean }) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 border-t border-[#F0E7DA] py-2 first:border-0">
      <span className="flex-1">
        <b className="block text-[14.5px]">{libelle}</b>
        {detail && <span className="text-[12px] text-olivier-gris">{detail}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={libelle}
        disabled={desactive}
        onClick={changer}
        className={`relative h-8 w-[52px] flex-none rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-olivier' : 'bg-[#C9BBAA]'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${on ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}

export function ReglagesNotifications() {
  const { session, peut, executer, enLigne, notifier, installation } = useGestion();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [actif, setActif] = useState<boolean | null>(null);
  const [appareils, setAppareils] = useState<Appareil[]>([]);
  const [moiEndpoint, setMoiEndpoint] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const possible = typeof window !== 'undefined' && pushPossible();
  const iosNonInstalle = typeof window !== 'undefined' && estIos() && !installation.installee;

  const charger = useCallback(async () => {
    const [p, a, ab] = await Promise.all([lirePreferences(), listerAppareils().catch(() => []), abonnementActuel().catch(() => null)]);
    setPrefs(p);
    setAppareils(a);
    setMoiEndpoint(ab?.endpoint ?? null);
    setActif(!!ab && a.some((x) => x.endpoint === ab.endpoint) && Notification.permission === 'granted');
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void charger(); }, 0);
    return () => clearTimeout(t);
  }, [charger]);

  async function activer() {
    setOccupe(true);
    const r = await executer('Activation des notifications', () => activerSurCetAppareil(), { reussite: 'Notifications activées sur ce téléphone' });
    setOccupe(false);
    if (r.ok) void charger();
  }
  async function desactiver() {
    setOccupe(true);
    const r = await executer('Désactivation des notifications', () => desactiverSurCetAppareil(), { reussite: 'Notifications désactivées sur ce téléphone' });
    setOccupe(false);
    if (r.ok) void charger();
  }
  async function essai() {
    setOccupe(true);
    const r = await executer('Notification d’essai', () => envoyerEssai());
    setOccupe(false);
    if (r.ok) notifier({ type: r.donnees.envoyes ? 'ok' : 'erreur', texte: r.donnees.envoyes ? 'Notification d’essai envoyée : elle doit apparaître dans quelques secondes.' : 'Aucun appareil n’a pu la recevoir. Réactivez les notifications.' });
  }
  async function basculer(cle: keyof Preferences) {
    if (!prefs || !session) return;
    const valeur = !prefs[cle];
    const r = await executer('Réglage des notifications', () => enregistrerPreferences({ [cle]: valeur }, session.user.id));
    // L'interrupteur ne bouge qu'une fois le réglage confirmé par la base
    if (r.ok && r.donnees[0]) setPrefs({ ...PREFERENCES_DEFAUT, ...r.donnees[0] });
  }
  async function retirer(a: Appareil) {
    const r = await executer('Retrait de l’appareil', () => retirerAppareil(a.id), { reussite: `${a.appareil ?? 'Appareil'} retiré` });
    if (r.ok) void charger();
  }

  return (
    <>
      <h2 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-olivier-gris">Notifications</h2>
      <Carte className="mb-3">
        {!possible ? (
          <p className="text-[14px] leading-relaxed">Ce navigateur ne permet pas les notifications. Ouvrez l’appli dans Chrome (Android) ou installez-la sur l’écran d’accueil (iPhone).</p>
        ) : iosNonInstalle ? (
          <p className="text-[14px] leading-relaxed">Sur iPhone, les notifications ne marchent qu’une fois l’appli <b>ajoutée à l’écran d’accueil</b> (iOS 16.4 ou plus récent) : Safari → Partager → Sur l’écran d’accueil, puis ouvrez-la depuis l’icône.</p>
        ) : actif ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[#E7EEDC] px-3 py-3">
            <Check className="h-5 w-5 flex-none" aria-hidden="true" />
            <span className="flex-1 text-[13.5px] leading-snug"><b>Activées sur ce téléphone</b></span>
            <button type="button" disabled={occupe || !enLigne} onClick={essai} className="min-h-[40px] rounded-xl bg-olivier px-3 text-[13px] font-bold text-lin disabled:opacity-40">Tester</button>
          </div>
        ) : (
          <button type="button" disabled={occupe || !enLigne || actif === null} onClick={activer} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">
            <BellRing className="h-5 w-5" aria-hidden="true" /> {occupe ? 'Activation…' : 'Activer sur ce téléphone'}
          </button>
        )}
        {typeof window !== 'undefined' && possible && Notification.permission === 'denied' && (
          <p className="mt-2 text-[12.5px] text-brique">Les notifications sont bloquées dans les réglages du téléphone pour ce site : autorisez-les, puis revenez ici.</p>
        )}
      </Carte>

      {prefs && (
        <Carte className="mb-3 !py-2">
          <p className="pt-2 text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Me prévenir pour</p>
          <Interrupteur on={prefs.nouvelle_commande} libelle="Nouvelle commande" changer={() => basculer('nouvelle_commande')} desactive={!enLigne} />
          <Interrupteur on={prefs.annulation} libelle="Commande annulée" detail="par un autre membre de l’équipe" changer={() => basculer('annulation')} desactive={!enLigne} />
          <Interrupteur on={prefs.non_confirmee} libelle="Commande à confirmer" detail="encore « Nouvelle » après 2 heures" changer={() => basculer('non_confirmee')} desactive={!enLigne} />
          <Interrupteur on={prefs.resume_soir} libelle="Résumé du soir" detail="à 19 h : les commandes du lendemain" changer={() => basculer('resume_soir')} desactive={!enLigne} />
          {peut('catalogue') && <Interrupteur on={prefs.stock_bas} libelle="Stock bas" detail="5 ou moins après une commande" changer={() => basculer('stock_bas')} desactive={!enLigne} />}
          <Interrupteur on={prefs.heures_calmes} libelle="Heures calmes de 22 h à 7 h" detail="sauf commande à livrer aujourd’hui ou demain" changer={() => basculer('heures_calmes')} desactive={!enLigne} />
        </Carte>
      )}

      {appareils.length > 0 && (
        <Carte className="mb-3 !py-2">
          <p className="pt-2 text-[12px] font-extrabold uppercase tracking-[0.07em] text-olivier-gris">Mes appareils</p>
          {appareils.map((a) => (
            <div key={a.id} className="flex min-h-[56px] items-center gap-3 border-t border-[#F0E7DA] py-2 first-of-type:border-0">
              <span className="flex-1">
                <b className="block text-[14.5px]">{a.endpoint === moiEndpoint ? 'Ce téléphone' : a.appareil || 'Appareil'}</b>
                <span className="text-[12px] text-olivier-gris">{a.endpoint === moiEndpoint ? `${a.appareil ?? ''} · ` : ''}ajouté le {new Date(a.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </span>
              <button type="button" disabled={!enLigne} onClick={() => (a.endpoint === moiEndpoint ? desactiver() : retirer(a))} className="min-h-[40px] px-2 text-[13px] font-bold text-brique disabled:opacity-40">Retirer</button>
            </div>
          ))}
        </Carte>
      )}
    </>
  );
}

export function ReglageVerrou() {
  const { notifier, verrouiller } = useGestion();
  const [actif, setActif] = useState(false);
  const [bio, setBio] = useState(false);
  const [bioPossible, setBioPossible] = useState(false);
  const [saisie, setSaisie] = useState<null | { etape: 1 | 2; premier: string; code: string }>(null);

  useEffect(() => {
    biometriePossible().then((p) => {
      setBioPossible(p);
      setActif(verrouActif());
      setBio(biometrieActive());
    });
  }, []);

  async function valider() {
    if (!saisie) return;
    if (!/^\d{4}$/.test(saisie.code)) return;
    if (saisie.etape === 1) { setSaisie({ etape: 2, premier: saisie.code, code: '' }); return; }
    if (saisie.code !== saisie.premier) { notifier({ type: 'erreur', texte: 'Les deux codes sont différents. Recommencez.' }); setSaisie({ etape: 1, premier: '', code: '' }); return; }
    await definirCode(saisie.code);
    setSaisie(null);
    setActif(true);
    notifier({ type: 'ok', texte: 'Verrouillage activé sur ce téléphone' });
  }

  async function basculerBio() {
    if (bio) { retirerBiometrie(); setBio(false); return; }
    try {
      await activerBiometrie();
      setBio(true);
      notifier({ type: 'ok', texte: 'Empreinte ou visage enregistré' });
    } catch {
      notifier({ type: 'erreur', texte: 'Empreinte non enregistrée. Le code reste utilisable.' });
    }
  }

  return (
    <>
      <h2 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-olivier-gris">Sécurité</h2>
      <Carte className="mb-3 !py-2">
        <Interrupteur
          on={actif}
          libelle="Verrouillage par code"
          detail="demandé à l’ouverture et après 2 min hors de l’appli"
          changer={() => { if (actif) { retirerVerrou(); setActif(false); setBio(false); notifier({ type: 'ok', texte: 'Verrouillage désactivé' }); } else setSaisie({ etape: 1, premier: '', code: '' }); }}
        />
        {actif && bioPossible && <Interrupteur on={bio} libelle="Empreinte ou visage" detail="en plus du code" changer={basculerBio} />}
        {actif && (
          <button type="button" onClick={verrouiller} className="min-h-[44px] w-full border-t border-[#F0E7DA] text-left text-[13.5px] font-bold text-brique">Verrouiller maintenant</button>
        )}
      </Carte>
      {saisie && (
        <Feuille titre={saisie.etape === 1 ? 'Choisissez un code à 4 chiffres' : 'Confirmez le code'} fermer={() => setSaisie(null)}>
          <div className="px-4">
            <input
              autoFocus
              inputMode="numeric"
              type="password"
              autoComplete="off"
              maxLength={4}
              aria-label="Code à 4 chiffres"
              value={saisie.code}
              onChange={(e) => setSaisie({ ...saisie, code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              className="w-full rounded-2xl border border-[#E3D6C4] bg-[#FBF6F0] px-4 py-3 text-center text-[28px] tracking-[0.6em] outline-none focus:border-olivier"
            />
            <button type="button" disabled={saisie.code.length !== 4} onClick={valider} className="mt-3 min-h-[52px] w-full rounded-2xl bg-olivier text-[15px] font-extrabold text-lin disabled:opacity-40">
              {saisie.etape === 1 ? 'Continuer' : 'Activer le verrouillage'}
            </button>
            <p className="mt-2 text-center text-[12px] text-olivier-gris">Code oublié : il suffira de vous reconnecter avec votre mot de passe.</p>
          </div>
        </Feuille>
      )}
    </>
  );
}
