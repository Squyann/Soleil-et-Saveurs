'use client';
import React, { useEffect } from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage() {
  // On vide le panier local dès que la page se charge
  useEffect(() => {
    localStorage.removeItem('mon-panier');
    // On prévient le reste de l'app que le panier est vide
    window.dispatchEvent(new Event('storage'));
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-xl border border-slate-50 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        
        {/* Icône de succès animée */}
        <div className="relative mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <div className="absolute inset-0 rounded-full border-4 border-green-500/20 animate-ping" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            Commande Confirmée !
          </h1>
          <p className="text-slate-500 font-medium italic">
            Merci pour votre confiance. Votre régal arrive bientôt !
          </p>
        </div>

        <div className="bg-slate-50 rounded-3xl p-6 text-left space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-sm font-bold">1</div>
            <p className="text-xs font-bold text-slate-600 uppercase leading-relaxed">
              Vous allez recevoir un récapitulatif par e-mail.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-sm font-bold">2</div>
            <p className="text-xs font-bold text-slate-600 uppercase leading-relaxed">
              Notre livreur vous contactera par téléphone dès son départ.
            </p>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Link 
            href="/" 
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-[#FF4500] transition-all shadow-lg flex items-center justify-center gap-3 group"
          >
            Retour à l'accueil
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Soleil Saveurs Direct — Qualité Garantie
          </p>
        </div>
      </div>
    </div>
  );
}