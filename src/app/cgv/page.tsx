import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function CGVPage() {
  const sections = [
    { id: 'objet',           title: 'Objet' },
    { id: 'produits',        title: 'Produits & disponibilité' },
    { id: 'prix',            title: 'Prix' },
    { id: 'commande',        title: 'Commande' },
    { id: 'livraison',       title: 'Livraison' },
    { id: 'paiement',        title: 'Paiement' },
    { id: 'retractation',    title: 'Droit de rétractation' },
    { id: 'conformite',      title: 'Conformité & réclamations' },
    { id: 'responsabilite',  title: 'Responsabilité' },
    { id: 'donnees',         title: 'Données personnelles' },
    { id: 'litiges',         title: 'Litiges & médiation' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF9]">

      {/* Hero */}
      <section className="bg-slate-900 pt-10 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#FF4500]/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#FF4500] font-bold text-xs uppercase tracking-widest transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour boutique
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#FF4500]/10 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-[#FF4500]" />
            </div>
            <span className="text-[#FF4500] font-black text-xs uppercase tracking-[0.3em]">Contrat de vente</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
            Conditions<br /><span className="text-[#FF4500]">Générales de Vente</span>
          </h1>
          <p className="text-slate-400 text-sm font-bold mt-4">Dernière mise à jour : 3 mai 2026 — Applicables à toute commande passée sur soleil-saveurs.fr</p>
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
        <article className="flex-1 space-y-14 text-sm">

          <section id="objet" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              1. Objet
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Les présentes Conditions Générales de Vente (CGV) régissent contractuellement toute relation commerciale entre <strong className="text-slate-900">Soleil Saveurs</strong> (ci-après « le Vendeur ») et toute personne physique effectuant un achat sur le site <strong className="text-slate-900">soleil-saveurs.fr</strong> (ci-après « le Client »).
            </p>
            <p className="text-slate-600 font-medium leading-relaxed mt-3">
              Le Client reconnaît avoir pris connaissance des présentes CGV et les accepter sans réserve avant toute commande. Soleil Saveurs se réserve le droit de modifier les présentes CGV à tout moment ; les CGV applicables sont celles en vigueur à la date de la commande.
            </p>
          </section>

          <section id="produits" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              2. Produits & disponibilité
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Soleil Saveurs commercialise des produits frais issus de l'agriculture locale (fruits, légumes, épicerie) provenant principalement des Yvelines (78). Les produits proposés sont ceux figurant au catalogue en ligne au moment de la consultation, dans la limite des stocks disponibles.
            </p>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 space-y-2">
              <p className="font-black text-xs uppercase text-[#FF4500] tracking-widest mb-2">Spécificités produits frais</p>
              <p className="text-slate-600 font-medium leading-relaxed">Les produits étant frais et périssables, leur disponibilité peut varier quotidiennement en fonction des récoltes. En cas d'indisponibilité d'un produit après validation de la commande, le Client sera contacté et proposera un avoir ou une substitution.</p>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed mt-4">
              Les photographies des produits sont présentées à titre illustratif. L'aspect visuel exact peut légèrement varier selon les saisons et les variétés disponibles.
            </p>
          </section>

          <section id="prix" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              3. Prix
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Les prix sont indiqués en euros (€), toutes taxes comprises (TTC). La TVA n'est pas applicable conformément à l'article 293 B du CGI (régime de la micro-entreprise).
            </p>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-black text-xs uppercase text-slate-900">Frais de livraison</span>
                <span className="text-[#FF4500] font-black text-xs">2,50 €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-xs uppercase text-slate-900">Livraison gratuite dès</span>
                <span className="text-green-600 font-black text-xs">45,00 €</span>
              </div>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed mt-4">
              Soleil Saveurs se réserve le droit de modifier ses prix à tout moment. Les prix applicables sont ceux affichés au moment de la validation de la commande.
            </p>
          </section>

          <section id="commande" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              4. Passation de commande
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Pour passer commande, le Client doit :
            </p>
            <ol className="space-y-3 text-slate-600 font-medium leading-relaxed">
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">1</span>
                Créer un compte ou se connecter à son espace personnel
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">2</span>
                Sélectionner les produits et les ajouter au panier
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">3</span>
                Renseigner l'adresse de livraison (obligatoirement dans le 78)
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5">4</span>
                Confirmer la commande
              </li>
            </ol>
            <p className="text-slate-600 font-medium leading-relaxed mt-4">
              La validation de la commande implique l'acceptation des présentes CGV. Un message de confirmation est envoyé par WhatsApp ou email. La commande est ferme et définitive après validation.
            </p>
          </section>

          <section id="livraison" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              5. Livraison
            </h2>
            <div className="space-y-4 text-slate-600 font-medium leading-relaxed">
              <p>
                Soleil Saveurs livre uniquement dans les communes des Yvelines (78) situées à moins de 5 km de ses points de distribution. La liste des villes éligibles est disponible sur la <Link href="/livraison" className="text-[#FF4500] hover:underline font-bold">page Livraison</Link>.
              </p>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 grid sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-black text-xs uppercase text-slate-900 mb-1">Délai</p>
                  <p className="text-[#FF4500] font-black">J+0</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Même jour</p>
                </div>
                <div>
                  <p className="font-black text-xs uppercase text-slate-900 mb-1">Commande avant</p>
                  <p className="text-[#FF4500] font-black">Minuit</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">La veille</p>
                </div>
                <div>
                  <p className="font-black text-xs uppercase text-slate-900 mb-1">Zone</p>
                  <p className="text-[#FF4500] font-black">78</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Yvelines uniquement</p>
                </div>
              </div>
              <p>
                En cas d'impossibilité de livraison (adresse incorrecte, absence du Client, zone non couverte), Soleil Saveurs contactera le Client pour convenir d'une nouvelle modalité. Les produits frais non livrés ne peuvent être restitués.
              </p>
            </div>
          </section>

          <section id="paiement" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              6. Paiement
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Le paiement s'effectue à la livraison, en espèces ou par carte bancaire auprès du livreur. Le paiement en ligne n'est pas disponible à ce jour.
            </p>
            <p className="text-slate-600 font-medium leading-relaxed">
              La commande est considérée comme validée dès sa confirmation via le site. Le règlement interviendra au moment de la réception des produits.
            </p>
          </section>

          <section id="retractation" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              7. Droit de rétractation
            </h2>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4">
              <p className="font-black text-xs uppercase text-amber-700 tracking-widest mb-2">Produits périssables — exception légale</p>
              <p className="text-amber-700 font-medium text-sm leading-relaxed">
                Conformément à l'article L. 221-28, 3° du Code de la consommation, <strong>le droit de rétractation ne s'applique pas aux produits susceptibles de se détériorer ou de se périmer rapidement</strong>, ce qui est le cas de la totalité des produits frais proposés par Soleil Saveurs.
              </p>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              Toutefois, si vous recevez un produit non conforme (avarie, erreur de produit), nous vous invitons à nous contacter immédiatement par WhatsApp ou email afin d'apporter une solution (remplacement, avoir ou remboursement).
            </p>
          </section>

          <section id="conformite" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              8. Conformité & réclamations
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Soleil Saveurs s'engage à livrer des produits conformes à la commande et aux normes de qualité en vigueur. En cas de problème (produit abîmé, erreur de livraison), le Client dispose de <strong className="text-slate-900">24h après réception</strong> pour nous le signaler avec photo à l'appui.
            </p>
            <p className="text-slate-600 font-medium leading-relaxed">
              Contact : <strong className="text-slate-900">soleiletsaveurs.livraison@gmail.com</strong> ou via WhatsApp au <strong className="text-slate-900">[+33 6 XX XX XX XX]</strong>.
            </p>
          </section>

          <section id="responsabilite" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              9. Responsabilité
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Soleil Saveurs ne saurait être tenu responsable de dommages indirects liés à l'utilisation du site ou à une défaillance temporaire de service. Sa responsabilité ne peut excéder le montant de la commande concernée.
              En cas de force majeure (intempéries, indisponibilité des récoltes), Soleil Saveurs informera le Client dans les meilleurs délais.
            </p>
          </section>

          <section id="donnees" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              10. Données personnelles
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Les données personnelles collectées dans le cadre de la commande sont traitées conformément à notre <Link href="/rgpd" className="text-[#FF4500] hover:underline font-bold">Politique de confidentialité (RGPD)</Link>.
              Elles sont utilisées exclusivement pour le traitement et la livraison des commandes, et ne sont pas cédées à des tiers.
            </p>
          </section>

          <section id="litiges" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              11. Litiges & médiation
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Les présentes CGV sont soumises au droit français. En cas de litige, le Client s'adressera en priorité à Soleil Saveurs pour trouver une solution amiable.
            </p>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              À défaut de résolution amiable, le Client peut recourir gratuitement à la médiation de la consommation conformément aux articles L. 616-1 et R. 616-1 du Code de la consommation.
            </p>
            <p className="text-slate-600 font-medium leading-relaxed">
              Plateforme européenne de règlement en ligne des litiges :{' '}
              <a href="https://ec.europa.eu/consumers/odr" className="text-[#FF4500] hover:underline" target="_blank" rel="noopener noreferrer">
                ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>

          {/* Liens vers les autres pages légales */}
          <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-slate-100">
            <Link href="/mentions" className="group flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-[#FF4500]" />
              </div>
              <div>
                <p className="font-black text-xs uppercase text-slate-900">Mentions légales</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Informations éditeur & hébergeur</p>
              </div>
            </Link>
            <Link href="/rgpd" className="group flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-[#FF4500]" />
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
