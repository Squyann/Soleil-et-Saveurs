'use client';
import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Galerie au format 3:2 (celui de l'outil de cadrage) : défilement au doigt
// sur mobile, flèches et miniatures sur ordinateur.
export default function GaleriePhotos({ photos, alt }: { photos: string[]; alt: string }) {
  const piste = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const allerA = (i: number) => {
    const el = piste.current;
    if (!el) return;
    const cible = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: cible * el.clientWidth, behavior: 'smooth' });
  };

  const surDefilement = () => {
    const el = piste.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (photos.length === 0) {
    return (
      <div className="aspect-[3/2] bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-[#DDD0BF] flex items-center justify-center">
        <span className="text-7xl grayscale opacity-20">🧺</span>
      </div>
    );
  }

  return (
    <div>
      <div className="relative group">
        <div
          ref={piste}
          onScroll={surDefilement}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-[1.5rem] sm:rounded-[2rem] bg-white border border-[#DDD0BF] shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((url, i) => (
            <div key={url + i} className="w-full shrink-0 snap-center aspect-[3/2]">
              <img
                src={url}
                alt={photos.length > 1 ? `${alt} — photo ${i + 1}` : alt}
                className="w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => allerA(index - 1)}
              disabled={index === 0}
              aria-label="Photo précédente"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md items-center justify-center text-[#3D2B1F] hover:bg-white disabled:opacity-0 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => allerA(index + 1)}
              disabled={index === photos.length - 1}
              aria-label="Photo suivante"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md items-center justify-center text-[#3D2B1F] hover:bg-white disabled:opacity-0 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {/* Points (mobile) */}
            <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
              {photos.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Miniatures (ordinateur et tablette) */}
      {photos.length > 1 && (
        <div className="hidden sm:flex gap-2 mt-3 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => allerA(i)}
              aria-label={`Afficher la photo ${i + 1}`}
              className={`w-20 shrink-0 aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all ${i === index ? 'border-[#FF4500] shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
