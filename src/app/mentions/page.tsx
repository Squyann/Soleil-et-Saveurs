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
    <div className="min-h-screen bg-[#EDE3D5] text-[#3D2B1F]">

      {/* Hero */}
      <section className="bg-[#F5EAE0] border-b border-[#E3D6C4] pt-5 pb-7 md:pt-8 md:pb-10 px-5 relative overflow-hidden">
        <div className="hidden" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 min-h-11 text-[#5C4030] hover:text-[#C73600] font-bold text-sm transition-colors mb-3 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour boutique
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-11 h-11 bg-[#FFF1EA] rounded-[14px] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#C73600]" />
            </div>
            <span className="text-[#C73600] font-extrabold text-xs uppercase tracking-[0.14em]">Informations légales</span>
          </div>
          <h1 className="titre text-[44px] md:text-[64px] text-[#3D2B1F] leading-none">
            Mentions<br /><span className="italic font-medium text-[#FF4500]">Légales</span>
          </h1>
          <p className="text-[#6F5A4B] text-sm font-semibold mt-3">Dernière mise à jour : 25 octobre 2026</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto py-8 md:py-14 px-5 flex flex-col md:flex-row gap-10 md:gap-14">

        {/* Sommaire sticky */}
        <aside className="md:w-56 flex-shrink-0 hidden md:block">
          <nav className="sticky top-20 space-y-0.5 bg-white rounded-3xl p-5 border border-[#E8DCCB]">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600] mb-3">Sommaire</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-[13px] font-semibold text-[#5C4030] hover:text-[#C73600] transition-colors py-1.5 border-l-2 border-transparent hover:border-[#FF4500] pl-3"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Contenu */}
        <article className="flex-1 min-w-0 space-y-10 md:space-y-12 text-[15px]">

          <section id="editeur" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              1. Éditeur du site
            </h2>
            <div className="space-y-2 text-[#5C4030] font-medium text-sm leading-relaxed">
              <p>Le site <strong className="text-[#3D2B1F]">Soleil et Saveurs</strong> est édité par la société :</p>
              <div className="bg-[#F5EAE0] rounded-2xl p-5 mt-4 space-y-2 border border-[#E8DCCB]">
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Société</span> SOLEIL ET SAVEURS — SAS au capital de 1 000 €</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Représentant légal</span> Khaled Boulila, président</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Siège social</span> 6-8 AVENUE HENRIETTE, 93170 BAGNOLET</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Immatriculation</span> RCS Bobigny 821 324 324</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">SIRET</span> 821 324 324 00028</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">E-mail</span> soleiletsaveurs.livraison@gmail.com</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Téléphone</span> 07 59 72 00 83</p>
                <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">TVA intracommunautaire</span> FR33821324324</p>
              </div>
            </div>
          </section>

          <section id="directeur" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              2. Directeur de publication
            </h2>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed">
              Le directeur de la publication du site est <strong className="text-[#3D2B1F]">Khaled Boulila</strong>, en sa qualité de président de la société SOLEIL ET SAVEURS.
            </p>
          </section>

          <section id="hebergement" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              3. Hébergement
            </h2>
            <div className="space-y-4 text-[#5C4030] font-medium text-sm leading-relaxed">
              <div className="bg-[#F5EAE0] rounded-2xl p-5 border border-[#E8DCCB] space-y-1">
                <p className="font-extrabold text-[#3D2B1F] text-xs uppercase tracking-widest mb-2">Hébergeur du site</p>
                <p><strong>Hostinger International Ltd</strong></p>
                <p>61 Lordou Vironos Street, 6023 Larnaca, Chypre</p>
                <p>Site : <a href="https://www.hostinger.fr" className="text-[#C73600] hover:underline">hostinger.fr</a></p>
              </div>
              <div className="bg-[#F5EAE0] rounded-2xl p-5 border border-[#E8DCCB] space-y-1">
                <p className="font-extrabold text-[#3D2B1F] text-xs uppercase tracking-widest mb-2">Stockage des données</p>
                <p><strong>Supabase Inc.</strong></p>
                <p>970 Toa Payoh North, #07-04, Singapour 318992</p>
                <p>Site : <a href="https://supabase.com" className="text-[#C73600] hover:underline">supabase.com</a></p>
              </div>
            </div>
          </section>

          <section id="propriete" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              4. Propriété intellectuelle
            </h2>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed">
              L'ensemble des éléments constituant le site Soleil et Saveurs (logo, textes, photographies, structure, design) sont protégés par la législation française et internationale sur le droit d'auteur et la propriété intellectuelle.
              Toute reproduction, représentation, modification ou exploitation, totale ou partielle, est strictement interdite sans l'autorisation écrite préalable de Soleil et Saveurs.
            </p>
          </section>

          <section id="responsabilite" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              5. Responsabilité
            </h2>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed">
              Soleil et Saveurs s'efforce d'assurer l'exactitude et la mise à jour des informations publiées sur ce site, et se réserve le droit de corriger le contenu à tout moment sans préavis.
              Soleil et Saveurs ne saurait être tenu responsable de l'utilisation faite de ces informations, ni des dommages directs ou indirects qui pourraient en découler.
              Les liens hypertextes vers d'autres sites sont fournis à titre indicatif ; Soleil et Saveurs n'exerce aucun contrôle sur ces sites tiers.
            </p>
          </section>

          <section id="donnees" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              6. Données personnelles
            </h2>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed mb-4">
              Les données personnelles collectées lors de votre utilisation du site (nom, adresse e-mail, téléphone, adresse de livraison) sont traitées conformément au règlement général sur la protection des données (RGPD).
              Pour en savoir plus, consultez notre <Link href="/rgpd" className="text-[#C73600] hover:underline font-bold">Politique de confidentialité</Link>.
            </p>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed">
              Vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : <strong className="text-[#3D2B1F]">soleiletsaveurs.livraison@gmail.com</strong>
            </p>
          </section>

          <section id="cookies" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              7. Cookies
            </h2>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed">
              Ce site utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service : gestion de la session utilisateur (authentification) et conservation temporaire du panier d'achat dans le localStorage de votre navigateur.
              Aucun cookie publicitaire, analytique ou de traçage tiers n'est déposé sur votre terminal.
            </p>
          </section>

          <section id="droit" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              8. Droit applicable & médiation
            </h2>
            <p className="text-[#5C4030] font-medium text-sm leading-relaxed mb-4">
              Les présentes mentions légales sont régies par le droit français. En cas de litige, une solution amiable sera recherchée avant toute action judiciaire.
              Conformément aux articles L. 616-1 et R. 616-1 du Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur de la consommation.
            </p>
          </section>

          {/* Liens vers les autres pages légales */}
          <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-[#E8DCCB]">
            <Link href="/cgv" className="group flex items-center gap-4 bg-white border border-[#E8DCCB] p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center group-hover:bg-[#FFF1EA] transition-colors">
                <FileText className="w-5 h-5 text-[#6F5A4B] group-hover:text-[#C73600]" />
              </div>
              <div>
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F]">CGV</p>
                <p className="text-xs text-[#6F5A4B] font-semibold">Conditions Générales de Vente</p>
              </div>
            </Link>
            <Link href="/rgpd" className="group flex items-center gap-4 bg-white border border-[#E8DCCB] p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center group-hover:bg-[#FFF1EA] transition-colors">
                <FileText className="w-5 h-5 text-[#6F5A4B] group-hover:text-[#C73600]" />
              </div>
              <div>
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F]">RGPD</p>
                <p className="text-xs text-[#6F5A4B] font-semibold">Politique de confidentialité</p>
              </div>
            </Link>
          </div>

        </article>
      </div>

      <footer className="py-10 border-t border-[#E3D6C4] text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6F5A4B]">
          © 2026 Soleil et Saveurs — Bagnolet (93)
        </p>
      </footer>
    </div>
  );
}
