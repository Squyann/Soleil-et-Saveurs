export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-black text-[#FF4500] mb-4">404</p>
      <h1 className="text-2xl font-black text-[#3D2B1F] mb-2">Page introuvable</h1>
      <p className="text-[#9A7D68] mb-8">Cette page n&apos;existe pas ou a été déplacée.</p>
      <a
        href="/"
        className="bg-[#FF4500] text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-[#e63e00] transition-colors"
      >
        Retour à l&apos;accueil
      </a>
    </div>
  );
}
