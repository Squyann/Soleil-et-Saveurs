'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, ShoppingBag, MapPin, CreditCard, Banknote, Phone, User, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PanierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PanierDrawer({ isOpen, onClose }: PanierDrawerProps) {
  const [panier, setPanier] = useState<any[]>([]);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [methodePaiement, setMethodePaiement] = useState<'Espèces' | 'Carte'>('Espèces');
  const [chargement, setChargement] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [distanceValide, setDistanceValide] = useState(true);

  // Ton calcul de prix spécifique (gardé intact)
  const calculerPrixLigne = (item: any) => {
    const qte = item.quantite;
    const p = item.produits || item;
    const remise = p.promotion || 0;
    const prixApresRemise = remise > 0 ? p.prix * (1 - remise / 100) : p.prix;
    const aUneOffre = (p.seuil_achat ?? 0) > 0 && (p.quantite_offerte ?? 0) > 0;
    
    if (aUneOffre && qte >= (p.seuil_achat + p.quantite_offerte)) {
      const nombreDeLots = Math.floor(qte / (p.seuil_achat + p.quantite_offerte));
      const unitesGratuites = nombreDeLots * p.quantite_offerte;
      return (qte - unitesGratuites) * prixApresRemise;
    }
    return qte * prixApresRemise;
  };

  // Logique de récupération du panier (Simplifiée pour le Drawer)
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('mon-panier');
      if (saved) setPanier(JSON.parse(saved));
    }
  }, [isOpen]);

  const sousTotal = panier.reduce((acc, item) => acc + calculerPrixLigne(item), 0);
  const fraisLivraison = sousTotal > 45 || sousTotal === 0 ? 0 : 2.50; // Simplifié pour l'exemple
  const totalFinal = sousTotal + fraisLivraison;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Le Panier (Le tiroir) */}
      <div className="relative w-full max-w-lg bg-[#FFFCF0] border-l-8 border-black h-full flex flex-col shadow-[-20px_0_0_rgba(0,0,0,0.1)]">
        
        {/* HEADER */}
        <div className="p-6 border-b-4 border-black flex justify-between items-center bg-black text-white">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Mon Panier</h2>
          <button onClick={onClose} className="hover:rotate-90 transition-transform bg-[#FF4500] p-1 border-2 border-white">
            <X className="w-8 h-8 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* LISTE DES PRODUITS */}
          <div className="space-y-4">
            {panier.length === 0 ? (
              <div className="text-center py-20 border-4 border-dashed border-black/10">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-black uppercase text-gray-400">Votre panier est vide</p>
              </div>
            ) : (
              panier.map((item, idx) => (
                <div key={idx} className="flex gap-4 bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                  <div className="w-16 h-16 bg-gray-100 border-2 border-black flex items-center justify-center text-3xl">
                    {item.img || '📦'}
                  </div>
                  <div className="flex-1">
                    <p className="font-black uppercase text-sm leading-none">{item.nom}</p>
                    <p className="text-xs font-bold text-[#FF4500] mt-1">{item.quantite} x {item.unite}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">{calculerPrixLigne(item).toFixed(2)}€</p>
                    <button className="text-red-500 hover:scale-110 transition-transform mt-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FORMULAIRE DE LIVRAISON (Style Brutaliste) */}
          {panier.length > 0 && (
            <div className="space-y-6 pt-6 border-t-4 border-black">
              <h3 className="font-black uppercase text-xl tracking-tight">Infos Livraison</h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 opacity-30" />
                  <input type="text" placeholder="NOM COMPLET" value={nom} onChange={(e)=>setNom(e.target.value)} className="w-full bg-white border-4 border-black p-3 pl-12 font-bold uppercase text-sm focus:bg-[#FF4500]/5 outline-none" />
                </div>
                
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 opacity-30" />
                  <input type="tel" placeholder="TÉLÉPHONE" value={telephone} onChange={(e)=>setTelephone(e.target.value)} className="w-full bg-white border-4 border-black p-3 pl-12 font-bold uppercase text-sm focus:bg-[#FF4500]/5 outline-none" />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 opacity-30" />
                  <input type="text" placeholder="ADRESSE EXACTE" value={adresse} onChange={(e)=>setAdresse(e.target.value)} className="w-full bg-white border-4 border-black p-3 pl-12 font-bold uppercase text-sm focus:bg-[#FF4500]/5 outline-none" />
                </div>
              </div>

              {/* PAIEMENT */}
              <div className="grid grid-cols-2 gap-4">
                <button onClick={()=>setMethodePaiement('Espèces')} className={`p-4 border-4 border-black flex flex-col items-center gap-2 font-black transition-all ${methodePaiement === 'Espèces' ? 'bg-[#FF4500] text-white shadow-none' : 'bg-white shadow-[4px_4px_0_#000]'}`}>
                  <Banknote /> ESPÈCES
                </button>
                <button onClick={()=>setMethodePaiement('Carte')} className={`p-4 border-4 border-black flex flex-col items-center gap-2 font-black transition-all ${methodePaiement === 'Carte' ? 'bg-[#FF4500] text-white shadow-none' : 'bg-white shadow-[4px_4px_0_#000]'}`}>
                  <CreditCard /> CARTE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER TOTAL & VALIDATION */}
        {panier.length > 0 && (
          <div className="p-6 border-t-8 border-black bg-white space-y-4">
            <div className="flex justify-between font-black text-xl uppercase italic">
              <span>Total :</span>
              <span className="text-3xl tracking-tighter">{totalFinal.toFixed(2)}€</span>
            </div>
            <button className="w-full bg-black text-white p-5 font-black uppercase text-xl tracking-widest hover:bg-[#FF4500] transition-colors shadow-[6px_6px_0_#FF4500] active:shadow-none active:translate-x-1 active:translate-y-1">
              Confirmer la commande
            </button>
          </div>
        )}
      </div>
    </div>
  );
}