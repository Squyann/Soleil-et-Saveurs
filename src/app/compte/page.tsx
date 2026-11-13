'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Phone, MapPin, LogOut, ArrowRight,
  ShoppingBag, Package, CheckCircle2, Clock, XCircle, Check,
  Loader2, Edit3, Save, X, ChevronRight, Star, Truck,
  AlertCircle, Gift, Copy, Shield, Trash2, AlertTriangle, FileText,
  KeyRound, Lock, Eye, EyeOff
} from 'lucide-react';
import { formatPrix } from '@/lib/format';
import { htmlDocument, imprimerDocument, type FactureEmise } from '@/lib/facture';

// --- TYPES ---
interface Order {
  id: string;
  created_at: string;
  total: number;
  // Ajout de 'statut' car c'est le nom dans ta DB Supabase
  statut: string; 
  status: 'en_attente' | 'confirmee' | 'livrée' | 'annulee';
  // Ajout de la colonne texte pour la liste des fruits
  description_commande: string;
  items: { name: string; quantite: number; price: number }[];
  adresse_livraison: string;
  methode_paiement: string;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  email: string;
}

interface DBProfile {
  loyalty_points: number;
  referral_code: string;
  has_referral_discount: boolean;
}

// --- CONFIG STATUTS ---
const STATUS_CONFIG = {
  en_attente: { label: 'En attente', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  confirmee:  { label: 'Confirmée',  icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  livree:     { label: 'livrée',     icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' },
  annulee:    { label: 'Annulée',    icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
};

export default function ComptePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [factures, setFactures] = useState<Record<number, FactureEmise>>({});
  const [activeTab, setActiveTab] = useState<'profil' | 'commandes' | 'adresses'>('profil');

  // Lien direct depuis les e-mails : /compte?onglet=commandes
  useEffect(() => {
    const onglet = new URLSearchParams(window.location.search).get('onglet');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (onglet === 'commandes' || onglet === 'adresses') setActiveTab(onglet);
  }, []);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [dbProfile, setDbProfile] = useState<DBProfile | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const router = useRouter();

  // --- INIT ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      const meta = user.user_metadata || {};
      const p: UserProfile = {
        first_name: meta.first_name || '',
        last_name:  meta.last_name  || '',
        phone:      meta.phone      || '',
        address:    meta.address    || '',
        email:      user.email      || '',
      };
      setProfile(p);
      setEditForm(p);
      setLoading(false);
      fetchOrders(user.id);
      loadDBProfile(user.id);
      processReferral(user);
      fetch('/api/is-admin').then(r => r.json()).then(d => setIsAdmin(d.isAdmin === true));
    };
    init();
  }, [router]);

  // --- PROFIL DB ---
  const loadDBProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('loyalty_points, referral_code, has_referral_discount')
      .eq('user_id', userId)
      .single();
    if (data) setDbProfile(data as DBProfile);
  };

  const processReferral = async (currentUser: any) => {
    const meta = currentUser.user_metadata || {};
    if (!meta.referral_code_used || meta.referral_processed === true) return;

    const { data: success } = await supabase.rpc('process_referral_for_self', {
      p_referral_code: meta.referral_code_used,
    });

    if (success) {
      await supabase.auth.updateUser({ data: { referral_processed: true } });
      // Le bon du parrainé est en attente : il s'activera après sa première commande
      // (activation faite côté serveur dans process_referral_for_self)
      await loadDBProfile(currentUser.id);
    }
  };

  // --- COMMANDES SUPABASE ---
  const fetchOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) setOrders(data as Order[]);

      // Factures émises pour ces commandes (une par commande livrée)
      const { data: emises } = await supabase.from('factures').select('*').eq('user_id', userId);
      if (emises) setFactures(Object.fromEntries((emises as FactureEmise[]).map((f) => [f.commande_id, f])));
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  // --- MISE À JOUR PROFIL ---
  const handleSave = async () => {
    setSaveLoading(true);
    setSaveError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: editForm.first_name,
          last_name:  editForm.last_name,
          full_name:  `${editForm.first_name} ${editForm.last_name}`,
          phone:      editForm.phone,
          address:    editForm.address,
        },
      });
      if (error) throw error;
      setProfile({ ...profile!, ...editForm as UserProfile });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaveLoading(false);
    }
  };

  // --- AUTOCOMPLÉTION ADRESSE ---
  const handleAddressInput = async (val: string) => {
    setEditForm(f => ({ ...f, address: val }));
    if (val.length > 5) {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=4`);
        const data = await res.json();
        setAddressSuggestions(data.features || []);
      } catch { setAddressSuggestions([]); }
    } else {
      setAddressSuggestions([]);
    }
  };

  // --- DÉCONNEXION ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // --- MODIFICATION DU MOT DE PASSE ---
  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(false); }, 1800);
    } catch (err: any) {
      setPasswordError(err.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  // --- SUPPRESSION DU COMPTE ---
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.rpc('supprimer_mon_compte');
      if (error) throw error;
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Erreur lors de la suppression du compte');
      setDeleteLoading(false);
    }
  };

  // --- FACTURE ---
  // Le numéro, la date et les montants viennent de la facture émise par la
  // base à la livraison (table « factures »), jamais d'un calcul du site.
  const imprimerFacture = (order: any) => {
    imprimerDocument(htmlDocument(
      { ...order, email_client: order.email_client || profile?.email },
      factures[order.id] ?? null,
      'récapitulatif de commande',
    ));
  };

  // --- FORMATAGE ---
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const totalDepense = orders
    .filter(o => !o.statut?.toLowerCase().includes('annul'))
    .reduce((acc, o) => acc + (o.total || 0), 0);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#EDE3D5] flex items-center justify-center" role="status" aria-label="Chargement de votre compte">
        <Loader2 className="w-9 h-9 text-[#FF4500] animate-spin" aria-hidden />
      </div>
    );
  }

  const commanderANouveau = (contenu: any) => {
    if (!contenu || !Array.isArray(contenu)) {
      alert("Impossible de récupérer les articles de cette commande.");
      return;
    }
    try {
      const panierLocal = localStorage.getItem('mon-panier');
      const panierActuel = panierLocal ? JSON.parse(panierLocal) : [];
      const nouveauPanier = [...panierActuel, ...contenu];
      localStorage.setItem('mon-panier', JSON.stringify(nouveauPanier));
      // Met à jour le badge immédiatement (même onglet)
      window.dispatchEvent(new Event('panier-updated'));
      // Navigation sans rechargement complet — préserve la session
      router.push('/commander');
    } catch (error) {
      console.error("Erreur panier:", error);
      alert("Une erreur est survenue lors de l'ajout au panier.");
    }
  };

  const points = dbProfile?.loyalty_points ?? 0;
  const SURTITRE = 'text-[11px] md:text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]';
  const carte = 'bg-white rounded-3xl md:rounded-[28px] border border-[#E8DCCB]';
  const etiquette = 'block mb-1.5 text-[13px] font-bold text-[#6F5A4B]';
  const champ = 'w-full h-[52px] px-4 rounded-[14px] border-[1.5px] border-[#E0D3C0] bg-white text-base font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium outline-none focus:border-[#FF4500] transition-colors';
  const valeur = 'px-[18px] py-4 rounded-2xl bg-[#F5EAE0]';
  const boutonContour = 'inline-flex items-center justify-center gap-2 h-[46px] px-[18px] rounded-full border-[1.5px] border-[#3D2B1F] bg-white text-sm font-bold text-[#3D2B1F] hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors';
  const ligneAction = 'w-full min-h-[68px] px-[18px] py-3 flex items-center gap-3.5 text-left border-t border-[#F0E7DA] first:border-t-0 hover:bg-[#FFFBF7] transition-colors';
  // Boutons « annuler / sauver » du mode édition (profil et adresse)
  const boutonsEdition = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => { setIsEditing(false); setEditForm(profile!); setAddressSuggestions([]); }}
        aria-label="Annuler les modifications"
        className="w-[46px] h-[46px] rounded-full border-[1.5px] border-[#DDD0BF] bg-white text-[#5C4030] flex items-center justify-center hover:border-[#3D2B1F] transition-colors"
      >
        <X className="w-[18px] h-[18px]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saveLoading}
        className="inline-flex items-center justify-center gap-2 h-[46px] px-5 rounded-full bg-[#FF4500] text-white text-sm font-extrabold hover:bg-[#E63E00] transition-colors disabled:opacity-70"
      >
        {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Save className="w-4 h-4" aria-hidden />}
        Sauver
      </button>
    </div>
  );
  const STATUTS = {
    en_attente: 'bg-[#FFF1EA] text-[#B83200]',
    confirmee: 'bg-[#FFF1EA] text-[#B83200]',
    livree: 'bg-[#ECF7EF] text-[#166534]',
    annulee: 'bg-red-50 text-red-700',
  };

  return (
    <div className="min-h-screen bg-[#EDE3D5] text-[#3D2B1F] pb-10">

      {/* EN-TÊTE */}
      <header className="bg-[#F5EAE0] border-b border-[#E3D6C4]">
        <div className="max-w-[1240px] mx-auto px-4 md:px-5 pt-[22px] md:pt-9">
          <div className="flex items-center justify-between gap-x-8 gap-y-[18px] flex-wrap">
            <div className="flex items-center gap-3.5 md:gap-[22px] min-w-0 px-1 md:px-0">
              {/* AVATAR */}
              <span aria-hidden className="titre shrink-0 w-[60px] h-[60px] md:w-[92px] md:h-[92px] rounded-full bg-[#FF4500] text-white flex items-center justify-center text-3xl md:text-[44px] leading-none uppercase">
                {profile?.first_name?.[0] || profile?.last_name?.[0] || '?'}
              </span>
              <div className="min-w-0">
                <p className={`${SURTITRE} mb-1 md:mb-1.5`}>Mon Compte</p>
                <h1 className="titre text-3xl md:text-[52px] leading-[1.05] md:leading-none break-words">
                  {profile?.first_name} {profile?.last_name}
                </h1>
                <p className="mt-1 md:mt-2 text-sm md:text-base text-[#5C4030] break-all">{profile?.email}</p>
              </div>
            </div>

            {/* STATS RAPIDES */}
            <dl className="w-full md:w-auto grid grid-cols-3 divide-x divide-[#F0E7DA] bg-white rounded-[20px] md:rounded-3xl border border-[#E8DCCB] overflow-hidden text-center md:text-left">
              {[
                { valeur: orders.length, libelle: 'Commandes' },
                { valeur: `${totalDepense.toFixed(0)}€`, libelle: 'Dépensé' },
                { valeur: orders.filter(o => o.statut?.toLowerCase().includes('livr')).length, libelle: 'Livrées' },
              ].map(s => (
                <div key={s.libelle} className="px-1.5 py-3.5 md:px-[30px] md:py-5 flex flex-col-reverse">
                  <dt className="mt-1.5 md:mt-2 text-[11px] md:text-xs font-extrabold uppercase tracking-[0.08em] md:tracking-[0.12em] text-[#5C4030]">{s.libelle}</dt>
                  <dd className="titre text-[26px] md:text-[38px] leading-none text-[#FF4500]">{s.valeur}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ONGLETS */}
          <div role="tablist" aria-label="Sections du compte" className="mt-4 md:mt-[30px] grid grid-cols-3 md:flex gap-1 md:gap-1.5 p-1 md:p-0 rounded-t-2xl bg-[#EDE3D5] md:bg-transparent">
            {([
              { id: 'profil',     label: 'Mon Profil',  icon: User },
              { id: 'commandes', label: 'Commandes',   icon: ShoppingBag },
              { id: 'adresses',  label: 'Adresses',    icon: MapPin },
            ] as const).map(({ id, label, icon: Icon }) => {
              const actif = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center justify-center gap-2 h-11 md:h-[52px] md:px-[22px] rounded-xl md:rounded-b-none md:rounded-t-2xl text-[13.5px] md:text-[15px] transition-colors ${
                    actif
                      ? 'bg-[#3D2B1F] text-[#F5EAE0] font-extrabold md:bg-[#EDE3D5] md:text-[#3D2B1F] md:shadow-[inset_0_3px_0_#FF4500]'
                      : 'text-[#5C4030] font-bold hover:text-[#3D2B1F] md:hover:bg-[#EDE3D5]/60'
                  }`}
                >
                  <Icon className="hidden md:block w-[18px] h-[18px]" aria-hidden />
                  {label}
                  {id === 'commandes' && orders.length > 0 && (
                    <span className="hidden md:inline-flex min-w-[22px] h-[22px] px-1.5 rounded-full bg-white border border-[#E0D3C0] text-xs font-extrabold text-[#3D2B1F] items-center justify-center">{orders.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-[1240px] mx-auto px-3 md:px-5 pt-3.5 md:pt-8">

        {/* ===== ONGLET : PROFIL ===== */}
        {activeTab === 'profil' && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-3.5 md:gap-7 items-start">

            {/* INFOS PERSONNELLES */}
            <section className={`${carte} p-5 md:p-8`}>
              <div className="flex items-center justify-between gap-4 mb-5 md:mb-[26px]">
                <h2 className="titre text-[28px] md:text-[32px] leading-none">Informations</h2>
                {!isEditing ? (
                  <button type="button" onClick={() => { setIsEditing(true); setSaveError(null); }} className={boutonContour}>
                    <Edit3 className="w-4 h-4" aria-hidden /> Modifier
                  </button>
                ) : boutonsEdition}
              </div>

              {saveSuccess && (
                <p role="status" className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-[#ECF7EF] text-sm font-bold text-[#166534]">
                  <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} aria-hidden />Profil mis à jour !
                </p>
              )}
              {saveError && (
                <p role="alert" className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-sm font-bold text-red-700">
                  <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />{saveError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {/* NOM / PRÉNOM */}
                {isEditing ? (
                  <>
                    <div>
                      <label htmlFor="compte-nom" className={etiquette}>Nom</label>
                      <input id="compte-nom" type="text" autoComplete="family-name" maxLength={80} value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} className={champ} />
                    </div>
                    <div>
                      <label htmlFor="compte-prenom" className={etiquette}>Prénom</label>
                      <input id="compte-prenom" type="text" autoComplete="given-name" maxLength={80} value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} className={champ} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={valeur}><p className="text-[13px] font-bold text-[#6F5A4B]">Nom</p><p className="mt-1 text-[17px] md:text-lg font-bold break-words">{profile?.last_name || '—'}</p></div>
                    <div className={valeur}><p className="text-[13px] font-bold text-[#6F5A4B]">Prénom</p><p className="mt-1 text-[17px] md:text-lg font-bold break-words">{profile?.first_name || '—'}</p></div>
                  </>
                )}

                {/* EMAIL (lecture seule) */}
                <div className={`${valeur} col-span-2`}>
                  <p className="flex items-center justify-between gap-3 text-[13px] font-bold text-[#6F5A4B]">
                    <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" aria-hidden />Email</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-bold">Non modifiable</span>
                  </p>
                  <p className="mt-1 text-[17px] md:text-lg font-bold break-all">{profile?.email}</p>
                </div>

                {/* TÉLÉPHONE */}
                {isEditing ? (
                  <div className="col-span-2">
                    <label htmlFor="compte-telephone" className={etiquette}>Téléphone</label>
                    <input id="compte-telephone" type="tel" autoComplete="tel" maxLength={20} value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="06XXXXXXXX" className={champ} />
                  </div>
                ) : (
                  <div className={`${valeur} col-span-2`}>
                    <p className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#6F5A4B]"><Phone className="w-3.5 h-3.5" aria-hidden />Téléphone</p>
                    <p className="mt-1 text-[17px] md:text-lg font-bold">{profile?.phone || '—'}</p>
                  </div>
                )}
              </div>
            </section>

            {/* FIDÉLITÉ + PARRAINAGE + ACTIONS */}
            <div className="flex flex-col gap-3.5 md:gap-5">

              {/* CARTE FIDÉLITÉ */}
              <section className="relative overflow-hidden bg-[#3D2B1F] rounded-3xl md:rounded-[28px] p-6 md:p-7 text-[#F5EAE0]">
                <svg viewBox="0 0 600 600" aria-hidden className="ss-rayons absolute -right-[110px] -top-[130px] w-[260px] h-[260px] pointer-events-none">
                  <circle cx="300" cy="300" r="100" fill="#FF4500" fillOpacity="0.9" />
                  <circle cx="300" cy="300" r="226" fill="none" stroke="#FF4500" strokeOpacity="0.7" strokeWidth="110" strokeDasharray="12 47.2" />
                </svg>
                <p className="relative mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF9466]"><Star className="w-4 h-4" aria-hidden />Fidélité</p>
                <p className="relative mb-4 flex items-baseline gap-2.5">
                  <span className="titre text-[60px] leading-none">{points}</span>
                  <span className="text-[17px] font-semibold text-[#E1D2C2]">/ 100 pts</span>
                </p>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(points, 100)} aria-label="Points de fidélité" className="relative h-2.5 rounded-full bg-[#5C4030] overflow-hidden">
                  <div className="h-full rounded-full bg-[#FF7A47] transition-[width] duration-700 ease-out" style={{ width: `${Math.min((points / 100) * 100, 100)}%` }} />
                </div>
                <p className="relative mt-3.5 text-[15px] font-semibold text-[#E1D2C2]">
                  {points >= 100 ? (
                    <span className="inline-flex items-center gap-2 font-extrabold text-[#86EFAC]"><Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} aria-hidden />Remise -10% disponible — activez-la dans le panier</span>
                  ) : (
                    <>{100 - points} pts avant votre remise de -10%</>
                  )}
                </p>
              </section>

              {/* CARTE PARRAINAGE */}
              <section className={`${carte} p-6 md:p-7`}>
                <p className={`${SURTITRE} mb-2 inline-flex items-center gap-2`}><Gift className="w-4 h-4" aria-hidden />Parrainage</p>
                <p className="mb-4 text-[15px] md:text-base leading-normal text-[#5C4030]">Partagez votre code — vous gagnez tous les deux -10%</p>
                <div className="flex items-center gap-2.5">
                  <p className="flex-1 min-w-0 h-[54px] px-[18px] rounded-[15px] border-[1.5px] border-dashed border-[#C73600] flex items-center text-lg md:text-xl font-extrabold tracking-[0.14em] text-[#C73600] truncate">{dbProfile?.referral_code ?? '—'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (dbProfile?.referral_code) {
                        navigator.clipboard.writeText(dbProfile.referral_code);
                        setReferralCopied(true);
                        setTimeout(() => setReferralCopied(false), 2000);
                      }
                    }}
                    className={`shrink-0 inline-flex items-center gap-2 h-[54px] px-5 rounded-[15px] text-[15px] font-bold text-[#F5EAE0] transition-colors ${referralCopied ? 'bg-[#166534]' : 'bg-[#3D2B1F] hover:bg-[#FF4500]'}`}
                  >
                    {referralCopied ? <Check className="w-[17px] h-[17px]" strokeWidth={2.6} aria-hidden /> : <Copy className="w-[17px] h-[17px]" aria-hidden />}
                    <span aria-live="polite">{referralCopied ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                {dbProfile?.has_referral_discount && (
                  <p className="mt-3.5 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-[#ECF7EF] text-sm font-bold text-[#166534]">
                    <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} aria-hidden />
                    Remise parrainage -10% dispo — activez-la dans le panier
                  </p>
                )}
              </section>

              {/* ACTIONS DU COMPTE */}
              <section className={`${carte} overflow-hidden`}>
                {/* PANEL ADMIN */}
                {isAdmin && (
                  <Link href="/admin" className={ligneAction}>
                    <span className="shrink-0 w-11 h-11 rounded-[14px] bg-[#3D2B1F] text-[#F5EAE0] flex items-center justify-center" aria-hidden><Shield className="w-5 h-5" /></span>
                    <span className="flex-1"><strong className="block text-base font-extrabold">Panel Admin</strong><span className="block text-sm text-[#6F5A4B]">Accès au tableau de bord</span></span>
                    <ChevronRight className="w-[18px] h-[18px] text-[#6F5A4B]" aria-hidden />
                  </Link>
                )}
                {/* MODIFIER LE MOT DE PASSE */}
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(true); setPasswordError(null); setPasswordSuccess(false); setNewPassword(''); setConfirmPassword(''); setShowNewPassword(false); }}
                  className={ligneAction}
                >
                  <span className="shrink-0 w-11 h-11 rounded-[14px] bg-[#FFF1EA] text-[#FF4500] flex items-center justify-center" aria-hidden><KeyRound className="w-5 h-5" /></span>
                  <span className="flex-1"><strong className="block text-base font-extrabold">Modifier le mot de passe</strong><span className="block text-sm text-[#6F5A4B]">Sécurisez votre compte</span></span>
                  <ChevronRight className="w-[18px] h-[18px] text-[#6F5A4B]" aria-hidden />
                </button>
                {/* DÉCONNEXION */}
                <button type="button" onClick={handleLogout} className={ligneAction}>
                  <span className="shrink-0 w-11 h-11 rounded-[14px] bg-[#F5EAE0] text-[#3D2B1F] flex items-center justify-center" aria-hidden><LogOut className="w-5 h-5" /></span>
                  <span className="flex-1"><strong className="block text-base font-extrabold">Se déconnecter</strong><span className="block text-sm text-[#6F5A4B]">Fermer la session</span></span>
                  <ChevronRight className="w-[18px] h-[18px] text-[#6F5A4B]" aria-hidden />
                </button>
                {/* SUPPRESSION DU COMPTE */}
                <button type="button" onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }} className={ligneAction}>
                  <span className="shrink-0 w-11 h-11 rounded-[14px] bg-red-50 text-red-700 flex items-center justify-center" aria-hidden><Trash2 className="w-5 h-5" /></span>
                  <span className="flex-1"><strong className="block text-base font-extrabold text-red-700">Supprimer mon compte</strong><span className="block text-sm text-[#6F5A4B]">Action définitive et irréversible</span></span>
                  <ChevronRight className="w-[18px] h-[18px] text-[#6F5A4B]" aria-hidden />
                </button>
              </section>
            </div>
          </div>
        )}

        {/* ===== ONGLET : COMMANDES ===== */}
        {activeTab === 'commandes' && (
          <div className="grid lg:grid-cols-2 gap-3 md:gap-6 items-start">
            {ordersLoading ? (
              <div className="lg:col-span-2 flex justify-center py-20" role="status" aria-label="Chargement des commandes">
                <Loader2 className="w-9 h-9 text-[#FF4500] animate-spin" aria-hidden />
              </div>
            ) : orders.length === 0 ? (
              <div className={`${carte} lg:col-span-2 px-5 py-14 flex flex-col items-center text-center`}>
                <span className="w-20 h-20 rounded-full bg-[#F5EAE0] text-[#C9BBAA] flex items-center justify-center mb-4"><Package className="w-9 h-9" aria-hidden /></span>
                <p className="titre text-2xl mb-5">Aucune commande pour l&apos;instant</p>
                <Link href="/commander" className="group inline-flex items-center gap-3 min-h-14 px-7 rounded-[18px] bg-[#FF4500] text-white text-[17px] font-extrabold hover:bg-[#E63E00] transition-colors">
                  Voir la récolte du jour <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                // Gestion du statut (Français vs Anglais et formatage pour config)
                const currentStatus = (order.statut || 'en_attente')
                  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
                const statusKey = currentStatus.includes('attente') ? 'en_attente' :
                                currentStatus.includes('confirme') ? 'confirmee' :
                                currentStatus.includes('livre') ? 'livree' :
                                currentStatus.includes('annule') ? 'annulee' : 'en_attente';
                const statusCfg = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.en_attente;
                const StatusIcon = statusCfg.icon;
                const etapeCourante = statusKey === 'en_attente' ? 0 : statusKey === 'confirmee' ? 1 : 2;

                return (
                  <article key={order.id} className={`${carte} overflow-hidden`}>
                    <div className="px-[18px] pt-[18px] pb-4 md:px-6 md:pt-6">
                      <div className="flex items-start justify-between gap-2.5">
                        <div>
                          <h2 className="text-[17px] md:text-lg font-extrabold">Commande #{String(order.id).slice(-6).toUpperCase()}</h2>
                          <p className="mt-0.5 text-[13px] md:text-sm font-semibold text-[#6F5A4B]">{formatDate(order.created_at)}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1.5 px-[11px] py-1.5 rounded-full text-[12.5px] font-extrabold first-letter:uppercase ${STATUTS[statusKey as keyof typeof STATUTS]}`}>
                          <StatusIcon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden />
                          <span className="first-letter:uppercase">{order.statut || statusCfg.label}</span>
                        </span>
                      </div>
                      {/* ARTICLES (via description_commande) */}
                      <p className="mt-3.5 px-3.5 py-3 rounded-[14px] bg-[#F5EAE0] text-sm leading-normal text-[#5C4030] whitespace-pre-line">
                        {order.description_commande || "Détail indisponible"}
                      </p>
                    </div>

                    {/* SUIVI */}
                    {!statusKey.includes('annule') && (
                      <div className="px-[18px] pb-[18px] md:px-6">
                        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#C73600]">Suivi de commande</p>
                        <ol className="flex items-start">
                          {(['Reçue', 'En prépa', 'Livrée'] as const).map((libelle, idx) => {
                            const faite = idx <= etapeCourante;
                            return (
                              <React.Fragment key={libelle}>
                                {idx > 0 && <li aria-hidden className={`flex-1 h-[3px] mt-[15px] rounded-full ${faite ? 'bg-[#166534]' : 'bg-[#E3D6C4]'}`} />}
                                <li aria-current={idx === etapeCourante ? 'step' : undefined} className={`shrink-0 w-16 flex flex-col items-center gap-1.5 text-[12.5px] ${faite ? 'font-extrabold text-[#166534]' : 'font-bold text-[#6F5A4B]'}`}>
                                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold ${faite ? 'bg-[#166534] text-white' : 'bg-white border-2 border-[#DDD0BF]'}`}>
                                    {faite ? <Check className="w-4 h-4" strokeWidth={3} aria-hidden /> : idx + 1}
                                  </span>
                                  {libelle}
                                </li>
                              </React.Fragment>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    {/* ADRESSE */}
                    {order.adresse_livraison && (
                      <p className="px-[18px] md:px-6 py-3 border-t border-[#F0E7DA] flex items-center gap-2 text-[13.5px] font-semibold text-[#5C4030]">
                        <MapPin className="w-4 h-4 shrink-0 text-[#C73600]" aria-hidden />
                        {order.adresse_livraison}
                      </p>
                    )}

                    {/* TOTAL, FACTURE ET COMMANDER À NOUVEAU */}
                    {/* La facture n'est accessible qu'une fois la commande livrée. */}
                    <div className="px-[18px] md:px-6 pt-3.5 pb-[18px] md:pb-6 border-t border-[#F0E7DA] flex flex-col gap-3">
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-[#6F5A4B]">Total</span>
                        <strong className="text-2xl font-black tracking-tight tabular-nums">{formatPrix(order.total || 0)}</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {statusKey === 'livree' ? (
                          <button type="button" onClick={() => imprimerFacture(order)} className="inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl border-[1.5px] border-[#3D2B1F] bg-white text-[15px] font-extrabold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">
                            <FileText className="w-[17px] h-[17px]" aria-hidden />
                            Facture
                          </button>
                        ) : (
                          <p title="Disponible après la livraison" className="inline-flex items-center justify-center gap-2 min-h-[52px] px-2 rounded-2xl border-[1.5px] border-dashed border-[#C9BBAA] text-[13px] leading-tight font-bold text-[#5C4030] text-center">
                            <FileText className="w-4 h-4 shrink-0" aria-hidden />
                            Facture après livraison
                          </p>
                        )}
                        <button type="button" onClick={() => commanderANouveau((order as any).contenu_panier)} className="inline-flex items-center justify-center gap-2 min-h-[52px] px-2 rounded-2xl bg-[#3D2B1F] text-[#F5EAE0] text-[14.5px] leading-tight font-extrabold hover:bg-[#FF4500] transition-colors">
                          <ShoppingBag className="hidden sm:block w-[17px] h-[17px] shrink-0" aria-hidden />
                          Commander à nouveau
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* ===== ONGLET : ADRESSES ===== */}
        {activeTab === 'adresses' && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-3.5 md:gap-7 items-start">

            {/* ADRESSE PRINCIPALE */}
            <section className={`${carte} p-5 md:p-8`}>
              <div className="flex items-start justify-between gap-4 mb-5 md:mb-[26px]">
                <div>
                  <h2 className="titre text-[28px] md:text-[32px] leading-none">Adresse principale</h2>
                  <p className="mt-2 text-sm md:text-[15px] text-[#5C4030]">Utilisée pour vos livraisons</p>
                </div>
                {!isEditing ? (
                  <button type="button" onClick={() => setIsEditing(true)} className={boutonContour}>
                    <Edit3 className="w-4 h-4" aria-hidden /> Modifier
                  </button>
                ) : boutonsEdition}
              </div>

              {saveSuccess && (
                <p role="status" className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-[#ECF7EF] text-sm font-bold text-[#166534]">
                  <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.6} aria-hidden />Profil mis à jour !
                </p>
              )}
              {saveError && (
                <p role="alert" className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-sm font-bold text-red-700">
                  <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />{saveError}
                </p>
              )}

              {isEditing ? (
                <div className="relative">
                  <label htmlFor="compte-adresse" className={etiquette}>Adresse (Yvelines 78)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#6F5A4B] pointer-events-none" aria-hidden />
                    <input id="compte-adresse" type="text" autoComplete="off" maxLength={200} value={editForm.address || ''} onChange={e => handleAddressInput(e.target.value)} placeholder="Tapez votre adresse..." className={`${champ} pl-[46px]`} />
                  </div>
                  {addressSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1.5 bg-white border border-[#E0D3C0] rounded-2xl shadow-2xl overflow-hidden">
                      {addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setEditForm(f => ({ ...f, address: s.properties.label })); setAddressSuggestions([]); }}
                          className="w-full min-h-12 px-4 py-2.5 flex items-center gap-2.5 text-left text-sm font-semibold border-b border-[#F0E7DA] last:border-b-0 hover:bg-[#F5EAE0] transition-colors"
                        >
                          <MapPin className="w-4 h-4 shrink-0 text-[#FF4500]" aria-hidden />
                          {s.properties.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${valeur} flex items-start gap-3.5`}>
                  <span className="shrink-0 w-11 h-11 rounded-[14px] bg-white text-[#FF4500] flex items-center justify-center" aria-hidden><MapPin className="w-5 h-5" /></span>
                  <div className="min-w-0">
                    <p className="text-[17px] md:text-lg font-bold leading-snug break-words">{profile?.address || 'Aucune adresse renseignée'}</p>
                    {profile?.address && (
                      <p className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECF7EF] text-[13px] font-bold text-[#166534]">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.6} aria-hidden />Zone 78 — Livrable
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* APPEL À COMMANDER */}
            <section className="relative overflow-hidden bg-[#3D2B1F] rounded-3xl md:rounded-[28px] p-6 md:p-8 text-[#F5EAE0]">
              <svg viewBox="0 0 600 600" aria-hidden className="ss-rayons absolute -right-[110px] -top-[130px] w-[260px] h-[260px] pointer-events-none">
                <circle cx="300" cy="300" r="100" fill="#FF4500" fillOpacity="0.9" />
                <circle cx="300" cy="300" r="226" fill="none" stroke="#FF4500" strokeOpacity="0.7" strokeWidth="110" strokeDasharray="12 47.2" />
              </svg>
              <span className="relative w-12 h-12 rounded-[15px] bg-[#F5EAE0]/10 text-[#FF7A47] flex items-center justify-center mb-4" aria-hidden><Truck className="w-[22px] h-[22px]" /></span>
              <h3 className="relative titre text-[28px] leading-[1.05] mb-2.5">Livraison dès le lendemain</h3>
              <p className="relative mb-6 text-[15px] leading-relaxed text-[#E1D2C2]">
                Entre 15h et 20h, à la date de votre choix. Offerte dans nos villes relais, et partout dès 40€.
              </p>
              <Link href="/commander" className="group relative flex items-center justify-between gap-3 min-h-[60px] px-[22px] rounded-[18px] bg-[#FF4500] text-white text-[19px] font-extrabold hover:bg-[#E63E00] transition-colors">
                Commander maintenant
                <ArrowRight className="w-[22px] h-[22px] transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.4} aria-hidden />
              </Link>
            </section>
          </div>
        )}
      </div>

      {/* FENÊTRE : MODIFICATION DU MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-[#3D2B1F]/55 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="titre-mdp" className="ss-pop w-full max-w-md bg-white rounded-[28px] p-6 md:p-7 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-[14px] bg-[#FFF1EA] text-[#FF4500] flex items-center justify-center" aria-hidden><KeyRound className="w-5 h-5" /></span>
                <h3 id="titre-mdp" className="titre text-[26px] leading-none">Nouveau mot de passe</h3>
              </div>
              <button type="button" onClick={() => setShowPasswordModal(false)} aria-label="Fermer" className="shrink-0 w-11 h-11 rounded-full bg-[#F5EAE0] text-[#3D2B1F] flex items-center justify-center hover:bg-[#EAD9C8] transition-colors">
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>

            {passwordSuccess ? (
              <div role="status" className="flex flex-col items-center text-center gap-3 py-6">
                <span className="ss-pop w-16 h-16 rounded-full bg-[#166534] text-white flex items-center justify-center"><Check className="w-8 h-8" strokeWidth={3} aria-hidden /></span>
                <p className="titre text-2xl">Mot de passe mis à jour !</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {passwordError && (
                  <p role="alert" className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-sm font-bold text-red-700">
                    <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />{passwordError}
                  </p>
                )}
                <div>
                  <label htmlFor="compte-nouveau-mdp" className={etiquette}>Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#6F5A4B] pointer-events-none" aria-hidden />
                    <input id="compte-nouveau-mdp" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className={`${champ} pl-[46px] pr-14`} />
                    <button type="button" onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center text-[#6F5A4B] hover:text-[#3D2B1F] transition-colors">
                      {showNewPassword ? <EyeOff className="w-[19px] h-[19px]" aria-hidden /> : <Eye className="w-[19px] h-[19px]" aria-hidden />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="compte-confirmer-mdp" className={etiquette}>Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#6F5A4B] pointer-events-none" aria-hidden />
                    <input id="compte-confirmer-mdp" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={`${champ} pl-[46px]`} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="mt-1 min-h-14 rounded-[17px] bg-[#FF4500] text-white text-[17px] font-extrabold flex items-center justify-center gap-2.5 hover:bg-[#E63E00] transition-colors disabled:bg-[#EDE3D5] disabled:text-[#6F5A4B]"
                >
                  {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Save className="w-[18px] h-[18px]" aria-hidden />}
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FENÊTRE : CONFIRMATION DE SUPPRESSION DU COMPTE */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-[#3D2B1F]/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div role="alertdialog" aria-modal="true" aria-labelledby="titre-suppression" className="ss-pop w-full max-w-md bg-white rounded-[28px] p-6 md:p-7 shadow-2xl text-center">
            <span className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 text-red-700 flex items-center justify-center" aria-hidden><AlertTriangle className="w-8 h-8" /></span>
            <h3 id="titre-suppression" className="titre text-[28px] leading-tight mb-3">Supprimer votre compte ?</h3>
            <p className="mb-5 text-[15px] leading-relaxed text-[#5C4030]">
              Cette action est <span className="font-extrabold text-red-700">définitive</span>. Votre compte, votre profil et vos points de fidélité seront supprimés. Vous ne pourrez pas récupérer ces données.
            </p>
            {deleteError && (
              <p role="alert" className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] bg-red-50 text-left text-sm font-bold text-red-700">
                <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden />{deleteError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading} className="min-h-14 rounded-[17px] border-[1.5px] border-[#3D2B1F] bg-white text-base font-extrabold hover:bg-[#F5EAE0] transition-colors disabled:opacity-60">
                Annuler
              </button>
              <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading} className="min-h-14 rounded-[17px] bg-red-700 text-white text-base font-extrabold flex items-center justify-center gap-2 hover:bg-red-800 transition-colors disabled:opacity-70">
                {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Trash2 className="w-[18px] h-[18px]" aria-hidden />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
