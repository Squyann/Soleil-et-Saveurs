'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Phone, MapPin, LogOut, ArrowLeft,
  ShoppingBag, Package, CheckCircle2, Clock, XCircle,
  Loader2, Edit3, Save, X, ChevronRight, Star, Truck,
  AlertCircle, Plus, Gift, Copy, Shield, Trash2, AlertTriangle, FileText,
  KeyRound, Lock, Eye, EyeOff
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
  const escapeHtml = (str: any) =>
    String(str ?? '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
    ));

  const imprimerFacture = (order: any) => {
    const isRetrait = order.adresse_livraison?.includes('Retrait');
    const dateCmd = new Date(order.created_at).toLocaleDateString('fr-FR');
    const refFacture = `INV-${new Date(order.created_at).getFullYear()}-${String(order.id).slice(-4).toUpperCase()}`;
    const items = order.contenu_panier || [];

    const sousTotalProduits = items.reduce((acc: number, item: any) => {
      const qte = parseFloat(item.quantite || item.quantity || 0);
      const qteEffective = item.unite === 'g' ? qte / 1000 : qte;
      let prixUnit = parseFloat(item.price || item.prix || 0);
      if (item.promotion && item.promotion > 0) prixUnit *= (1 - item.promotion / 100);
      const seuil = item.seuil_achat || 0;
      const offert = item.quantite_offerte || 0;
      if (seuil > 0 && offert > 0) {
        const tailleLot = seuil + offert;
        const nbLots = Math.floor(qteEffective / tailleLot);
        const reste = qteEffective % tailleLot;
        return acc + (nbLots * seuil + Math.min(reste, seuil)) * prixUnit;
      }
      return acc + qteEffective * prixUnit;
    }, 0);

    let fraisLivraison = 0;
    if (!isRetrait && sousTotalProduits > 0) {
      fraisLivraison = sousTotalProduits >= 30 ? 0
        : Math.round(2.50 * (30 - sousTotalProduits) / 20 * 100) / 100;
    }

    const totalFinal = parseFloat(order.total);
    const totalHT = sousTotalProduits / 1.055;
    const montantTVA = sousTotalProduits - totalHT;

    const fenetre = window.open('', '', 'height=800,width=900');
    if (!fenetre) return;
    fenetre.document.write(`
      <html>
        <head>
          <title>Facture ${refFacture}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748; padding: 50px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
            .brand h1 { font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -1px; color: #16423C; }
            .brand h1 span { color: #6A9C89; }
            .brand p { font-size: 12px; color: #718096; margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0; color: #718096; }
            .invoice-details p { font-size: 16px; font-weight: 800; margin: 0; color: #1A202C; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px; }
            .info-box h3 { font-size: 11px; text-transform: uppercase; color: #A0AEC0; margin-bottom: 10px; letter-spacing: 1px; border-bottom: 1px solid #EDF2F7; padding-bottom: 5px; }
            .info-box p { font-size: 14px; margin: 0; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; padding: 15px 10px; background: #F7FAFC; font-size: 11px; text-transform: uppercase; color: #718096; border-top: 2px solid #16423C; }
            td { padding: 15px 10px; border-bottom: 1px solid #EDF2F7; font-size: 14px; }
            .text-right { text-align: right; }
            .totals-area { display: flex; justify-content: flex-end; }
            .totals-table { width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
            .totals-row.grand-total { border-top: 2px solid #16423C; margin-top: 10px; padding-top: 15px; font-size: 20px; font-weight: 900; color: #16423C; }
            .footer-note { margin-top: 100px; text-align: center; font-size: 11px; color: #A0AEC0; border-top: 1px solid #EDF2F7; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="220" height="41" style="display:block;margin-bottom:6px;">
                <circle cx="28" cy="30" r="9" fill="#F97316"/>
                <line x1="28" y1="7" x2="28" y2="15" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="28" y1="45" x2="28" y2="53" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="5" y1="30" x2="13" y2="30" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="43" y1="30" x2="51" y2="30" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="44.3" y1="13.7" x2="38.5" y2="19.5" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="11.7" y1="46.3" x2="17.5" y2="40.5" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="11.7" y1="13.7" x2="17.5" y2="19.5" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="44.3" y1="46.3" x2="38.5" y2="40.5" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
                <text x="62" y="39" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="400" fill="#4a3b32" letter-spacing="0.3">Soleil et Saveurs</text>
              </svg>
              <p>Produits Frais</p>
              <div style="font-size: 11px; color: #718096; margin-top: 10px; font-weight: normal; text-transform: none; line-height: 1.6;">
                Khaled Boulila — Entreprise individuelle<br/>
                Siège social : 6-8 Avenue Henriette, 93170 Bagnolet<br/>
                SIRET : 821 324 324 00028<br/>
                Livraison Yvelines (78)
              </div>
            </div>
            <div class="invoice-details">
              <h2>Référence Facture</h2>
              <p>${refFacture}</p>
              <h2 style="margin-top: 15px;">Date de commande</h2>
              <p>${dateCmd}</p>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <h3>Client</h3>
              <p>${escapeHtml(order.nom_client || `${profile?.first_name || ''} ${profile?.last_name || ''}`)}</p>
              <p style="font-weight: normal; margin-top: 4px;">${escapeHtml(profile?.email || '')}</p>
            </div>
            <div class="info-box">
              <h3>Mode de livraison</h3>
              <p>${isRetrait ? '📍 Retrait au centre' : '🚚 Livraison à domicile'}</p>
              <p style="font-weight: normal; color: #4A5568; font-size: 13px; margin-top: 5px;">${escapeHtml(order.adresse_livraison)}</p>
              ${order.date_livraison ? `<p style="font-weight: bold; color: #FF4500; font-size: 13px; margin-top: 8px;">📅 Livraison le : ${new Date(order.date_livraison + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description des articles</th>
                <th class="text-right">Quantité</th>
                <th class="text-right">Prix Unit. TTC</th>
                <th class="text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((i: any) => {
                const nomProduit = i.nom || i.name || 'Produit inconnu';
                const qte = parseFloat(i.quantite || i.quantity || 0);
                const unite = escapeHtml(i.unite || 'unité(s)');
                const isGram = unite === 'g';
                const qteEffective = isGram ? qte / 1000 : qte;
                const prixUnit = parseFloat(i.prixUnitaire || i.price || 0);
                const totalLigne = i.prixTotalLigne ? parseFloat(i.prixTotalLigne) : qteEffective * prixUnit;
                const qteAffiche = isGram
                  ? (qte < 1000 ? `${qte}g` : `${(qte / 1000).toFixed(2).replace('.', ',')} kg`)
                  : `${qte} ${unite}`;
                const prixAffiche = isGram ? `${prixUnit.toFixed(2)}€/kg` : `${prixUnit.toFixed(2)}€`;
                return `
                  <tr>
                    <td style="font-weight: bold;">${escapeHtml(nomProduit)}</td>
                    <td class="text-right">${qteAffiche}</td>
                    <td class="text-right">${prixAffiche}</td>
                    <td class="text-right" style="font-weight: bold;">${totalLigne.toFixed(2)}€</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div class="totals-area">
            <div class="totals-table">
              <div class="totals-row"><span>Sous-total HT (5.5%)</span><span>${totalHT.toFixed(2)}€</span></div>
              <div class="totals-row"><span>TVA (5.5%)</span><span>${montantTVA.toFixed(2)}€</span></div>
              <div class="totals-row"><span>Frais de livraison</span><span style="font-weight: bold;">${fraisLivraison === 0 ? 'OFFERT' : fraisLivraison.toFixed(2) + '€'}</span></div>
              <div class="totals-row grand-total"><span>TOTAL PAYÉ</span><span>${totalFinal.toFixed(2)}€</span></div>
            </div>
          </div>
          <div class="footer-note">
            Merci d'avoir choisi le circuit court avec Soleil et Saveurs.<br/>
            <em>TVA non applicable, art. 293 B du CGI</em><br/>
            Ce document fait office de bon de livraison et de facture.
          </div>
        </body>
      </html>
    `);
    fenetre.document.close();
    setTimeout(() => fenetre.print(), 500);
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
      <div className="min-h-screen bg-[#EDE3D5] flex items-center justify-center">
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
 

  return (
    <div className="min-h-screen bg-[#EDE3D5] text-slate-900 pb-20">

      {/* HERO HEADER */}
      <div className="bg-[#3D2B1F] pt-20 pb-32 px-4 md:px-8 relative overflow-hidden">
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
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-xl shadow-slate-200/60 border border-[#D5C9B8] w-fit">
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
                  ? 'bg-[#3D2B1F] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-[#EDE3D5]'
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
            <div className="bg-white rounded-[2rem] p-8 border border-[#D5C9B8] shadow-xl shadow-slate-100/50">
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
                      className="p-2 hover:bg-[#EDE3D5] rounded-xl transition-colors text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex items-center gap-1.5 bg-[#FF4500] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#3D2B1F] transition-all disabled:opacity-50"
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
                        className="w-full bg-[#EDE3D5] border border-[#D5C9B8] p-3 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all uppercase"
                      />
                    ) : (
                      <div className="bg-[#EDE3D5] p-3 rounded-xl font-bold text-sm uppercase text-slate-700">
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
                        className="w-full bg-[#EDE3D5] border border-[#D5C9B8] p-3 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all uppercase"
                      />
                    ) : (
                      <div className="bg-[#EDE3D5] p-3 rounded-xl font-bold text-sm uppercase text-slate-700">
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
                    <div className="bg-[#EDE3D5] p-3 pl-10 rounded-xl font-bold text-sm text-slate-400 flex items-center justify-between">
                      <span>{profile?.email}</span>
                      <span className="text-[8px] font-black uppercase bg-[#DDD0BF] px-2 py-0.5 rounded-full text-slate-400">Non modifiable</span>
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
                        className="w-full bg-[#EDE3D5] border border-[#D5C9B8] p-3 pl-10 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <div className="bg-[#EDE3D5] p-3 pl-10 rounded-xl font-bold text-sm text-slate-700">
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
              <div className="bg-[#3D2B1F] rounded-[2rem] p-6 relative overflow-hidden shadow-xl">
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
              <div className="bg-white rounded-[2rem] p-6 border border-[#D5C9B8] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-[#FF4500]" />
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Parrainage</p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase">Partagez votre code — vous gagnez tous les deux -10%</p>
                <div className="flex items-center gap-2 bg-[#EDE3D5] rounded-xl p-3 border border-[#D5C9B8]">
                  <p className="font-black text-lg text-slate-900 tracking-[0.2em] flex-1">{dbProfile?.referral_code ?? '—'}</p>
                  <button
                    onClick={() => {
                      if (dbProfile?.referral_code) {
                        navigator.clipboard.writeText(dbProfile.referral_code);
                        setReferralCopied(true);
                        setTimeout(() => setReferralCopied(false), 2000);
                      }
                    }}
                    className="flex items-center gap-1 bg-[#FF4500] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-[#3D2B1F] transition-all"
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
                  className="w-full flex items-center justify-between bg-[#3D2B1F] border border-slate-800 p-6 rounded-[2rem] hover:bg-[#FF4500] transition-all group shadow-sm"
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

              {/* MODIFIER LE MOT DE PASSE */}
              <button
                onClick={() => { setShowPasswordModal(true); setPasswordError(null); setPasswordSuccess(false); setNewPassword(''); setConfirmPassword(''); }}
                className="w-full flex items-center justify-between bg-white border border-[#D5C9B8] p-6 rounded-[2rem] hover:border-[#FF4500]/30 hover:bg-orange-50/30 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#EDE3D5] rounded-xl flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#FF4500]" />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase text-sm text-slate-700 group-hover:text-[#FF4500] transition-colors">Modifier le mot de passe</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Sécurisez votre compte</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FF4500] group-hover:translate-x-1 transition-all" />
              </button>

              {/* DÉCONNEXION */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between bg-white border border-[#D5C9B8] p-6 rounded-[2rem] hover:border-red-100 hover:bg-red-50/30 transition-all group shadow-sm"
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

              {/* SUPPRESSION DU COMPTE */}
              <button
                onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
                className="w-full flex items-center justify-between bg-white border border-red-100 p-6 rounded-[2rem] hover:border-red-200 hover:bg-red-50/40 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase text-sm text-red-600">Supprimer mon compte</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Action définitive et irréversible</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
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
              <div className="bg-white rounded-[2.5rem] p-16 text-center border border-[#D5C9B8] shadow-sm">
                <div className="w-20 h-20 bg-[#EDE3D5] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-200" />
                </div>
                <p className="font-black uppercase text-sm text-slate-400 tracking-widest mb-6">Aucune commande pour l'instant</p>
                <Link
                  href="/commander"
                  className="inline-flex items-center gap-2 bg-[#FF4500] text-white px-6 py-3 rounded-xl font-black uppercase text-[11px] hover:bg-[#3D2B1F] transition-all"
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
                  <div key={order.id} className="bg-white rounded-[2rem] p-6 md:p-8 border border-[#DDD0BF] shadow-xl shadow-slate-100/50 hover:shadow-slate-200/60 transition-all">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#EDE3D5] rounded-2xl flex items-center justify-center shrink-0">
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
                    <div className="border-t border-[#DDD0BF] pt-4">
                      <div className="bg-[#EDE3D5]/50 p-4 rounded-2xl border border-[#D5C9B8]/50">
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                          {order.description_commande || "Détail indisponible"}
                        </p>
                      </div>
                    </div>

                    {/* TIMELINE SUIVI */}
                    {!statusKey.includes('annule') && (
                      <div className="mt-5 pt-4 border-t border-[#DDD0BF]">
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
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${done ? (step.key === 'livree' ? 'bg-green-500 text-white' : 'bg-[#FF4500] text-white') : 'bg-[#DDD0BF] text-slate-300'}`}>
                                    {done ? '✓' : idx + 1}
                                  </div>
                                  <span className={`text-[8px] font-black uppercase tracking-tight text-center ${done ? 'text-slate-600' : 'text-slate-300'}`}>{step.label}</span>
                                </div>
                                {!isLast && (
                                  <div className={`flex-1 h-0.5 mb-3 mx-1 transition-all ${arr[idx + 1].order <= currentOrder ? 'bg-[#FF4500]' : 'bg-[#DDD0BF]'}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOUTONS : FACTURE + COMMANDER À NOUVEAU */}
                    {/* La facture n'est accessible qu'une fois la commande livrée. */}
                    <div className="mt-6 pt-4 border-t border-[#DDD0BF] flex flex-col sm:flex-row gap-2">
                      {statusKey === 'livree' ? (
                        <button
                          onClick={() => imprimerFacture(order)}
                          className="sm:w-auto py-4 px-5 bg-white border border-[#D5C9B8] text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-[#FF4500] hover:text-[#FF4500] transition-all active:scale-95"
                        >
                          <FileText className="w-4 h-4" />
                          Facture
                        </button>
                      ) : (
                        <div
                          title="Disponible après la livraison"
                          className="sm:w-auto py-4 px-5 bg-[#EDE3D5] border border-[#D5C9B8] text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <FileText className="w-4 h-4" />
                          Facture après livraison
                        </div>
                      )}
                      <button
                        onClick={() => commanderANouveau((order as any).contenu_panier)}
                        className="flex-1 py-4 bg-[#FF4500] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#3D2B1F] transition-all shadow-lg shadow-orange-900/10 active:scale-95"
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
            <div className="bg-white rounded-[2rem] p-8 border border-[#D5C9B8] shadow-xl shadow-slate-100/50">
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
                    <button onClick={() => { setIsEditing(false); setEditForm(profile!); setAddressSuggestions([]); }} className="p-2 hover:bg-[#EDE3D5] rounded-xl text-slate-400">
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveLoading}
                      className="flex items-center gap-1.5 bg-[#FF4500] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#3D2B1F] transition-all disabled:opacity-50"
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
                        className="w-full bg-[#EDE3D5] border border-[#D5C9B8] p-3 pl-10 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all"
                      />
                    </div>
                    {addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-[#D5C9B8] rounded-2xl shadow-2xl mt-1 overflow-hidden">
                        {addressSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { setEditForm(f => ({ ...f, address: s.properties.label })); setAddressSuggestions([]); }}
                            className="w-full p-3 text-left text-[10px] font-black uppercase border-b border-[#DDD0BF] hover:bg-[#EDE3D5] flex items-center gap-2"
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
            <div className="bg-[#3D2B1F] rounded-[2rem] p-8 relative overflow-hidden shadow-xl flex flex-col justify-between">
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

      {/* MODAL MODIFICATION MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-[#D5C9B8] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#EDE3D5] rounded-2xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-[#FF4500]" />
                </div>
                <h3 className="font-black uppercase text-lg text-slate-900 tracking-tight">Nouveau mot de passe</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-[#EDE3D5] rounded-xl text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
                <p className="font-black uppercase text-sm text-slate-900">Mot de passe mis à jour !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase">{passwordError}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#EDE3D5] border border-[#D5C9B8] p-3 pl-10 pr-10 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#EDE3D5] border border-[#D5C9B8] p-3 pl-10 rounded-xl font-bold text-sm focus:border-[#FF4500] outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="w-full flex items-center justify-center gap-2 bg-[#3D2B1F] text-white p-4 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#FF4500] transition-all disabled:opacity-40 mt-2"
                >
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION COMPTE */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-[#D5C9B8] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-black uppercase text-lg text-slate-900 tracking-tight mb-2">Supprimer votre compte ?</h3>
              <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6">
                Cette action est <span className="text-red-600">définitive</span>. Votre compte, votre profil et vos points de fidélité seront supprimés. Vous ne pourrez pas récupérer ces données.
              </p>

              {deleteError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 mb-4 w-full">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-[10px] font-black uppercase text-left">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-3.5 bg-[#EDE3D5] text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-[#DDD0BF] transition-all disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}