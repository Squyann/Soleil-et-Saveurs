'use client';
import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, MapPin, CreditCard, Banknote, Phone, User, Loader2, CheckCircle2, AlertCircle, LogIn, Gift, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface PanierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any; 
}

export default function PanierDrawer({ isOpen, onClose, user: propUser }: PanierDrawerProps) {
  const [user, setUser] = useState<any>(propUser || null);
  const [panier, setPanier] = useState<any[]>([]);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [methodePaiement, setMethodePaiement] = useState<'Espèces' | 'Ligne'>('Espèces');
  const [chargement, setChargement] = useState(false);
  const [distanceValide, setDistanceValide] = useState<boolean | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    if (propUser) setUser(propUser);
  }, [propUser]);

  useEffect(() => {
    const fetchUserData = async () => {
      let currentUser = user;
      
      if (!currentUser) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser) {
          setUser(supabaseUser);
          currentUser = supabaseUser;
        }
      }

      if (currentUser) {
        // RÉCUPÉRATION DEPUIS LES METADATA AUTH (plus besoin de la table 'profiles')
        const meta = currentUser.user_metadata || {};
        setNom(meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim());
        setTelephone(meta.phone || '');
        if (meta.address) {
          setAdresse(meta.address);
          if (meta.address.includes('78')) {
            setDistanceValide(true);
          }
        }
      }
    };

    if (isOpen) fetchUserData();
  }, [isOpen, user]);

  // LOGIQUE DE CALCUL : Gère % ET Quantité Offerte
  const calculerPrixLigne = (item: any) => {
    const qteTotale = item.quantite || 0;
    let prixUnitaire = parseFloat(item.price);

    if (item.promotion && item.promotion > 0) {
      prixUnitaire = prixUnitaire * (1 - item.promotion / 100);
    }

    const seuil = item.seuil_achat || 0;
    const offert = item.quantite_offerte || 0;

    if (seuil > 0 && offert > 0) {
      const tailleLot = seuil + offert;
      const nombreDeLots = Math.floor(qteTotale / tailleLot);
      const resteHorsLots = qteTotale % tailleLot;
      const qtePayante = (nombreDeLots * seuil) + Math.min(resteHorsLots, seuil);
      return qtePayante * prixUnitaire;
    }
    
    return qteTotale * prixUnitaire;
  };

  const calculerEconomieTotale = () => {
    return (panier || []).reduce((acc, item) => {
      const prixNormalSansPromo = (item.quantite || 0) * parseFloat(item.price);
      const prixFinal = calculerPrixLigne(item);
      return acc + (prixNormalSansPromo - prixFinal);
    }, 0);
  };

  useEffect(() => {
    const loadPanier = () => {
      const saved = localStorage.getItem('mon-panier');
      if (saved) {
        try {
            setPanier(JSON.parse(saved) || []);
        } catch (e) {
            setPanier([]);
        }
      }
    };
    if (isOpen) loadPanier();
    window.addEventListener('storage', loadPanier);
    return () => window.removeEventListener('storage', loadPanier);
  }, [isOpen]);

  const updateQuantity = (id: number, delta: number) => {
    const nouveauPanier = (panier || []).map(item => {
      if (item.id === id) {
        const newQte = Math.max(0, (item.quantite || 0) + delta);
        return { ...item, quantite: newQte };
      }
      return item;
    }).filter(item => item.quantite > 0);
    
    setPanier(nouveauPanier);
    localStorage.setItem('mon-panier', JSON.stringify(nouveauPanier));
    window.dispatchEvent(new Event('storage'));
  };

  const handleAdresseChange = async (val: string) => {
    setAdresse(val);
    if (val && val.length > 5) {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSuggestions(data.features || []);
      } catch (err) { 
        console.error(err); 
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const selectionnerAdresse = (feat: any) => {
    setAdresse(feat.properties.label);
    setSuggestions([]);
    const cp = feat.properties.postcode;
    if (cp && cp.startsWith('78')) {
      setDistanceValide(true);
    } else {
      setDistanceValide(false);
    }
  };

  const sousTotalFinal = (panier || []).reduce((acc, item) => acc + calculerPrixLigne(item), 0);
  const economie = calculerEconomieTotale();
  const fraisLivraison = sousTotalFinal > 45 || sousTotalFinal === 0 ? 0 : 2.50;
  const totalFinal = sousTotalFinal + fraisLivraison;

  const envoyerCommande = async () => {
    if (!user) {
      onClose();
      router.push('/login');
      return;
    }

    if (!nom || !telephone || !adresse || !distanceValide) return;
    setChargement(true);

    // --- SYNCHRONISATION AVEC AUTH.UPDATEUSER ---
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: nom,
          phone: telephone,
          address: adresse
        }
      });
    } catch (err) {
      console.error("Erreur sync profil:", err);
    }
    
    if (methodePaiement === 'Ligne') {
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            items: panier,
            metadata: { nom, telephone, adresse, user_id: user.id }
          }),
        });
        const { url } = await response.json();
        if (url) window.location.href = url;
      } catch (err) {
        alert("Erreur lors de l'initialisation du paiement.");
      } finally {
        setChargement(false);
      }
      return;
    }

    // --- ENREGISTREMENT DANS SUPABASE POUR LE MODE ESPÈCES ---
    try {
      // Création d'une description textuelle lisible pour l'admin
      const desc = panier.map(item => `${item.quantite}x ${item.name}`).join(', ');

      const { error } = await supabase
        .from('commandes')
        .insert([{
          user_id: user.id,
          nom_client: nom,
          telephone_client: telephone,
          adresse_livraison: adresse,
          total: totalFinal,
          methode_paiement: 'Espèces',
          statut: 'En attente',
          description_commande: desc
        }]);

      if (error) throw error;

      alert("Commande reçue ! Nous vous contactons sur WhatsApp.");
      localStorage.removeItem('mon-panier');
      setPanier([]);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la commande.");
    } finally {
      setChargement(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#FDFCF9] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Mon Panier</h2>
            <p className="text-[10px] font-bold text-[#FF4500] uppercase tracking-[0.2em]">Soleil Saveurs Direct</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            {(panier || []).length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-200" />
                </div>
                <p className="font-bold text-slate-400 uppercase text-sm tracking-widest">Le panier est vide</p>
              </div>
            ) : (
              panier.map((item) => {
                const produitsOfferts = item.seuil_achat > 0 ? Math.floor(item.quantite / (item.seuil_achat + item.quantite_offerte)) * item.quantite_offerte : 0;

                return (
                  <div key={item.id} className="flex gap-4 items-center bg-white p-4 rounded-3xl border border-slate-50 shadow-sm">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🧺</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black uppercase text-xs text-slate-800">{item.name}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.promotion > 0 && (
                          <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-full">-{item.promotion}%</span>
                        )}
                        {produitsOfferts > 0 && (
                          <div className="flex items-center gap-1 text-[#FF4500] text-[9px] font-black uppercase">
                            <Gift className="w-3 h-3" /> {produitsOfferts} offert(s)
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                         <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50">-</button>
                         <span className="text-xs font-bold">{item.quantite}</span>
                         <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50">+</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{calculerPrixLigne(item).toFixed(2)}€</p>
                      <button onClick={() => updateQuantity(item.id, -item.quantite)} className="text-slate-300 hover:text-red-500 transition-colors mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {(panier || []).length > 0 && (
            <div className="space-y-5 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase text-sm tracking-widest text-slate-900">Infos de livraison</h3>
                {user && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold uppercase">Profil connecté</span>}
              </div>
              
              <div className="space-y-3">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" placeholder="NOM COMPLET" value={nom} onChange={(e)=>setNom(e.target.value)} className="w-full bg-white border border-slate-100 p-4 pl-12 rounded-2xl font-bold text-xs uppercase focus:border-[#FF4500] outline-none transition-all" />
                </div>
                
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="tel" placeholder="TÉLÉPHONE" value={telephone} onChange={(e)=>setTelephone(e.target.value)} className="w-full bg-white border border-slate-100 p-4 pl-12 rounded-2xl font-bold text-xs uppercase focus:border-[#FF4500] outline-none transition-all" />
                </div>

                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="ADRESSE (DANS LE 78)" 
                    value={adresse} 
                    onChange={(e) => handleAdresseChange(e.target.value)}
                    className="w-full bg-white border border-slate-100 p-4 pl-12 rounded-2xl font-bold text-xs uppercase focus:border-[#FF4500] outline-none transition-all" 
                  />
                  {(suggestions || []).length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-100 shadow-xl rounded-2xl mt-2 overflow-hidden">
                      {suggestions.map((s, i) => (
                        <button key={i} onClick={() => selectionnerAdresse(s)} className="w-full p-3 text-left text-[10px] font-bold uppercase border-b border-slate-50 hover:bg-slate-50">
                          {s.properties.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {distanceValide === false && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase">Désolé, nous livrons uniquement dans le 78.</p>
                  </div>
                )}
                {distanceValide === true && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase">Zone de livraison validée !</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setMethodePaiement('Espèces')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 font-black text-[10px] transition-all ${methodePaiement === 'Espèces' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                  <Banknote className="w-5 h-5" /> ESPÈCES
                </button>
                <button onClick={()=>setMethodePaiement('Ligne')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 font-black text-[10px] transition-all ${methodePaiement === 'Ligne' ? 'bg-[#FF4500] text-white border-[#FF4500] shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                  <CreditCard className="w-5 h-5" /> CARTE EN LIGNE
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Sous-total</span>
              <span>{(sousTotalFinal + economie).toFixed(2)}€</span>
            </div>
            
            {economie > 0 && (
              <div className="flex justify-between text-[10px] font-black text-green-600 uppercase tracking-widest">
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Économie promo</span>
                <span>-{economie.toFixed(2)}€</span>
              </div>
            )}

            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Livraison</span>
              <span>{fraisLivraison === 0 ? 'GRATUIT' : fraisLivraison.toFixed(2) + '€'}</span>
            </div>
            <div className="flex justify-between font-black text-xl text-slate-900 pt-2">
              <span>TOTAL</span>
              <span className="text-2xl text-[#FF4500]">{totalFinal.toFixed(2)}€</span>
            </div>
          </div>
          
          <button 
            disabled={chargement || (user && (!(panier || []).length || !distanceValide || !nom || !telephone))}
            onClick={envoyerCommande}
            className={`w-full ${!user ? 'bg-blue-600' : 'bg-slate-900'} disabled:bg-slate-100 disabled:text-slate-300 text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3`}
          >
            {chargement ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : !user ? (
              <>
                <LogIn className="w-5 h-5" />
                Se connecter pour commander
              </>
            ) : methodePaiement === 'Ligne' ? (
              'Payer par carte'
            ) : (
              'Confirmer la commande'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}