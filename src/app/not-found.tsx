import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-[#EDE3D5] text-olivier flex items-center justify-center px-5 py-16">
      <div className="relative overflow-hidden w-full max-w-[560px] rounded-[32px] md:rounded-[44px] bg-olivier text-lin px-6 py-14 md:px-12 md:py-20 text-center">
        <svg viewBox="0 0 600 600" aria-hidden className="ss-rayons absolute -right-[150px] -top-[190px] w-[340px] h-[340px] md:w-[440px] md:h-[440px] pointer-events-none">
          <circle cx="300" cy="300" r="100" fill="#C2602D" fillOpacity="0.9" />
          <circle cx="300" cy="300" r="226" fill="none" stroke="#C2602D" strokeOpacity="0.7" strokeWidth="110" strokeDasharray="12 47.2" />
        </svg>
        <p className="relative titre text-[88px] md:text-[120px] leading-none text-halo">404</p>
        <h1 className="relative titre text-4xl md:text-5xl leading-none mt-2 mb-3">Page introuvable</h1>
        <p className="relative text-base md:text-[17px] text-[#E1D2C2] mb-8">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="group relative inline-flex items-center justify-center gap-3 min-h-[60px] px-8 rounded-[18px] bg-terre-cuite text-white text-[19px] font-extrabold shadow-[0_18px_34px_-14px_rgba(194,96,45,0.6)] transition-[background-color,transform] duration-200 hover:bg-[#B0552A] active:scale-[0.98]">
          Retour à l&apos;accueil
          <ArrowRight className="w-[22px] h-[22px] transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
