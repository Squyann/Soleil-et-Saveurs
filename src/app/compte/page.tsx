'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Phone, MapPin, LogOut, ArrowLeft,
  ShoppingBag, Package, CheckCircle2, Clock, XCircle,
  Loader2, Edit3, Save, X, ChevronRight, Star, Truck,
  AlertCircle, Plus, Gift, Copy, Shield
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'profil' | 'commandes' | 'adresses'>('profil');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [dbProfile, setDbProfile] = useState<DBProfile | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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

    const { data: success } = await supabase.rpc('process_referral', {
      p_referral_code: meta.referral_code_used,
      p_new_user_id: currentUser.id,
    });

    if (success) {
      await supabase.auth.updateUser({ data: { referral_processed: true } });
      // Le bon du parrainé est en attente : il s'activera après sa première commande
      await supabase
        .from('profiles')
        .update({ has_referral_discount: false, referral_pending: true })
        .eq('user_id', currentUser.id);
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

  // --- FORMATAGE ---
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const totalDepense = orders
    .filter(o => !o.statut?.toLowerCase().includes('annul'))
    .reduce((acc, o) => acc + (o.total || 0), 0);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#FF4500] rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-white font-black text-lg">S</span>
          </div>
          <Loader2 className="w-6 h-6 text-[#FF4500] animate-spin" />
        </div>
      </div>
    );
  }

  const commanderANouveau = (contenu: any) => {
  // 1. Sécurité : si contenu est vide ou n'est pas un tableau, on arrête
  if (!contenu || !Array.isArray(contenu)) {
    alert("Impossible de récupérer les articles de cette commande.");
    return;
  }

  try {
    // 2. Récupérer l'existant (vérifie bien que c'est 'soleilsaveurs_cart')
    const panierLocal = localStorage.getItem('mon-panier');
    const panierActuel = panierLocal ? JSON.parse(panierLocal) : [];

    // 3. Fusionner (on ajoute les anciens articles au panier actuel)
    const nouveauPanier = [...panierActuel, ...contenu];

    // 4. Sauvegarder
    localStorage.setItem('mon-panier', JSON.stringify(nouveauPanier));

    // 5. Mise à jour en temps réel et redirection
    window.dispatchEvent(new Event('storage'));
    window.location.href = '/';
    
  } catch (error) {
    console.error("Erreur panier:", error);
    alert("Une erreur est survenue lors de l'ajout au panier.");
  }
 };
 

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-20">

      {/* HERO HEADER */}
      <div className="bg-slate-900 pt-20 pb-32 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF4500]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Boutique
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* AVATAR */}
              <div className="w-16 h-16 bg-[#FF4500] rounded-2xl flex items-center justify-center shadow-xl shadow-orange-900/30 shrink-0">
                <span className="text-white font-black text-2xl uppercase">
                  {profile?.first_name?.[0] || profile?.last_name?.[0] || '?'}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#FF4500] uppercase tracking-[0.3em] mb-1">Mon Compte</p>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none">
                  {profile?.first_name} {profile?.last_name}
                </h1>
                <p className="text-slate-400 text-xs font-bold mt-1">{profile?.email}</p>
              </div>
            </div>

            {/* STATS RAPIDES */}
            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-black text-white">{orders.length}</p>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Commandes</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-black text-[#FF4500]">{totalDepense.toFixed(0)}€</p>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Dépensé</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-black text-white">
                  {orders.filter(o => o.statut?.toLowerCase().includes('livr')).length}
                </p>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Livrées</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-16 relative z-10">

        {/* TABS */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 w-fit">
          {([
            { id: 'profil',     label: 'Mon Profil',  icon: User },
            { id: 'commandes', label: 'Commandes',   icon: ShoppingBag },
            { id: 'adresses',  label: 'Adresses',    icon: MapPin },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-tight transition-all ${
                activeTab === id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ===== TAB : PROFIL ===== */}
        {activeTab === 'profil' && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* INFOS PERSONNELLES */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-black uppercase tracking-tight text-slate-900">Informations</h2>
                {!isEditing ? (
                  <button
                    onClick={() => { setIsEditing(true); setSaveError(null); }}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-[#FF4500] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsEditing(false); setEditForm(profile!); setAddressSuggestions([]); }}
                      className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex items-center gap-1.5 bg-[#FF4500] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                      {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Sauver
                    </button>
                  </div>
                )}
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-600 mb-4 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <p className="text-[10px] font-black uppercase">Profil mis à jour !</p>
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-[10px] font-black uppercase">{saveError}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* NOM / PRÉNOM */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.last_name || ''}
                        onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all uppercase"
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl font-bold text-sm uppercase text-slate-700">
                        {profile?.last_name || '—'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.first_name || ''}
                        onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all uppercase"
                      />
                    ) : (
                      <div className="bg-slate-50 p-3 rounded-xl font-bold text-sm uppercase text-slate-700">
                        {profile?.first_name || '—'}
                      </div>
                    )}
                  </div>
                </div>

                {/* EMAIL (lecture seule) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <div className="bg-slate-50 p-3 pl-10 rounded-xl font-bold text-sm text-slate-400 flex items-center justify-between">
                      <span>{profile?.email}</span>
                      <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">Non modifiable</span>
                    </div>
                  </div>
                </div>

                {/* TÉLÉPHONE */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
                  {isEditing ? (
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="06XXXXXXXX"
                        className="w-full bg-slate-50 border border-slate-100 p-3 pl-10 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <div className="bg-slate-50 p-3 pl-10 rounded-xl font-bold text-sm text-slate-700">
                        {profile?.phone || '—'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FIDÉLITÉ + PARRAINAGE + DÉCONNEXION */}
            <div className="space-y-4">

              {/* CARTE FIDÉLITÉ */}
              <div className="bg-slate-900 rounded-[2rem] p-6 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF4500]/20 blur-[60px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-[#FF4500] fill-[#FF4500]" />
                    <p className="text-[10px] font-black text-[#FF4500] uppercase tracking-widest">Fidélité</p>
                  </div>
                  <p className="text-white font-black text-3xl mb-1">
                    {dbProfile?.loyalty_points ?? 0}
                    <span className="text-slate-400 text-base font-bold ml-2">/ 100 pts</span>
                  </p>
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF4500] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(((dbProfile?.loyalty_points ?? 0) / 100) * 100, 100)}%` }}
                    />
                  </div>
                  {(dbProfile?.loyalty_points ?? 0) >= 100 ? (
                    <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mt-2">
                      ✓ Remise -10% disponible — activez-la dans le panier
                    </p>
                  ) : (
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                      {100 - (dbProfile?.loyalty_points ?? 0)} pts avant votre remise de -10%
                    </p>
                  )}
                </div>
              </div>

              {/* CARTE PARRAINAGE */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-[#FF4500]" />
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Parrainage</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase">Partagez votre code — vous gagnez tous les deux -10%</p>
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="font-black text-lg text-slate-900 tracking-[0.2em] flex-1">{dbProfile?.referral_code ?? '—'}</p>
                  <button
                    onClick={() => {
                      if (dbProfile?.referral_code) {
                        navigator.clipboard.writeText(dbProfile.referral_code);
                        setReferralCopied(true);
                        setTimeout(() => setReferralCopied(false), 2000);
                      }
                    }}
                    className="flex items-center gap-1 bg-[#FF4500] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-slate-900 transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    {referralCopied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                {dbProfile?.has_referral_discount && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-[9px] font-black text-green-700 uppercase tracking-wide">Remise parrainage -10% dispo — activez-la dans le panier</p>
                  </div>
                )}
              </div>

              {/* PANEL ADMIN */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-[2rem] hover:bg-[#FF4500] transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-black uppercase text-sm text-white">Panel Admin</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Accès au tableau de bord</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </Link>
              )}

              {/* DÉCONNEXION */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between bg-white border border-slate-100 p-6 rounded-[2rem] hover:border-red-100 hover:bg-red-50/30 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase text-sm text-slate-700 group-hover:text-red-600 transition-colors">Se déconnecter</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Fermer la session</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* ===== TAB : COMMANDES ===== */}
        {activeTab === 'commandes' && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#FF4500] animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-200" />
                </div>
                <p className="font-black uppercase text-sm text-slate-400 tracking-widest mb-6">Aucune commande pour l'instant</p>
                <Link
                  href="/commander"
                  className="inline-flex items-center gap-2 bg-[#FF4500] text-white px-6 py-3 rounded-xl font-black uppercase text-[11px] hover:bg-slate-900 transition-all"
                >
                  Voir la récolte du jour <ChevronRight className="w-4 h-4" />
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
                
                return (
                  <div key={order.id} className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-50 shadow-xl shadow-slate-100/50 hover:shadow-slate-200/60 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-black uppercase text-sm text-slate-800 tracking-tight">
                            {/* CORRECTION ID : AJOUT DE String() */}
                            Commande #{String(order.id).slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {order.statut || statusCfg.label}
                        </span>
                        <span className="font-black text-xl text-slate-900">{(order.total || 0).toFixed(2)}€</span>
                      </div>
                    </div>

                    {/* ARTICLES (Via description_commande) */}
                    <div className="border-t border-slate-50 pt-4">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                          {order.description_commande || "Détail indisponible"}
                        </p>
                      </div>
                    </div>

                    {/* TIMELINE SUIVI */}
                    {!statusKey.includes('annule') && (
                      <div className="mt-5 pt-4 border-t border-slate-50">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Suivi de commande</p>
                        <div className="flex items-center">
                          {([
                            { key: 'en_attente', label: 'Reçue', order: 0 },
                            { key: 'confirmee',  label: 'En prépa', order: 1 },
                            { key: 'livree',     label: 'Livrée', order: 2 },
                          ] as const).map((step, idx, arr) => {
                            const currentOrder = statusKey === 'en_attente' ? 0 : statusKey === 'confirmee' ? 1 : 2;
                            const done = step.order <= currentOrder;
                            const isLast = idx === arr.length - 1;
                            return (
                              <React.Fragment key={step.key}>
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${done ? (step.key === 'livree' ? 'bg-green-500 text-white' : 'bg-[#FF4500] text-white') : 'bg-slate-100 text-slate-300'}`}>
                                    {done ? '✓' : idx + 1}
                                  </div>
                                  <span className={`text-[8px] font-black uppercase tracking-tight text-center ${done ? 'text-slate-600' : 'text-slate-300'}`}>{step.label}</span>
                                </div>
                                {!isLast && (
                                  <div className={`flex-1 h-0.5 mb-3 mx-1 transition-all ${arr[idx + 1].order <= currentOrder ? 'bg-[#FF4500]' : 'bg-slate-100'}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOUTON : COMMANDER À NOUVEAU */}
                    <div className="mt-6 pt-4 border-t border-slate-50">
                      <button
                        onClick={() => commanderANouveau((order as any).contenu_panier)}
                        className="w-full py-4 bg-[#FF4500] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-orange-900/10 active:scale-95"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Commander à nouveau
                      </button>
                    </div>

                    {/* ADRESSE */}
                    {order.adresse_livraison && (
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <MapPin className="w-3 h-3 text-[#FF4500]" />
                        {order.adresse_livraison}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            
          </div>
        )}

        {/* ===== TAB : ADRESSES ===== */}
        {activeTab === 'adresses' && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* ADRESSE PRINCIPALE */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-100/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-black uppercase tracking-tight text-slate-900">Adresse principale</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Utilisée pour vos livraisons</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-[#FF4500] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setIsEditing(false); setEditForm(profile!); setAddressSuggestions([]); }} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex items-center gap-1.5 bg-[#FF4500] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 transition-all disabled:opacity-50"
                    >
                      {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Sauver
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse (Yvelines 78)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={editForm.address || ''}
                        onChange={e => handleAddressInput(e.target.value)}
                        placeholder="Tapez votre adresse..."
                        className="w-full bg-slate-50 border border-slate-100 p-3 pl-10 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all"
                      />
                    </div>
                    {addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl mt-1 overflow-hidden">
                        {addressSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { setEditForm(f => ({ ...f, address: s.properties.label })); setAddressSuggestions([]); }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase border-b border-slate-50 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <MapPin className="w-3 h-3 text-[#FF4500] shrink-0" />
                            {s.properties.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-100">
                    <div className="w-10 h-10 bg-[#FF4500] rounded-xl flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-800 uppercase">{profile?.address || 'Aucune adresse renseignée'}</p>
                      {profile?.address && (
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Zone 78 — Livrable</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA COMMANDER */}
            <div className="bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 w-56 h-56 bg-[#FF4500]/15 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <Truck className="w-8 h-8 text-[#FF4500] mb-4" />
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Livraison J+0</h3>
                <p className="text-slate-400 text-xs font-bold leading-relaxed mb-6">
                  Récolté à 5h, chez vous pour le dîner. Gratuit dès 45€.
                </p>
                <Link
                  href="/commander"
                  className="inline-flex items-center gap-2 bg-[#FF4500] text-white px-5 py-3 rounded-xl font-black uppercase text-[11px] hover:scale-105 transition-all shadow-lg shadow-orange-900/30 group"
                >
                  Commander maintenant
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}