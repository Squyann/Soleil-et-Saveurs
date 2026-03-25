'use client';
import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, MapPin, CreditCard, Banknote, Phone, User, Loader2, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// AJOUT de user dans l'interface pour corriger l'erreur dans page.tsx
interface PanierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any; 
}

export default function PanierDrawer({ isOpen, onClose, user: propUser }: PanierDrawerProps) {
  // On utilise l'utilisateur passé par la page Home, sinon on garde l'état local
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

  // Mise à jour de l'utilisateur si la prop change
  useEffect(() => {
    if (propUser) setUser(propUser);
  }, [propUser]);

  // Initialisation de la session utilisateur (fallback sécurité)
  useEffect(() => {
    const getSession = async () => {
      if (!user) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        setUser(supabaseUser);
      }
    };
    if (isOpen) getSession();
  }, [isOpen, user]);

  const calculerPrixLigne = (item: any) => {
    const qte = item.quantite || 0;
    const p = item; 
    const remise = p.promotion || 0;
    const prixApresRemise = remise > 0 ? p.price * (1 - remise / 100) : p.price;
    const seuil = p.seuil_achat || 0;
    const offert = p.quantite_offerte || 0;

    if (seuil > 0 && offert > 0 && qte >= (seuil + offert)) {
      const nombreDeLots = Math.floor(qte / (seuil + offert));
      const unitesGratuites = nombreDeLots * offert;
      return (qte - unitesGratuites) * parseFloat(prixApresRemise);
    }
    return qte * parseFloat(prixApresRemise);
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

  const sousTotal = (panier || []).reduce((acc, item) => acc + calculerPrixLigne(item), 0);
  const fraisLivraison = sousTotal > 45 || sousTotal === 0 ? 0 : 2.50;
  const totalFinal = sousTotal + fraisLivraison;

  const envoyerCommande = async () => {
    if (!user) {
      onClose();
      router.push('/login');
      return;
    }

    if (!nom || !telephone || !adresse || !distanceValide) return;
    setChargement(true);
    
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

    // Commande en espèces
    setTimeout(() => {
      alert("Commande reçue ! Nous vous contactons sur WhatsApp.");
      localStorage.removeItem('mon-panier');
      setPanier([]);
      setChargement(false);
      onClose();
    }, 1500);
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
              panier.map((item) => (
                <div key={item.id} className="flex gap-4 items-center bg-white p-4 rounded-3xl border border-slate-50 shadow-sm">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">
                    {item.img}
                  </div>
                  <div className="flex-1">
                    <p className="font-black uppercase text-xs text-slate-800">{item.name}</p>
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
              ))
            )}
          </div>

          {(panier || []).length > 0 && (
            <div className="space-y-5 pt-6 border-t border-slate-100">
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900">Infos de livraison</h3>
              
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
              <span>{sousTotal.toFixed(2)}€</span>
            </div>
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