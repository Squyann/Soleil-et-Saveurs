'use client';
import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, MapPin, CreditCard, Banknote, Phone, User, Loader2, CheckCircle2, AlertCircle, LogIn, Gift, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const VILLES_RELAIS = [
  { nom: "Chatou", lat: 48.8897, lon: 2.1574 },
  { nom: "Croissy-sur-Seine", lat: 48.8794, lon: 2.1431 },
  { nom: "Mareil-sur-Mauldre", lat: 48.8944, lon: 1.8681 },
  { nom: "Saint-Nom-la-Bretèche", lat: 48.8594, lon: 2.0186 },
  { nom: "Plaisir", lat: 48.8111, lon: 1.9472 },
];

function calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function validerZoneLivraison(adresse: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`);
    const data = await res.json();
    const feat = data.features?.[0];
    if (!feat) return null;
    const [lon, lat] = feat.geometry.coordinates;
    const minDist = Math.min(...VILLES_RELAIS.map(v => calculerDistance(lat, lon, v.lat, v.lon)));
    return minDist <= 5;
  } catch {
    return null;
  }
}

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
  const [dbProfile, setDbProfile] = useState<{ loyalty_points: number; has_referral_discount: boolean } | null>(null);
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [applyReferral, setApplyReferral] = useState(false);
  const [creneaux, setCreneaux] = useState<string[]>([]);
  const [selectedCreneau, setSelectedCreneau] = useState<string>('');

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
        const meta = currentUser.user_metadata || {};
        setNom(meta.full_name || `${meta.first_name || ''} ${meta.last_name || ''}`.trim());
        setTelephone(meta.phone || '');
        if (meta.address) {
          setAdresse(meta.address);
          validerZoneLivraison(meta.address).then(v => setDistanceValide(v));
        }

        const { data: prof } = await supabase
          .from('profiles')
          .select('loyalty_points, has_referral_discount')
          .eq('user_id', currentUser.id)
          .single();
        if (prof) setDbProfile(prof);
      }
    };

    if (isOpen) {
      setApplyLoyalty(false);
      setApplyReferral(false);
      setSelectedCreneau('');
      fetchUserData();
      supabase.from('creneaux').select('label').eq('actif', true).then(({ data }) => {
        if (data) setCreneaux(data.map((c: any) => c.label));
      });
    }
  }, [isOpen, user]);

  const calculerPrixLigne = (item: any) => {
    const qteTotale = item.quantite || 0;
    const qteEffective = item.unite === 'g' ? qteTotale / 1000 : qteTotale;

    // Prix dégressif : à partir d'un seuil, tout passe au prix réduit
    if (item.seuil_promo_qte > 0 && item.prix_promo > 0 && qteEffective >= item.seuil_promo_qte) {
      return qteEffective * item.prix_promo;
    }

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

    return qteEffective * prixUnitaire;
  };

  const calculerEconomieTotale = () => {
    return (panier || []).reduce((acc, item) => {
      const prixNormalSansPromo = item.unite === 'g'
        ? ((item.quantite || 0) / 1000) * parseFloat(item.price)
        : (item.quantite || 0) * parseFloat(item.price);
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

  const updateQuantity = (id: number, delta: number, unite?: string) => {
    const nouveauPanier = (panier || []).map(item => {
      if (item.id === id) {
        if (delta === 0) return { ...item, quantite: 0 };
        const step = item.unite === 'kg' ? 0.5 : item.unite === 'g' ? (item.pas_g || 100) : 1;
        const actualDelta = delta > 0 ? step : -step;
        const newQte = Math.min(
          item.stock ?? Infinity,
          Math.max(step, parseFloat(((item.quantite || 0) + actualDelta).toFixed(2)))
        );
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
    const [lon, lat] = feat.geometry.coordinates;
    const minDist = Math.min(...VILLES_RELAIS.map(v => calculerDistance(lat, lon, v.lat, v.lon)));
    setDistanceValide(minDist <= 5);
  };

  const sousTotalFinal = (panier || []).reduce((acc, item) => acc + calculerPrixLigne(item), 0);
  const economie = calculerEconomieTotale();
  const remisePct = (applyLoyalty ? 10 : 0) + (applyReferral ? 10 : 0);
  const remiseMontant = sousTotalFinal * remisePct / 100;
  const totalApresRemise = sousTotalFinal - remiseMontant;
  const fraisLivraison = totalApresRemise === 0 || totalApresRemise < 10 ? 0
    : totalApresRemise >= 30 ? 0
    : Math.round(2.50 * (30 - totalApresRemise) / 20 * 100) / 100;
  const totalFinal = totalApresRemise + fraisLivraison;
  const minimumNonAtteint = user && (panier || []).length > 0 && totalApresRemise < 10;

  const envoyerCommande = async () => {
    if (!user) {
      onClose();
      router.push('/login');
      return;
    }

    if (!nom || !telephone || !adresse || !distanceValide) return;
    if (creneaux.length > 0 && !selectedCreneau) return;
    setChargement(true);

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
          description_commande: desc,
          contenu_panier: panier,
          email_client: user.email,
          creneau_livraison: selectedCreneau || null,
        }]);

      if (error) throw error;

      // Mise à jour des points de fidélité et remises
      const pointsGagnes = Math.floor(totalApresRemise);
      const newPoints = applyLoyalty
        ? pointsGagnes
        : (dbProfile?.loyalty_points ?? 0) + pointsGagnes;
      const profileUpdate: Record<string, any> = { loyalty_points: Math.max(0, newPoints) };
      if (applyReferral) profileUpdate.has_referral_discount = false;

      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', user.id);

      // Notifications email — non bloquant
      fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commande: {
            nom,
            telephone,
            adresse,
            email_client: user.email,
            methode_paiement: 'Espèces',
            panier: panier.map(item => ({
              name: item.name,
              quantite: item.quantite,
              unite: item.unite || '',
              prix_ligne: calculerPrixLigne(item),
            })),
            creneau_livraison: selectedCreneau || null,
            remise_pct: remisePct,
            remise_montant: remiseMontant,
            frais_livraison: fraisLivraison,
            total: totalFinal,
          },
        }),
      }).catch(err => console.error('Notification admin échouée:', err));

      alert("Commande reçue ! Nous vous contactons sur WhatsApp.");
      localStorage.removeItem('mon-panier');
      window.dispatchEvent(new Event('storage'));
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
                const qteEffective = item.unite === 'g' ? item.quantite / 1000 : item.quantite;
                const prixDegressifActif = item.seuil_promo_qte > 0 && item.prix_promo > 0 && qteEffective >= item.seuil_promo_qte;

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
                        {prixDegressifActif && (
                          <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                            {item.prix_promo.toFixed(2)}€/{item.unite === 'g' ? 'kg' : item.unite}
                          </span>
                        )}
                        {item.seuil_promo_qte > 0 && item.prix_promo > 0 && !prixDegressifActif && (
                          <span className="bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            -{item.seuil_promo_qte}{item.unite === 'g' ? 'kg' : item.unite === 'pièce' ? ' pcs' : ` ${item.unite}`}: {item.prix_promo.toFixed(2)}€
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                         <button onClick={() => updateQuantity(item.id, -1, item.unite)} className="w-6 h-6 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50">-</button>
                         <span className="text-xs font-bold">{item.unite === 'g' ? (item.quantite < 1000 ? `${item.quantite}g` : `${(item.quantite/1000).toString().replace('.',',')}kg`) : `${item.quantite}${item.unite ? ` ${item.unite}` : ''}`}</span>
                         <button onClick={() => updateQuantity(item.id, 1, item.unite)} disabled={item.stock != null && item.quantite >= item.stock} className="w-6 h-6 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{calculerPrixLigne(item).toFixed(2)}€</p>
                      <button onClick={() => updateQuantity(item.id, 0, item.unite)} className="text-slate-300 hover:text-red-500 transition-colors mt-1">
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

              {/* REMISES DISPONIBLES */}
              {user && ((dbProfile?.loyalty_points ?? 0) >= 100 || dbProfile?.has_referral_discount) && (
                <div className="space-y-2">
                  <h3 className="font-black uppercase text-xs tracking-widest text-slate-900">Remises disponibles</h3>
                  {(dbProfile?.loyalty_points ?? 0) >= 100 && (
                    <label className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-green-200 transition-all">
                      <input
                        type="checkbox"
                        checked={applyLoyalty}
                        onChange={(e) => setApplyLoyalty(e.target.checked)}
                        className="w-4 h-4 accent-[#FF4500] shrink-0"
                      />
                      <div className="flex-1">
                        <p className="font-black text-[11px] text-slate-900 uppercase">Remise fidélité -10%</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{dbProfile?.loyalty_points} points · réinitialise à 0</p>
                      </div>
                      <span className="font-black text-xs text-green-600 shrink-0">-{(sousTotalFinal * 0.1).toFixed(2)}€</span>
                    </label>
                  )}
                  {dbProfile?.has_referral_discount && (
                    <label className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-green-200 transition-all">
                      <input
                        type="checkbox"
                        checked={applyReferral}
                        onChange={(e) => setApplyReferral(e.target.checked)}
                        className="w-4 h-4 accent-[#FF4500] shrink-0"
                      />
                      <div className="flex-1">
                        <p className="font-black text-[11px] text-slate-900 uppercase">Remise parrainage -10%</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Offerte par votre parrain</p>
                      </div>
                      <span className="font-black text-xs text-green-600 shrink-0">-{(sousTotalFinal * 0.1).toFixed(2)}€</span>
                    </label>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={()=>setMethodePaiement('Espèces')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 font-black text-[10px] transition-all ${methodePaiement === 'Espèces' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                    <Banknote className="w-5 h-5" /> ESPÈCES
                  </button>
                  <button onClick={()=>setMethodePaiement('Ligne')} className="p-4 rounded-2xl border flex flex-col items-center gap-2 font-black text-[10px] transition-all bg-white text-slate-300 border-slate-100 cursor-not-allowed opacity-60">
                    <CreditCard className="w-5 h-5" /> CARTE EN LIGNE
                  </button>
                </div>
                {methodePaiement === 'Ligne' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                      Paiement en ligne indisponible pour l'instant. Un règlement par carte est possible lors de la livraison.
                    </p>
                  </div>
                )}
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

            {remiseMontant > 0 && (
              <div className="flex justify-between text-[10px] font-black text-green-600 uppercase tracking-widest">
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Remise -{remisePct}%</span>
                <span>-{remiseMontant.toFixed(2)}€</span>
              </div>
            )}

            {totalApresRemise >= 10 && (
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Livraison</span>
                <span>{fraisLivraison === 0 ? 'GRATUIT' : fraisLivraison.toFixed(2) + '€'}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xl text-slate-900 pt-2">
              <span>TOTAL</span>
              <span className="text-2xl text-[#FF4500]">{totalFinal.toFixed(2)}€</span>
            </div>
          </div>
          
          {creneaux.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h3 className="font-black uppercase text-xs tracking-widest text-slate-900">Créneau de livraison</h3>
                <span className="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase">Requis</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {creneaux.map((creneau) => (
                  <button
                    key={creneau}
                    type="button"
                    onClick={() => setSelectedCreneau(creneau)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all font-bold text-[11px] uppercase tracking-wide ${
                      selectedCreneau === creneau
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedCreneau === creneau ? 'border-white' : 'border-slate-300'
                    }`}>
                      {selectedCreneau === creneau && <span className="w-2 h-2 bg-white rounded-full" />}
                    </span>
                    {creneau}
                  </button>
                ))}
              </div>
              {creneaux.length > 0 && !selectedCreneau && (
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wide pl-1">
                  Veuillez sélectionner un créneau pour valider
                </p>
              )}
            </div>
          )}

          {minimumNonAtteint && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[10px] font-black text-amber-700 uppercase">
                Minimum de commande : 10€ (encore {(10 - totalApresRemise).toFixed(2)}€)
              </p>
            </div>
          )}

          <button
            disabled={chargement || methodePaiement === 'Ligne' || !!minimumNonAtteint || (user && (!(panier || []).length || !distanceValide || !nom || !telephone || (creneaux.length > 0 && !selectedCreneau)))}
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