import { ExternalLink, MapPin } from 'lucide-react';

// Remplace les cartes Google Maps intégrées : la CSP du site (frame-src) les
// bloquait, et les autoriser déposerait des cookies Google non déclarés.
// Chaque relais ouvre simplement Google Maps dans un nouvel onglet.
const RELAIS = [
  { nom: 'Chatou', lat: 48.8897, lon: 2.1574 },
  { nom: 'Croissy-sur-Seine', lat: 48.8794, lon: 2.1431 },
  { nom: 'Mareil-sur-Mauldre', lat: 48.8944, lon: 1.8681 },
  { nom: 'Saint-Nom-la-Bretèche', lat: 48.8594, lon: 2.0186 },
  { nom: 'Plaisir', lat: 48.8111, lon: 1.9472 },
];

export default function PointsRelais() {
  return (
    <div className="h-full w-full bg-[#EDE3D5] p-8 md:p-10 flex flex-col justify-center gap-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-2">Nos points relais · Yvelines (78)</p>
      {RELAIS.map(r => (
        <a
          key={r.nom}
          href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:text-[#FF4500] transition-all group"
        >
          <span className="flex items-center gap-3 text-sm font-black uppercase tracking-tight text-slate-800 group-hover:text-[#FF4500]">
            <MapPin className="w-4 h-4 text-[#FF4500] shrink-0" /> {r.nom}
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#FF4500]">
            Carte <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      ))}
      <p className="text-[10px] font-bold text-slate-500 italic mt-2">Livraison dans toutes les communes des Yvelines, au départ de ces relais.</p>
    </div>
  );
}
