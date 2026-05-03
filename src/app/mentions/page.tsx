import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function MentionsLegales() {
  const sections = [
    { id: 'editeur',     title: 'Éditeur du site' },
    { id: 'directeur',  title: 'Directeur de publication' },
    { id: 'hebergement', title: 'Hébergement' },
    { id: 'propriete',  title: 'Propriété intellectuelle' },
    { id: 'responsabilite', title: 'Responsabilité' },
    { id: 'donnees',    title: 'Données personnelles' },
    { id: 'cookies',    title: 'Cookies' },
    { id: 'droit',      title: 'Droit applicable' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF9]">

      {/* Hero */}
      <section className="bg-slate-900 pt-10 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#FF4500]/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#FF4500] font-bold text-xs uppercase tracking-widest transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour boutique
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#FF4500]/10 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#FF4500]" />
            </div>
            <span className="text-[#FF4500] font-black text-xs uppercase tracking-[0.3em]">Informations légales</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
            Mentions<br /><span className="text-[#FF4500]">Légales</span>
          </h1>
          <p className="text-slate-400 text-sm font-bold mt-4">Dernière mise à jour : 3 mai 2026</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto py-16 px-6 flex flex-col md:flex-row gap-16">

        {/* Sommaire sticky */}
        <aside className="md:w-56 flex-shrink-0 hidden md:block">
          <nav className="sticky top-24 space-y-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Sommaire</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-[11px] font-bold text-slate-400 hover:text-[#FF4500] transition-colors py-1 border-l-2 border-transparent hover:border-[#FF4500] pl-3"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Contenu */}
        <article className="flex-1 space-y-14">

          <section id="editeur" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              1. Éditeur du site
            </h2>
            <div className="space-y-2 text-slate-600 font-medium text-sm leading-relaxed">
              <p>Le site <strong className="text-slate-900">Soleil Saveurs</strong> est édité par une entreprise individuelle :</p>
              <div className="bg-slate-50 rounded-2xl p-5 mt-4 space-y-2 border border-slate-100">
                <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Responsable</span> [Prénom Nom]</p>
                <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Siège social</span> Plaisir (78370), Yvelines, France</p>
                <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">SIRET</span> [Numéro SIRET]</p>
                <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Email</span> [adresse@email.fr]</p>
                <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Téléphone</span> [+33 6 XX XX XX XX]</p>
                <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Statut TVA</span> TVA non applicable — Art. 293 B du CGI (micro-entreprise)</p>
              </div>
            </div>
          </section>

          <section id="directeur" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              2. Directeur de publication
            </h2>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              Le directeur de la publication du site est <strong className="text-slate-900">[Prénom Nom]</strong>, en sa qualité de responsable de l'entreprise individuelle Soleil Saveurs.
            </p>
          </section>

          <section id="hebergement" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              3. Hébergement
            </h2>
            <div className="space-y-4 text-slate-600 font-medium text-sm leading-relaxed">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-1">
                <p className="font-black text-slate-900 text-xs uppercase tracking-widest mb-2">Hébergeur du site</p>
                <p><strong>Vercel Inc.</strong></p>
                <p>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
                <p>Site : <a href="https://vercel.com" className="text-[#FF4500] hover:underline">vercel.com</a></p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-1">
                <p className="font-black text-slate-900 text-xs uppercase tracking-widest mb-2">Stockage des données</p>
                <p><strong>Supabase Inc.</strong></p>
                <p>970 Toa Payoh North, #07-04, Singapour 318992</p>
                <p>Site : <a href="https://supabase.com" className="text-[#FF4500] hover:underline">supabase.com</a></p>
              </div>
            </div>
          </section>

          <section id="propriete" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              4. Propriété intellectuelle
            </h2>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              L'ensemble des éléments constituant le site Soleil Saveurs (logo, textes, photographies, structure, design) sont protégés par la législation française et internationale sur le droit d'auteur et la propriété intellectuelle.
              Toute reproduction, représentation, modification ou exploitation, totale ou partielle, est strictement interdite sans l'autorisation écrite préalable de Soleil Saveurs.
            </p>
          </section>

          <section id="responsabilite" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              5. Responsabilité
            </h2>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              Soleil Saveurs s'efforce d'assurer l'exactitude et la mise à jour des informations publiées sur ce site, et se réserve le droit de corriger le contenu à tout moment sans préavis.
              Soleil Saveurs ne saurait être tenu responsable de l'utilisation faite de ces informations, ni des dommages directs ou indirects qui pourraient en découler.
              Les liens hypertextes vers d'autres sites sont fournis à titre indicatif ; Soleil Saveurs n'exerce aucun contrôle sur ces sites tiers.
            </p>
          </section>

          <section id="donnees" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              6. Données personnelles
            </h2>
            <p className="text-slate-600 font-medium text-sm leading-relaxed mb-4">
              Les données personnelles collectées lors de votre utilisation du site (nom, adresse email, téléphone, adresse de livraison) sont traitées conformément au Règlement Général sur la Protection des Données (RGPD).
              Pour en savoir plus, consultez notre <Link href="/rgpd" className="text-[#FF4500] hover:underline font-bold">Politique de confidentialité</Link>.
            </p>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              Vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : <strong className="text-slate-900">[adresse@email.fr]</strong>
            </p>
          </section>

          <section id="cookies" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              7. Cookies
            </h2>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              Ce site utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service : gestion de la session utilisateur (authentification) et conservation temporaire du panier d'achat dans le localStorage de votre navigateur.
              Aucun cookie publicitaire, analytique ou de traçage tiers n'est déposé sur votre terminal.
            </p>
          </section>

          <section id="droit" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              8. Droit applicable & médiation
            </h2>
            <p className="text-slate-600 font-medium text-sm leading-relaxed mb-4">
              Les présentes mentions légales sont régies par le droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.
              Conformément aux articles L. 616-1 et R. 616-1 du Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur de la consommation.
            </p>
            <p className="text-slate-600 font-medium text-sm leading-relaxed">
              Plateforme européenne de règlement en ligne des litiges :{' '}
              <a href="https://ec.europa.eu/consumers/odr" className="text-[#FF4500] hover:underline" target="_blank" rel="noopener noreferrer">
                ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>

          {/* Liens vers les autres pages légales */}
          <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-slate-100">
            <Link href="/cgv" className="group flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#FF4500]" />
              </div>
              <div>
                <p className="font-black text-xs uppercase text-slate-900">CGV</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Conditions Générales de Vente</p>
              </div>
            </Link>
            <Link href="/rgpd" className="group flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#FF4500]" />
              </div>
              <div>
                <p className="font-black text-xs uppercase text-slate-900">RGPD</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Politique de confidentialité</p>
              </div>
            </Link>
          </div>

        </article>
      </div>

      <footer className="py-16 border-t border-slate-100 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
          © 2026 Soleil Saveurs — Plaisir (78)
        </p>
      </footer>
    </div>
  );
}
