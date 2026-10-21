'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';

// Cadre au format 3:2 des images produit de la boutique et de l'admin : ce qui
// est cadré ici est exactement ce que voit le client.
const RATIO = 3 / 2;
const LARGEUR_SORTIE = 1200; // px de l'image JPEG envoyée
const ZOOM_MAX = 4;
// On peut dézoomer au-delà de l'image entière, jusqu'à ce facteur : le produit
// rapetisse et des marges blanches l'entourent (utile quand il occupe toute la photo).
const REDUCTION_MAX = 0.35;

// Position de l'image dans le cadre. Toutes les longueurs sont exprimées en
// largeurs de cadre (le cadre fait 1 × 1/RATIO), ce qui rend le cadrage
// indépendant de la taille d'affichage et identique à l'export.
// zoom = 1 : l'image remplit tout le cadre ; en dessous, on voit des bords blancs.
type Vue = { zoom: number; x: number; y: number };

function taille(img: HTMLImageElement, zoom: number) {
  const k = Math.max(1 / img.naturalWidth, 1 / (RATIO * img.naturalHeight));
  return { l: img.naturalWidth * k * zoom, h: img.naturalHeight * k * zoom };
}

// Zoom où l'image entière tient dans le cadre.
function zoomEntiere(img: HTMLImageElement) {
  const { l, h } = taille(img, 1);
  return Math.min(1 / l, 1 / RATIO / h);
}

function zoomMin(img: HTMLImageElement) {
  return zoomEntiere(img) * REDUCTION_MAX;
}

// Limite le zoom et empêche l'image de sortir du cadre : plus grande que le
// cadre, elle ne peut pas laisser de bord vide ; plus petite, elle reste dedans.
function borner(img: HTMLImageElement, zoom: number, x: number, y: number): Vue {
  const z = Math.min(ZOOM_MAX, Math.max(zoomMin(img), zoom));
  const { l, h } = taille(img, z);
  const limX = Math.abs(l - 1) / 2;
  const limY = Math.abs(h - 1 / RATIO) / 2;
  return {
    zoom: z,
    x: Math.max(-limX, Math.min(limX, x)),
    y: Math.max(-limY, Math.min(limY, y)),
  };
}

// Rectangle de l'image dans un cadre de `largeur` px.
function placement(img: HTMLImageElement, vue: Vue, largeur: number) {
  const { l, h } = taille(img, vue.zoom);
  return {
    left: largeur * (0.5 + vue.x - l / 2),
    top: largeur * (0.5 / RATIO + vue.y - h / 2),
    width: largeur * l,
    height: largeur * h,
  };
}

type Props = {
  src: string;
  onAnnuler: () => void;
  onValider: (image: Blob) => Promise<void>;
};

export default function CadrageImage({ src, onAnnuler, onValider }: Props) {
  const cadreRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [vue, setVue] = useState<Vue>({ zoom: 1, x: 0, y: 0 });
  const [largeur, setLargeur] = useState(0);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const pincement = useRef<{ ecart: number; zoom: number } | null>(null);

  // Une image déjà en ligne doit être chargée en CORS pour pouvoir être
  // redessinée puis exportée depuis le canvas.
  const crossOrigin = src.startsWith('blob:') ? undefined : 'anonymous';

  useEffect(() => {
    const i = new Image();
    if (crossOrigin) i.crossOrigin = crossOrigin;
    i.onload = () => {
      setImg(i);
      setVue(borner(i, zoomEntiere(i), 0, 0)); // départ : image entière visible
    };
    i.onerror = () => setErreur("Impossible de charger cette image. Choisissez à nouveau le fichier.");
    i.src = src;
  }, [src, crossOrigin]);

  useEffect(() => {
    const el = cadreRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entree]) => setLargeur(entree.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Écouteur natif : React enregistre `wheel` en passif, on ne pourrait pas
  // empêcher la page de défiler pendant qu'on zoome.
  useEffect(() => {
    const el = cadreRef.current;
    if (!el || !img) return;
    const surMolette = (e: WheelEvent) => {
      e.preventDefault();
      const facteur = Math.exp(-e.deltaY * 0.0015);
      setVue(v => borner(img, v.zoom * facteur, v.x, v.y));
    };
    el.addEventListener('wheel', surMolette, { passive: false });
    return () => el.removeEventListener('wheel', surMolette);
  }, [img]);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !envoi) onAnnuler(); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [envoi, onAnnuler]);

  const ecartPointeurs = () => {
    const [a, b] = Array.from(pointeurs.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function surPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointeurs.current.size === 2) pincement.current = { ecart: ecartPointeurs(), zoom: vue.zoom };
  }

  function surPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const avant = pointeurs.current.get(e.pointerId);
    if (!avant || !img || !largeur) return;
    pointeurs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pince = pincement.current;
    if (pince && pointeurs.current.size === 2) {
      if (pince.ecart > 0) {
        const zoom = pince.zoom * ecartPointeurs() / pince.ecart;
        setVue(v => borner(img, zoom, v.x, v.y));
      }
    } else if (pointeurs.current.size === 1) {
      const dx = (e.clientX - avant.x) / largeur;
      const dy = (e.clientY - avant.y) / largeur;
      setVue(v => borner(img, v.zoom, v.x + dx, v.y + dy));
    }
  }

  function surPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointeurs.current.delete(e.pointerId);
    if (pointeurs.current.size < 2) pincement.current = null;
  }

  const zoomer = (zoom: number) => { if (img) setVue(v => borner(img, zoom, v.x, v.y)); };

  async function valider() {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = LARGEUR_SORTIE;
    canvas.height = Math.round(LARGEUR_SORTIE / RATIO);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Les bords laissés par un dézoom sont blancs, comme le fond des photos produit.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    const r = placement(img, vue, canvas.width);
    ctx.drawImage(img, r.left, r.top, r.width, r.height);

    let image: Blob | null = null;
    try {
      image = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    } catch {
      // Canvas « contaminé » : image en ligne servie sans en-têtes CORS.
    }
    if (!image) {
      setErreur("Impossible de recadrer cette image. Choisissez à nouveau le fichier.");
      return;
    }
    setEnvoi(true);
    try {
      await onValider(image);
    } finally {
      setEnvoi(false);
    }
  }

  // Curseur en échelle logarithmique : autant de course pour dézoomer que pour
  // zoomer, au lieu d'une petite zone tassée au début de la barre.
  const logMin = Math.log(img ? zoomMin(img) : 1);
  const logMax = Math.log(ZOOM_MAX);
  const avancement = ((Math.log(vue.zoom) - logMin) / (logMax - logMin)) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-xl italic uppercase tracking-tighter">Cadrer <span className="text-[#FF4500]">l&apos;image</span></h3>
          <button onClick={onAnnuler} disabled={envoi} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-4">
          Glissez pour déplacer · zoomez avec le curseur, la molette ou deux doigts
        </p>

        <div
          ref={cadreRef}
          onPointerDown={surPointerDown}
          onPointerMove={surPointerMove}
          onPointerUp={surPointerUp}
          onPointerCancel={surPointerUp}
          className="relative w-full aspect-[3/2] bg-white rounded-2xl overflow-hidden border border-slate-200 touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {img && largeur > 0 && (
            <img src={src} crossOrigin={crossOrigin} alt="" draggable={false} className="absolute max-w-none pointer-events-none" style={placement(img, vue, largeur)} />
          )}
          {!img && !erreur && (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-slate-300 animate-spin" /></div>
          )}
          {/* Partie visible dans la vignette carrée du panier */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 aspect-square border-2 border-dashed border-[#FF4500]/50 pointer-events-none">
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/80 text-[8px] font-black uppercase tracking-widest text-[#FF4500] px-2 py-0.5 rounded-full">Vignette panier</span>
          </div>
        </div>

        {erreur && <p className="text-[10px] font-black text-red-500 uppercase mt-3">{erreur}</p>}

        <div className="flex items-center gap-3 mt-5">
          <button onClick={() => zoomer(vue.zoom / 1.2)} disabled={!img} className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 disabled:opacity-40"><Minus className="w-5 h-5" /></button>
          <input
            type="range" min={logMin} max={logMax} step={0.001} value={Math.log(vue.zoom)} disabled={!img}
            onChange={e => zoomer(Math.exp(parseFloat(e.target.value)))}
            style={{ '--avancement': `${avancement}%` } as React.CSSProperties}
            className="flex-1 min-w-0 h-12 bg-transparent appearance-none cursor-pointer disabled:opacity-40
              [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#FF4500_var(--avancement),#e2e8f0_var(--avancement))]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:-mt-3.5 [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF4500] [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[linear-gradient(to_right,#FF4500_var(--avancement),#e2e8f0_var(--avancement))]
              [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:w-10 [&::-moz-range-thumb]:h-10 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#FF4500] [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-lg"
          />
          <button onClick={() => zoomer(vue.zoom * 1.2)} disabled={!img} className="w-12 h-12 shrink-0 flex items-center justify-center bg-slate-900 text-white rounded-2xl hover:bg-[#FF4500] disabled:opacity-40"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => img && setVue(borner(img, zoomEntiere(img), 0, 0))} disabled={!img} className="py-2.5 rounded-xl bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40">Image entière</button>
          <button onClick={() => img && setVue(borner(img, 1, 0, 0))} disabled={!img} className="py-2.5 rounded-xl bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40">Remplir le cadre</button>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onAnnuler} disabled={envoi} className="px-6 py-3.5 bg-slate-100 text-slate-400 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 disabled:opacity-40">Annuler</button>
          <button onClick={valider} disabled={!img || envoi} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-[#FF4500] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {envoi && <Loader2 className="w-4 h-4 animate-spin" />}
            Valider le cadrage
          </button>
        </div>
      </div>
    </div>
  );
}
