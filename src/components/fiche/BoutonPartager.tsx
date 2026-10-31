'use client';
import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

// Partage natif sur mobile (WhatsApp, SMS…), sinon copie du lien.
export default function BoutonPartager({ titre }: { titre: string }) {
  const [copie, setCopie] = useState(false);

  const partager = async () => {
    const url = window.location.href.split('?')[0];
    if (navigator.share) {
      try { await navigator.share({ title: titre, url }); } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      window.prompt('Copiez le lien de la page :', url);
    }
  };

  return (
    <button
      type="button"
      onClick={partager}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D5C9B8] text-[10px] font-black uppercase tracking-widest text-[#5C4030] hover:border-[#FF4500] hover:text-[#FF4500] transition-colors"
    >
      {copie ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
      {copie ? 'Lien copié' : 'Partager'}
    </button>
  );
}
