import { ExternalLink, MapPin } from 'lucide-react';
import { RELAIS } from '@/lib/livraison';

// Remplace les cartes Google Maps intégrées : la CSP du site (frame-src) les
// bloquait, et les autoriser déposerait des cookies Google non déclarés.
// Chaque relais ouvre simplement Google Maps dans un nouvel onglet.
// Liste unique des points relais (src/lib/livraison.ts)

export default function PointsRelais() {
  return (
    <div className="h-full w-full bg-[#F5EAE0] px-4 py-5 md:p-10 flex flex-col justify-center">
      <p className="text-[11px] md:text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600] mb-3.5 md:mb-[18px]">Nos points relais · Yvelines (78)</p>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 md:gap-3">
        {RELAIS.map(r => (
          <a
            key={r.nom}
            href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${r.nom} — ouvrir la carte dans un nouvel onglet`}
            className="group flex items-center justify-between gap-3 min-h-[52px] px-3 md:px-5 md:py-[17px] rounded-[15px] md:rounded-[18px] bg-white text-[#3D2B1F] transition-[transform,box-shadow,color] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-20px_rgba(61,43,31,0.4)] hover:text-[#C73600]"
          >
            <span className="flex items-center gap-2 md:gap-3 text-[13.5px] md:text-base font-extrabold leading-tight">
              <MapPin className="w-4 h-4 md:w-[18px] md:h-[18px] text-[#FF4500] shrink-0" aria-hidden /> {r.nom}
            </span>
            <span className="hidden md:flex items-center gap-1 text-xs font-bold uppercase tracking-[0.1em] text-[#6F5A4B] group-hover:text-[#C73600]">
              Carte <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </span>
          </a>
        ))}
      </div>
      <p className="mt-3.5 md:mt-[18px] text-[13px] font-semibold text-[#6F5A4B]">
        Livraison dans toutes les communes des Yvelines, au départ de ces relais — <span className="font-extrabold text-[#166534]">offerte dans ces {RELAIS.length} villes</span>.
      </p>
    </div>
  );
}
