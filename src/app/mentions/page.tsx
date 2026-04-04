import React from 'react';

export default function MentionsLegales() {
  const sections = [
    { id: 'editeur', title: 'Éditeur du site' },
    { id: 'hebergement', title: 'Hébergement' },
    { id: 'propriete', title: 'Propriété intellectuelle' },
    { id: 'donnees', title: 'Données personnelles' },
    { id: 'cookies', title: 'Cookies' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header de la page */}
      <div className="bg-slate-50 border-b border-slate-100 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <span className="text-[#FF4500] font-bold tracking-widest text-xs uppercase">Informations Légales</span>
          <h1 className="text-4xl font-black text-slate-900 mt-2 tracking-tight">Mentions Légales</h1>
          <p className="text-slate-500 mt-4 font-medium">Dernière mise à jour : 4 Avril 2026</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-12 px-4 flex flex-col md:flex-row gap-12">
        
        {/* Sommaire (Visible sur desktop) */}
        <aside className="md:w-64 flex-shrink-0 hidden md:block">
          <nav className="sticky top-24 space-y-2">
            {sections.map((section) => (
              <a 
                key={section.id} 
                href={`#${section.id}`}
                className="block text-sm font-bold text-slate-400 hover:text-[#FF4500] transition-colors uppercase tracking-wider"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Contenu principal */}
        <article className="flex-1 prose prose-slate prose-orange max-w-none">
          
          <section id="editeur" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 border-b-2 border-slate-100 pb-2">
              1. Éditeur du site
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>Le site <strong>Soleil Saveurs</strong> est édité par :</p>
              <ul className="list-none p-0 space-y-1">
                <li><span className="text-slate-400">Responsable :</span> [Ton Prénom & Nom]</li>
                <li><span className="text-slate-400">Siège social :</span> Plaisir (78), France</li>
                <li><span className="text-slate-400">SIRET :</span> [Ton numéro SIRET]</li>
                <li><span className="text-slate-400">Email :</span> [Ton adresse email]</li>
                <li><span className="text-slate-400">Téléphone :</span> [Ton numéro WhatsApp]</li>
              </ul>
            </div>
          </section>

          <section id="hebergement" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 border-b-2 border-slate-100 pb-2">
              2. Hébergement
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Ce site est hébergé par la société <strong>Vercel Inc.</strong>, situé au 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. 
              Le stockage des données est assuré par <strong>Supabase Inc.</strong>
            </p>
          </section>

          <section id="propriete" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 border-b-2 border-slate-100 pb-2">
              3. Propriété intellectuelle
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              L'ensemble de ce site (logo, textes, photographies, structure) relève de la législation française et internationale sur le droit d'auteur. 
              Toute reproduction, totale ou partielle, est strictement interdite sans l'accord écrit de Soleil Saveurs.
            </p>
          </section>

          <section id="donnees" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 border-b-2 border-slate-100 pb-2">
              4. Protection des données (RGPD)
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Les informations collectées lors de vos commandes (Nom, adresse, téléphone) sont exclusivement destinées à la gestion et à la livraison de vos produits. 
              Conformément à la loi « informatique et libertés », vous pouvez exercer votre droit d'accès aux données vous concernant et les faire rectifier en nous contactant par email.
            </p>
          </section>

          <section id="cookies" className="mb-12 scroll-mt-24">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 border-b-2 border-slate-100 pb-2">
              5. Cookies
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Ce site n'utilise que des cookies techniques nécessaires au fonctionnement du panier et de la session utilisateur. 
              Aucun cookie publicitaire n'est déposé sur votre terminal.
            </p>
          </section>

        </article>
      </div>

      {/* Footer minimaliste de la page */}
      <footer className="py-20 border-t border-slate-100 text-center">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">
          Soleil Saveurs — Qualité & Transparence
        </p>
      </footer>
    </div>
  );
}