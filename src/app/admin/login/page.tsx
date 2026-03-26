'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sun, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Empêche les erreurs d'hydratation en attendant que le composant soit monté
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === 'SOLEIL2024') {
      localStorage.setItem('soleilsaveurs_admin_token', 'AUTH_OK');
      router.push('/admin');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[28px] shadow-sm border border-slate-100 mb-6">
            <Sun className="w-10 h-10 text-[#FF4500]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            SOLEIL<span className="text-[#FF4500]">SAVEURS</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Accès Administration</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 ml-1 tracking-widest">Mot de passe secret</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-14 pr-6 py-5 bg-slate-50 border-2 rounded-2xl font-bold transition-all outline-none ${error ? 'border-red-500 animate-pulse' : 'border-transparent focus:border-[#FF4500]'}`}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#FF4500] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/10"
            >
              Se connecter <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-center text-[10px] font-black uppercase mt-6 tracking-widest">
              Mot de passe incorrect
            </p>
          )}
        </form>
        
        <p className="text-center mt-8 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Soleil Saveurs
        </p>
      </div>
    </div>
  );
}