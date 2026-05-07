'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  LayoutDashboard, Package, ListTree, Search, 
  RefreshCcw, Printer, Phone, MessageSquare, 
  Trash2, Plus, Truck, CheckCircle2, Clock, Mail, Save, Edit3, X,
  Inbox, Send, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';

interface StatsType {
  total: number;
  aPreparer: number;
  caTotal: number;
}

export default function AdminPage() {
  const [commandes, setCommandes] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [onglet, setOnglet] = useState<'commandes' | 'stock' | 'catalogue' | 'messages'>('commandes');
  const [filtreStatut, setFiltreStatut] = useState<'Toutes' | 'À préparer' | 'livrée'>('Toutes');
  const [uploading, setUploading] = useState(false);
  const [promoProdId, setPromoProdId] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsType>({ total: 0, aPreparer: 0, caTotal: 0 });
  
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);

  const [pourcentage, setPourcentage] = useState(0);
  const [seuilAchat, setSeuilAchat] = useState(0);
  const [qteOfferte, setQteOfferte] = useState(0);

  // NOUVEAU : états pour la réponse aux messages
  const [reponseOuvert, setReponseOuvert] = useState<string | null>(null);
  const [reponseTexte, setReponseTexte] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [nouveauProd, setNouveauProd] = useState({
    name: '', price: 0, category: 'Légumes', image_url: '', stock: 0,
    unite: 'kg', provenance: '', description: '', promotion: 0,
    seuil_achat: 0, quantite_offerte: 0
  });

  useEffect(() => {
    async function verifierAcces() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/admin/login';
        return;
      }
      fetchData();
    }
    verifierAcces();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: cmds } = await supabase.from('commandes').select('*').order('created_at', { ascending: false });
      const { data: prods } = await supabase.from('products').select('*').order('name', { ascending: true });
      const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false });

      if (msgs) setMessages(msgs);

      if (cmds) {
        setCommandes(cmds);
        const total = cmds.length;
        const aPreparer = cmds.filter(c => c.statut !== 'livrée').length;

        const ca = cmds
          .filter(c => c.statut === 'livrée')
          .reduce((acc, curr) => {
            const montantDirect = parseFloat(curr.total);
            if (!isNaN(montantDirect) && montantDirect > 0) {
              return acc + montantDirect;
            }
            const montantPanier = (curr.contenu_panier || []).reduce((s: number, item: any) => {
              const qte = parseFloat(item.quantity || item.quantite || 0);
              const prix = parseFloat(item.price || item.prix || 0);
              return s + qte * prix;
            }, 0);
            return acc + montantPanier;
          }, 0);

        setStats({ total, aPreparer, caTotal: ca });
      }
      if (prods) setProduits(prods);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    }
    setLoading(false);
  }

  // NOUVEAU : Marquer comme lu/non lu
  async function toggleLu(id: string, luActuel: boolean) {
    const { error } = await supabase.from('messages').update({ lu: !luActuel }).eq('id', id);
    if (!error) setMessages(prev => prev.map(m => m.id === id ? { ...m, lu: !luActuel } : m));
  }

  // NOUVEAU : Supprimer un message
  async function supprimerMessage(id: string) {
    if (confirm("Supprimer ce message définitivement ?")) {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (!error) setMessages(prev => prev.filter(m => m.id !== id));
    }
  }

  // NOUVEAU : Répondre par email via mailto
  async function envoyerReponse(msg: any) {
    if (!reponseTexte.trim()) return;
    setEnvoiEnCours(true);

    // Marquer comme lu automatiquement à la réponse
    await supabase.from('messages').update({ lu: true }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, lu: true } : m));

    // Ouvrir le client mail avec la réponse pré-remplie
    const sujet = encodeURIComponent(`Réponse à votre message — Soleil Saveurs`);
    const corps = encodeURIComponent(
      `Bonjour ${msg.nom},\n\n${reponseTexte}\n\nCordialement,\nL'équipe Soleil Saveurs`
    );
    window.open(`mailto:${msg.email}?subject=${sujet}&body=${corps}`, '_blank');

    setReponseTexte('');
    setReponseOuvert(null);
    setEnvoiEnCours(false);
  }

  async function updateStatut(id: string, nouveauStatut: string) {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: nouveauStatut })
        .eq('id', id);

      if (error) {
        alert("Erreur lors de la mise à jour : " + error.message);
        return;
      }

      setCommandes(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, statut: nouveauStatut } : c);
        const total = updated.length;
        const aPreparer = updated.filter(c => c.statut !== 'livrée').length;
        const ca = updated
          .filter(c => c.statut === 'livrée')
          .reduce((acc, curr) => {
            const montantDirect = parseFloat(curr.total);
            if (!isNaN(montantDirect) && montantDirect > 0) return acc + montantDirect;
            return acc + (curr.contenu_panier || []).reduce((s: number, item: any) => {
              return s + parseFloat(item.quantity || item.quantite || 0) * parseFloat(item.price || item.prix || 0);
            }, 0);
          }, 0);

        setStats({ total, aPreparer, caTotal: ca });
        return updated;
      });

    } catch (err: any) {
      alert("Erreur inattendue : " + err.message);
    }
  }

  async function modifierProduit(id: string) {
    try {
      const { error } = await supabase.from('products').update(editFormData).eq('id', id);
      if (error) throw error;
      setEditingProdId(null);
      alert("Produit mis à jour !");
      fetchData();
    } catch (error: any) { alert("Erreur : " + error.message); }
  }

  async function appliquerPromo(id: string) {
    try {
      const { error } = await supabase.from('products').update({ 
        promotion: pourcentage, seuil_achat: seuilAchat, quantite_offerte: qteOfferte 
      }).eq('id', id);
      if (error) throw error;
      setPromoProdId(null);
      fetchData();
    } catch (error: any) { alert(error.message); }
  }

  const envoyerWhatsApp = (cmd: any) => {
    const message = `Bonjour ${cmd.nom_client}, c'est Soleil Saveurs pour votre commande #${cmd.id}...`;
    const rel = cmd.telephone_client?.replace(/\s+/g, '');
    window.open(`https://wa.me/${rel}?text=${encodeURIComponent(message)}`, '_blank');
  };

  async function handleUpload(e: any, isEditing = false) {
    setUploading(true);
    try {
      const file = e.target.files[0];
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('produits-images').upload(fileName, file);
      const { data } = supabase.storage.from('produits-images').getPublicUrl(fileName);
      if (isEditing) setEditFormData({ ...editFormData, image_url: data.publicUrl });
      else setNouveauProd({ ...nouveauProd, image_url: data.publicUrl });
    } catch (e) { alert("Erreur upload"); }
    setUploading(false);
  }

  async function ajouterProduit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('products').insert([nouveauProd]);
    fetchData();
  }

  async function ajusterStock(id: string, actuel: number, delta: number) {
    await supabase.from('products').update({ stock: Math.max(0, actuel + delta) }).eq('id', id);
    fetchData();
  }

  async function supprimerProduit(id: string) {
    if (confirm("Supprimer ?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  }

  const calculerBesoinStock = () => {
    const stockMap: { [key: string]: { quantite: number } } = {};
    commandes.filter(cmd => cmd.statut !== 'livrée').forEach(cmd => {
      cmd.contenu_panier?.forEach((item: any) => {
        const nom = item.name || item.nom;
        const qte = Number(item.quantity || item.quantite || 0);
        if (stockMap[nom]) stockMap[nom].quantite += qte;
        else stockMap[nom] = { quantite: qte };
      });
    });
    return Object.entries(stockMap);
  };

  const produitsFiltres = produits.filter(p => p.name?.toLowerCase().includes(recherche.toLowerCase()));
  const commandesFiltrees = commandes.filter(cmd => {
    const matchSearch = cmd.nom_client?.toLowerCase().includes(recherche.toLowerCase()) || cmd.id.toString().includes(recherche);
    if (filtreStatut === 'À préparer') return matchSearch && cmd.statut !== 'livrée';
    if (filtreStatut === 'livrée') return matchSearch && cmd.statut === 'livrée';
    return matchSearch;
  });

  const imprimerBon = (cmd: any) => {
    const isRetrait = cmd.adresse_livraison?.includes("Retrait");
    const dateCmd = new Date(cmd.created_at).toLocaleDateString('fr-FR');
    const refFacture = `INV-${new Date(cmd.created_at).getFullYear()}-${cmd.id.toString().slice(-4).toUpperCase()}`;

    // Recalculer le sous-total produits depuis le panier pour éviter de doubler les frais de livraison
    const sousTotalProduits = (cmd.contenu_panier || []).reduce((acc: number, item: any) => {
      const qte = parseFloat(item.quantite || item.quantity || 0);
      let prixUnit = parseFloat(item.price || item.prix || 0);
      if (item.promotion && item.promotion > 0) prixUnit *= (1 - item.promotion / 100);
      const seuil = item.seuil_achat || 0;
      const offert = item.quantite_offerte || 0;
      if (seuil > 0 && offert > 0) {
        const tailleLot = seuil + offert;
        const lots = Math.floor(qte / tailleLot);
        const reste = qte % tailleLot;
        return acc + (lots * seuil + Math.min(reste, seuil)) * prixUnit;
      }
      return acc + qte * prixUnit;
    }, 0);

    const fraisLivraison = isRetrait || sousTotalProduits === 0 || sousTotalProduits >= 45 ? 0 : 2.50;
    const totalFinal = parseFloat(cmd.total); // Montant réel stocké en base
    const totalHT = sousTotalProduits / 1.055;
    const montantTVA = sousTotalProduits - totalHT;
    
    const fenetre = window.open('', '', 'height=800,width=900');
    if (fenetre) {
      fenetre.document.write(`
        <html>
          <head>
            <title>Facture ${refFacture}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748; padding: 50px; line-height: 1.5; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
              .brand { flex: 1; }
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
                <h1>Soleil Saveurs<span>.</span></h1>
                <p>Produits Frais</p>
                <div style="font-size: 11px; color: #718096; margin-top: 10px; font-weight: normal; text-transform: none;">
                  Livraison Yvelines (78)
                </div>
              </div>
              <div class="invoice-details">
                <h2>Référence Facture</h2>
                <p>${refFacture}</p>
                <h2 style="margin-top: 15px;">Date de livraison</h2>
                <p>${dateCmd}</p>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-box">
                <h3>Client</h3>
                <p>${cmd.nom_client}</p>
                <p style="font-weight: normal; margin-top: 4px;">Tél: ${cmd.telephone_client || 'Non renseigné'}</p>
              </div>
              <div class="info-box">
                <h3>Mode de livraison</h3>
                <p>${isRetrait ? '📍 Retrait au centre' : '🚚 Livraison à domicile'}</p>
                <p style="font-weight: normal; color: #4A5568; font-size: 13px; margin-top: 5px;">${cmd.adresse_livraison}</p>
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
                ${cmd.contenu_panier.map((i: any) => {
                  const nomProduit = i.nom || i.name || "Produit inconnu";
                  const qte = i.quantite || i.quantity || 0;
                  const unite = i.unite || "unité(s)";
                  const totalLigne = i.prixTotalLigne || (parseFloat(i.prixUnitaire || i.price || 0) * parseFloat(qte)) || 0;
                  const prixUnit = i.prixUnitaire || i.price || (qte > 0 ? totalLigne / qte : 0);
                  return `
                  <tr>
                    <td style="font-weight: bold;">${nomProduit}</td>
                    <td class="text-right">${qte} ${unite}</td>
                    <td class="text-right">${prixUnit.toFixed(2)}€</td>
                    <td class="text-right" style="font-weight: bold;">${totalLigne.toFixed(2)}€</td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
            <div class="totals-area">
              <div class="totals-table">
                <div class="totals-row">
                  <span>Sous-total HT (5.5%)</span>
                  <span>${totalHT.toFixed(2)}€</span>
                </div>
                <div class="totals-row">
                  <span>TVA (5.5%)</span>
                  <span>${montantTVA.toFixed(2)}€</span>
                </div>
                <div class="totals-row">
                  <span>Frais de livraison</span>
                  <span style="font-weight: bold;">${fraisLivraison === 0 ? 'OFFERT' : fraisLivraison.toFixed(2) + '€'}</span>
                </div>
                <div class="totals-row grand-total">
                  <span>TOTAL À PAYER</span>
                  <span>${totalFinal.toFixed(2)}€</span>
                </div>
              </div>
            </div>
            <div class="footer-note">
              Merci d'avoir choisi le circuit court avec Soleil Saveurs.<br/>
              <em>TVA non applicable, art. 293 B du CGI</em><br/>
              Ce document fait office de bon de livraison et de facture.
            </div>
          </body>
        </html>
      `);
      fenetre.document.close();
      setTimeout(() => fenetre.print(), 500);
    }
  };

  // Compteur messages non lus pour le badge
  const nbNonLus = messages.filter(m => !m.lu).length;

  return (
  <div className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-20 font-sans">
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <Link href="/" className="text-xl font-black uppercase tracking-tighter italic">
          SOLEIL<span className="text-[#FF4500]">SAVEURS</span>
        </Link>

        <nav className="flex bg-slate-100 p-1 rounded-2xl">
          {(['commandes', 'stock', 'catalogue'] as const).map(t => (
            <button key={t} onClick={() => setOnglet(t)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${onglet === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
              {t}
            </button>
          ))}
          {/* NOUVEAU : Onglet Messages avec badge */}
          <button
            onClick={() => setOnglet('messages')}
            className={`relative px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${onglet === 'messages' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Messages
            {nbNonLus > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF4500] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {nbNonLus}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs font-bold w-48 focus:ring-2 focus:ring-[#FF4500]" />
          </div>
          <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"><RefreshCcw className="w-4 h-4" /></button>
        </div>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-6 mt-10">

      {/* --- SECTION COMMANDES --- */}
      {onglet === 'commandes' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Commandes</p>
              <p className="text-4xl font-black italic text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border-l-4 border-l-[#FF4500]">
              <p className="text-[10px] font-black uppercase text-[#FF4500] tracking-widest mb-1">À préparer</p>
              <p className="text-4xl font-black italic text-slate-900">{stats.aPreparer}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Chiffre d'Affaires</p>
              <p className="text-4xl font-black italic">{stats.caTotal.toFixed(2)}€</p>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl w-fit">
            {['Toutes', 'À préparer', 'livrée'].map((s) => (
              <button
                key={s}
                onClick={() => setFiltreStatut(s as any)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtreStatut === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {calculerBesoinStock().length > 0 && (
            <div className="bg-[#FF4500]/5 rounded-[40px] p-10 border border-[#FF4500]/10 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-xl text-slate-900 italic tracking-tighter uppercase">Besoin de préparation</h2>
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Imprimer Liste
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {calculerBesoinStock().map(([nom, data]: any) => (
                  <div key={nom} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{nom}</span><br/>
                    <span className="font-black text-xl text-slate-900">{data.quantite} {data.unite}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {commandesFiltrees.map(cmd => (
              <div key={cmd.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 group hover:border-[#FF4500]/20 transition-all">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs italic">
                        #{cmd.id.toString().slice(-3)}
                      </div>
                      <div>
                        <h3 className="font-black text-xl uppercase italic tracking-tighter">{cmd.nom_client}</h3>
                        <p className="text-[11px] font-black text-[#FF4500] uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {cmd.telephone_client || 'Pas de numéro'}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {cmd.adresse_livraison}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {cmd.telephone_client && (
                        <>
                          <a href={`tel:${cmd.telephone_client}`} className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm" title="Appeler">
                            <Phone className="w-4 h-4" />
                          </a>
                          <button onClick={() => envoyerWhatsApp(cmd)} className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm" title="WhatsApp">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => imprimerBon(cmd)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-[#FF4500] hover:text-white transition-all shadow-sm">
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cmd.contenu_panier?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm font-black p-2 bg-white rounded-lg border border-slate-100">
                          <span className="text-slate-600 uppercase text-[10px] tracking-tighter">{item.name || item.nom}</span>
                          <span className="text-slate-900">{item.quantity || item.quantite} {item.unite || ''}</span>
                        </div>
                      ))}
                    </div>

                    {cmd.description_commande && (
                      <div className="mt-4 p-3 bg-white border-l-4 border-[#FF4500] rounded-r-xl shadow-sm">
                        <p className="text-[9px] font-black text-[#FF4500] uppercase tracking-widest mb-1">Note du client :</p>
                        <p className="text-xs text-slate-700 italic font-medium">"{cmd.description_commande}"</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between min-w-[150px]">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payé</p>
                    <p className="text-3xl font-black text-[#FF4500] italic tracking-tighter">{cmd.total?.toFixed(2)}€</p>
                  </div>
                  {cmd.statut !== 'livrée' ? (
                    <button 
                      onClick={() => updateStatut(cmd.id, 'livrée')} 
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#FF4500] shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Valider Livraison
                    </button>
                  ) : (
                    <div className="w-full text-center py-4 bg-green-50 text-green-600 rounded-2xl font-black text-xs border border-green-200">
                      ✓ LIVRÉE
                    </div>
                  )}
                </div>
              </div>
            ))}
            {commandesFiltrees.length === 0 && <p className="text-center text-slate-400 py-10 font-black uppercase text-xs tracking-widest">Aucune commande trouvée</p>}
          </div>
        </div>
      )}

      {/* --- SECTION STOCK --- */}
      {onglet === 'stock' && (
        <div className="animate-in fade-in space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h2 className="font-black text-2xl mb-8 text-slate-900 italic uppercase tracking-tighter">Gestion des stocks & Promos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {produitsFiltres.map(p => (
                <div key={p.id} className="p-6 bg-[#FDFCF9] rounded-[2.5rem] border border-slate-100 flex flex-col items-center relative transition-all hover:shadow-md group">
                  {(p.promotion > 0 || p.seuil_achat > 0) && (
                    <div className="absolute top-4 right-4 bg-[#FF4500] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase z-10 shadow-sm animate-pulse">
                      {p.promotion > 0 ? `-${p.promotion}%` : `${p.seuil_achat}+${p.quantite_offerte}`}
                    </div>
                  )}
                  <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden mb-4 shadow-sm border border-slate-50 flex items-center justify-center">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <Package className="w-10 h-10 text-slate-200" />}
                  </div>
                  <p className="font-black text-sm mb-1 text-center text-slate-800 uppercase italic truncate w-full">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">{p.category}</p>
                  
                  <div className="flex items-center gap-3 my-2 bg-white p-2 rounded-2xl shadow-inner border border-slate-100 w-full justify-between">
                    <button onClick={() => ajusterStock(p.id, p.stock, -1)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl font-black hover:bg-red-50 hover:text-red-500">-</button>
                    <div className="flex flex-col items-center">
                      <input type="number" step={p.unite === 'kg' ? "0.1" : "1"} value={p.stock} onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) supabase.from('products').update({ stock: val }).eq('id', p.id).then(() => fetchData());
                      }} className={`w-14 text-center font-black text-lg bg-transparent border-none focus:ring-0 p-0 ${p.stock <= 5 ? 'text-red-500' : 'text-slate-900'}`} />
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{p.unite || 'unité'}</span>
                    </div>
                    <button onClick={() => ajusterStock(p.id, p.stock, 1)} className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl font-black shadow-lg hover:bg-[#FF4500] transition-all">+</button>
                  </div>

                  <div className="w-full mt-2">
                    <button onClick={() => setPromoProdId(promoProdId === p.id ? null : p.id)} className={`w-full text-[9px] font-black uppercase tracking-widest py-3 rounded-xl transition-all ${(p.promotion > 0 || p.seuil_achat > 0) ? 'bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      {(p.promotion > 0 || p.seuil_achat > 0) ? '🔥 Modifier Promo' : 'Ajouter Promo'}
                    </button>
                    {promoProdId === p.id && (
                      <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-200 z-20">
                        <div>
                          <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-tighter">Remise %</p>
                          <input type="number" min="0" max="100" placeholder="Ex: 20" className="w-full p-2.5 text-xs font-bold border-none bg-slate-50 rounded-lg text-center" onChange={(e) => { setPourcentage(parseInt(e.target.value) || 0); setSeuilAchat(0); setQteOfferte(0); }} />
                        </div>
                        {p.unite === 'kg' ? (
                          <div className="border-t border-slate-50 pt-2">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-tighter">Lot au kg (X kg achetés + Y kg offerts)</p>
                            <div className="flex gap-2">
                              <div className="w-1/2">
                                <input type="number" step="0.5" min="0" placeholder="Ex: 2 kg" className="w-full p-2.5 text-xs font-bold border-none bg-slate-50 rounded-lg text-center" onChange={(e) => { setSeuilAchat(parseFloat(e.target.value) || 0); setPourcentage(0); }} />
                                <p className="text-[7px] text-center text-slate-300 font-bold mt-0.5 uppercase">Payés (kg)</p>
                              </div>
                              <div className="w-1/2">
                                <input type="number" step="0.5" min="0" placeholder="Ex: 0.5 kg" className="w-full p-2.5 text-xs font-bold border-none bg-slate-50 rounded-lg text-center" onChange={(e) => setQteOfferte(parseFloat(e.target.value) || 0)} />
                                <p className="text-[7px] text-center text-slate-300 font-bold mt-0.5 uppercase">Offerts (kg)</p>
                              </div>
                            </div>
                            {seuilAchat > 0 && qteOfferte > 0 && (
                              <p className="text-[8px] font-black text-[#FF4500] mt-1 text-center">{seuilAchat} kg achetés = {qteOfferte} kg offerts</p>
                            )}
                          </div>
                        ) : (
                          <div className="border-t border-slate-50 pt-2">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-tighter">Lot à l'unité (X achetés + Y offerts)</p>
                            <div className="flex gap-2">
                              <div className="w-1/2">
                                <input type="number" step="1" min="0" placeholder="Ex: 3" className="w-full p-2.5 text-xs font-bold border-none bg-slate-50 rounded-lg text-center" onChange={(e) => { setSeuilAchat(parseFloat(e.target.value) || 0); setPourcentage(0); }} />
                                <p className="text-[7px] text-center text-slate-300 font-bold mt-0.5 uppercase">Payés</p>
                              </div>
                              <div className="w-1/2">
                                <input type="number" step="1" min="0" placeholder="Ex: 1" className="w-full p-2.5 text-xs font-bold border-none bg-slate-50 rounded-lg text-center" onChange={(e) => setQteOfferte(parseFloat(e.target.value) || 0)} />
                                <p className="text-[7px] text-center text-slate-300 font-bold mt-0.5 uppercase">Offerts</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => appliquerPromo(p.id)} className="flex-1 bg-slate-900 text-white text-[9px] font-black py-3 rounded-lg shadow-md hover:bg-[#FF4500]">VALIDER</button>
                          {(p.promotion > 0 || p.seuil_achat > 0) && (
                            <button onClick={() => { setPourcentage(0); setSeuilAchat(0); setQteOfferte(0); appliquerPromo(p.id); }} className="px-3 bg-red-100 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- SECTION CATALOGUE --- */}
      {onglet === 'catalogue' && (
        <div className="space-y-12 animate-in fade-in">
          <section className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-sm max-w-4xl mx-auto">
            <h2 className="font-black text-3xl mb-10 italic uppercase tracking-tighter">Nouveau <span className="text-[#FF4500]">Produit</span></h2>
            <form onSubmit={ajouterProduit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3 border-4 border-dashed border-slate-100 rounded-[32px] p-10 bg-slate-50 flex flex-col items-center justify-center relative cursor-pointer hover:border-[#FF4500]/20 transition-all group">
                {nouveauProd.image_url ? <img src={nouveauProd.image_url} className="h-32 w-32 object-cover rounded-3xl shadow-lg border-4 border-white" /> : <Plus className="w-12 h-12 text-slate-200 group-hover:text-[#FF4500]" />}
                <input type="file" accept="image/*" onChange={(e) => handleUpload(e, false)} className="absolute inset-0 opacity-0 cursor-pointer" />
                {uploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center font-black text-[#FF4500] rounded-[32px] animate-pulse">UPLOAD...</div>}
              </div>
              
              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Nom du produit</label>
                <input type="text" placeholder="ex: Salade Batavia" className="w-full p-5 bg-slate-100 rounded-2xl font-black border-none text-sm" value={nouveauProd.name} onChange={e => setNouveauProd({...nouveauProd, name: e.target.value})} required />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Prix de base (€)</label>
                <input type="number" step="0.01" placeholder="0.00" className="w-full p-5 bg-slate-100 rounded-2xl font-black border-none text-sm" value={nouveauProd.price || ''} onChange={e => setNouveauProd({...nouveauProd, price: parseFloat(e.target.value)})} required />
              </div>
              
              <select className="p-5 bg-slate-100 rounded-2xl font-black border-none text-xs uppercase" value={nouveauProd.category} onChange={e => setNouveauProd({...nouveauProd, category: e.target.value})}>
                  <option value="Légumes">🥦 Légumes</option>
                  <option value="Fruits">🍎 Fruits</option>
                  <option value="Épicerie">🍯 Épicerie</option>
              </select>

              <select className="p-5 bg-slate-100 rounded-2xl font-black border-none text-xs uppercase" value={nouveauProd.unite} onChange={e => setNouveauProd({...nouveauProd, unite: e.target.value})}>
                  <option value="kg">kilogramme (kg)</option>
                  <option value="pièce">unité (pièce)</option>
                  <option value="botte">botte</option>
                  <option value="barquette">barquette</option>
              </select>

              <div className="relative">
                  <input type="number" step={nouveauProd.unite === 'kg' ? '0.1' : '1'} placeholder="Stock initial" className="w-full p-5 bg-slate-100 rounded-2xl font-black border-none text-sm" value={nouveauProd.stock || ''} onChange={e => setNouveauProd({...nouveauProd, stock: parseFloat(e.target.value)})} required />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#FF4500] uppercase">{nouveauProd.unite}</span>
              </div>

              <input type="text" placeholder="Provenance (ex: France)" className="p-5 bg-slate-100 rounded-2xl font-black border-none text-sm" value={nouveauProd.provenance} onChange={e => setNouveauProd({...nouveauProd, provenance: e.target.value})} />
              <input type="text" placeholder="Description courte" className="md:col-span-2 p-5 bg-slate-100 rounded-2xl font-black border-none text-sm" value={nouveauProd.description} onChange={e => setNouveauProd({...nouveauProd, description: e.target.value})} />

              {/* PROMOTION OPTIONNELLE */}
              <div className="md:col-span-3 border border-dashed border-slate-200 rounded-3xl p-6 space-y-4 bg-slate-50/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promotion (optionnel)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Remise %</label>
                    <input
                      type="number" min="0" max="100" placeholder="Ex: 20"
                      className="w-full p-4 bg-white rounded-xl font-black border border-slate-200 text-sm text-center focus:border-[#FF4500] outline-none"
                      value={nouveauProd.promotion || ''}
                      onChange={e => setNouveauProd({ ...nouveauProd, promotion: parseFloat(e.target.value) || 0, seuil_achat: 0, quantite_offerte: 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Qté payée (lot)</label>
                    <input
                      type="number" step="0.5" min="0"
                      placeholder={nouveauProd.unite === 'kg' ? 'Ex: 2 kg' : 'Ex: 3'}
                      className="w-full p-4 bg-white rounded-xl font-black border border-slate-200 text-sm text-center focus:border-[#FF4500] outline-none"
                      value={nouveauProd.seuil_achat || ''}
                      onChange={e => setNouveauProd({ ...nouveauProd, seuil_achat: parseFloat(e.target.value) || 0, promotion: 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Qté offerte (lot)</label>
                    <input
                      type="number" step="0.5" min="0"
                      placeholder={nouveauProd.unite === 'kg' ? 'Ex: 0.5 kg' : 'Ex: 1'}
                      className="w-full p-4 bg-white rounded-xl font-black border border-slate-200 text-sm text-center focus:border-[#FF4500] outline-none"
                      value={nouveauProd.quantite_offerte || ''}
                      onChange={e => setNouveauProd({ ...nouveauProd, quantite_offerte: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 font-bold">Remise % ou lot — pas les deux en même temps. Le lot fonctionne en kg (ex: 2 kg achetés = 0.5 kg offert).</p>
              </div>

              <button type="submit" disabled={uploading} className="md:col-span-3 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-xl hover:bg-[#FF4500] hover:scale-[1.01] transition-all disabled:opacity-50">
                Ajouter au catalogue
              </button>
            </form>
          </section>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {produitsFiltres.map(p => (
              <div key={p.id} className={`bg-white p-6 rounded-[32px] border ${editingProdId === p.id ? 'border-[#FF4500] ring-4 ring-[#FF4500]/5' : 'border-slate-100'} flex flex-col group transition-all`}>
                {editingProdId === p.id ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex gap-4 items-center">
                       <div className="relative w-20 h-20">
                          <img src={editFormData.image_url} className="w-full h-full object-cover rounded-2xl" />
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <div className="absolute bottom-0 right-0 bg-black text-white p-1 rounded-full"><Edit3 className="w-3 h-3"/></div>
                       </div>
                       <div className="flex-1">
                          <input type="text" className="w-full bg-slate-50 border-none rounded-lg p-2 font-black text-sm mb-2" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                          <input type="number" className="w-full bg-slate-50 border-none rounded-lg p-2 font-black text-sm text-[#FF4500]" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: parseFloat(e.target.value)})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="bg-slate-50 border-none rounded-lg p-2 text-[10px] font-black uppercase" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})}>
                        <option value="Légumes">Légumes</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Épicerie">Épicerie</option>
                      </select>
                      <select className="bg-slate-50 border-none rounded-lg p-2 text-[10px] font-black uppercase" value={editFormData.unite} onChange={e => setEditFormData({...editFormData, unite: e.target.value})}>
                        <option value="kg">kg</option>
                        <option value="pièce">pièce</option>
                        <option value="botte">botte</option>
                      </select>
                    </div>
                    <input type="text" placeholder="Description" className="w-full bg-slate-50 border-none rounded-lg p-2 text-xs" value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} />
                    <div className="flex gap-2">
                      <button onClick={() => modifierProduit(p.id)} className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Save className="w-3 h-3"/> Enregistrer</button>
                      <button onClick={() => setEditingProdId(null)} className="px-4 bg-slate-100 text-slate-400 py-2 rounded-xl text-[10px] font-black uppercase"><X className="w-4 h-4"/></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl overflow-hidden flex-shrink-0 shadow-inner">
                      {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-6 text-slate-200" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-sm uppercase italic tracking-tighter">{p.name}</h3>
                      <p className="text-[10px] font-bold text-[#FF4500] uppercase tracking-tighter">{p.price?.toFixed(2)}€ / {p.unite}</p>
                      {p.provenance && <p className="text-[9px] text-slate-400 font-medium italic">Origine: {p.provenance}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingProdId(p.id); setEditFormData(p); }} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => supprimerProduit(p.id)} className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECTION MESSAGES --- */}
      {onglet === 'messages' && (
        <div className="space-y-6 animate-in fade-in duration-500">

          {/* En-tête avec stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Messages</p>
              <p className="text-4xl font-black italic text-slate-900">{messages.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border-l-4 border-l-[#FF4500]">
              <p className="text-[10px] font-black uppercase text-[#FF4500] tracking-widest mb-1">Non lus</p>
              <p className="text-4xl font-black italic text-slate-900">{nbNonLus}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Traités</p>
              <p className="text-4xl font-black italic">{messages.filter(m => m.lu).length}</p>
            </div>
          </div>

          {/* Liste des messages */}
          {messages.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm">
              <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="font-black uppercase text-sm text-slate-400 tracking-widest">Aucun message pour l'instant</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`bg-white rounded-[2rem] border shadow-sm transition-all ${
                    !msg.lu ? 'border-[#FF4500]/30 shadow-[#FF4500]/5' : 'border-slate-100'
                  }`}
                >
                  {/* En-tête du message */}
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar initiale */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${!msg.lu ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {(msg.nom || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm uppercase italic tracking-tighter">{msg.nom || 'Inconnu'}</h3>
                          {!msg.lu && (
                            <span className="text-[8px] font-black bg-[#FF4500] text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Nouveau</span>
                          )}
                        </div>
                        <a href={`mailto:${msg.email}`} className="text-[11px] font-bold text-[#FF4500] hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {msg.email}
                        </a>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                          {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleLu(msg.id, msg.lu)}
                        title={msg.lu ? 'Marquer non lu' : 'Marquer comme lu'}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"
                      >
                        {msg.lu ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setReponseOuvert(reponseOuvert === msg.id ? null : msg.id); setReponseTexte(''); }}
                        className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#FF4500] transition-all"
                      >
                        <Send className="w-3.5 h-3.5" /> Répondre
                      </button>
                      <button
                        onClick={() => supprimerMessage(msg.id)}
                        className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Corps du message */}
                  <div className="px-6 pb-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{msg.message}</p>
                    </div>
                  </div>

                  {/* Zone de réponse (dépliable) */}
                  {reponseOuvert === msg.id && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Votre réponse à {msg.nom} ({msg.email})
                        </p>
                        <textarea
                          value={reponseTexte}
                          onChange={e => setReponseTexte(e.target.value)}
                          placeholder={`Bonjour ${msg.nom},\n\nEcrivez votre réponse ici...`}
                          rows={5}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-700 focus:border-[#FF4500] focus:ring-0 outline-none resize-none transition-all"
                        />
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => envoyerReponse(msg)}
                            disabled={!reponseTexte.trim() || envoiEnCours}
                            className="flex items-center gap-2 bg-[#FF4500] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-orange-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Envoyer via Mail
                          </button>
                          <button
                            onClick={() => { setReponseOuvert(null); setReponseTexte(''); }}
                            className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all"
                          >
                            Annuler
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-300 font-bold uppercase mt-2 tracking-widest">
                          → Ouvrira votre client mail avec la réponse pré-remplie
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </main>
  </div>
);
}
