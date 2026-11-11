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
      aria-label={copie ? 'Lien copié' : 'Partager'}
      className="inline-flex items-center justify-center gap-2 w-11 sm:w-auto h-11 sm:px-4 rounded-full bg-white border-[1.5px] border-[#E8DCCB] text-sm font-bold text-[#3D2B1F] hover:border-[#3D2B1F] transition-colors"
    >
      {copie ? <Check className="w-[17px] h-[17px] text-[#15803D]" aria-hidden /> : <Share2 className="w-[17px] h-[17px]" aria-hidden />}
      <span className="hidden sm:inline" aria-live="polite">{copie ? 'Lien copié' : 'Partager'}</span>
    </button>
  );
}
