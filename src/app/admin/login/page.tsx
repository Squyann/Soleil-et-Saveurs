'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase'; // On importe Supabase
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- CONNEXION VIA SUPABASE AUTH ---
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Erreur d'authentification : " + error.message);
      setLoading(false);
    } else {
      // Si la connexion réussit, on redirige vers l'admin
      window.location.href = '/admin';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-slate-900 text-white rounded-[32px] flex items-center justify-center mb-6 shadow-2xl shadow-slate-900/20">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
            ADMIN<span className="text-[#FF4500]">ISTRATION</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 mt-3 uppercase tracking-[0.3em]">Accès sécurisé Soleil Saveurs</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Identifiant Email</label>
            <input 
              type="email" 
              placeholder="Email administrateur"
              required
              className="w-full p-6 bg-slate-100 rounded-[24px] font-black border-none text-sm focus:ring-2 focus:ring-[#FF4500] transition-all placeholder:text-slate-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-2 block">Mot de passe</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              required
              className="w-full p-6 bg-slate-100 rounded-[24px] font-black border-none text-sm focus:ring-2 focus:ring-[#FF4500] transition-all placeholder:text-slate-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#FF4500] hover:scale-[1.02] active:scale-95 transition-all mt-6 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'VÉRIFICATION...' : 'SE CONNECTER'}
          </button>
        </form>

        <p className="text-center mt-10 text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          &copy;  SOLEIL SAVEURS - PANNEAU DE CONTRÔLE
        </p>
      </div>
    </div>
  );
}