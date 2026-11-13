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
              <ShoppingBag className="w-6 h-6 text-[#C73600]" />
            </div>
            <span className="text-[#C73600] font-extrabold text-xs uppercase tracking-[0.14em]">Contrat de vente</span>
          </div>
          <h1 className="titre text-[44px] md:text-[64px] text-[#3D2B1F] leading-none">
            Conditions<br /><span className="italic font-medium text-[#FF4500]">Générales de Vente</span>
          </h1>
          <p className="text-[#6F5A4B] text-sm font-semibold mt-3">Dernière mise à jour : 25 octobre 2026 — Applicables à toute commande passée sur soleiletsaveurs.fr</p>
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

          <section id="objet" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              1. Objet
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              Les présentes Conditions Générales de Vente (CGV) régissent contractuellement toute relation commerciale entre <strong className="text-[#3D2B1F]">Soleil et Saveurs</strong> (ci-après « le Vendeur ») et toute personne physique effectuant un achat sur le site <strong className="text-[#3D2B1F]">soleiletsaveurs.fr</strong> (ci-après « le Client »).
            </p>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-3">
              Le Client reconnaît avoir pris connaissance des présentes CGV et les accepter sans réserve avant toute commande. Soleil et Saveurs se réserve le droit de modifier les présentes CGV à tout moment ; les CGV applicables sont celles en vigueur à la date de la commande.
            </p>
          </section>

          <section id="produits" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              2. Produits & disponibilité
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Soleil et Saveurs commercialise des fruits et légumes frais ainsi que des produits d'épicerie. Nous privilégions les producteurs français et les produits de saison ; l'origine de chaque produit est indiquée sur sa fiche. Les produits proposés sont ceux figurant au catalogue en ligne au moment de la consultation, dans la limite des stocks disponibles.
            </p>
            <div className="bg-[#FFF1EA] border border-[#F6DFD2] rounded-2xl p-5 space-y-2">
              <p className="font-extrabold text-xs uppercase text-[#C73600] tracking-widest mb-2">Spécificités produits frais</p>
              <p className="text-[#5C4030] font-medium leading-relaxed">Les produits étant frais et périssables, leur disponibilité peut varier quotidiennement en fonction des récoltes. En cas d'indisponibilité d'un produit après validation de la commande, le Client sera contacté et un avoir ou une substitution lui sera proposé.</p>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              Les photographies des produits sont présentées à titre illustratif. L'aspect visuel exact peut légèrement varier selon les saisons et les variétés disponibles.
            </p>
          </section>

          <section id="prix" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              3. Prix
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Les prix sont indiqués en euros (€), toutes taxes comprises (TTC), TVA incluse au taux en vigueur.
            </p>
            <div className="bg-[#F5EAE0] rounded-2xl p-5 border border-[#E8DCCB] space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase text-[#3D2B1F]">Minimum de commande</span>
                <span className="text-[#3D2B1F] font-extrabold text-xs">10,00 €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase text-[#3D2B1F]">Frais de livraison — jusqu'à 3 km</span>
                <span className="text-[#C73600] font-extrabold text-xs">3,00 €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase text-[#3D2B1F]">Frais de livraison — de 3 à 6 km</span>
                <span className="text-[#C73600] font-extrabold text-xs">4,00 €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase text-[#3D2B1F]">Frais de livraison — au-delà de 6 km</span>
                <span className="text-[#C73600] font-extrabold text-xs">5,00 €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs uppercase text-[#3D2B1F]">Livraison gratuite dès</span>
                <span className="text-[#166534] font-extrabold text-xs">40,00 €</span>
              </div>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              La livraison est offerte pour toute adresse située à Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre ou Saint-Nom-la-Bretèche, communes des points relais Soleil et Saveurs. Ailleurs dans les Yvelines, les frais dépendent de la distance entre l'adresse de livraison et le point relais le plus proche : 3,00 € jusqu'à 3 km, 4,00 € jusqu'à 6 km, 5,00 € au-delà ; ils sont offerts lorsque le montant des produits atteint 40,00 €, avant application des éventuelles remises. Le montant exact des frais est affiché dans le panier avant la validation de la commande. Le montant minimum de commande est de 10,00 €, après remises.
            </p>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              Soleil et Saveurs se réserve le droit de modifier ses prix à tout moment. Les prix applicables sont ceux affichés au moment de la validation de la commande.
            </p>
          </section>

          <section id="commande" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              4. Passation de commande
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Pour passer commande, le Client doit :
            </p>
            <ol className="space-y-3 text-[#5C4030] font-medium leading-relaxed">
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 mt-0.5">1</span>
                Créer un compte ou se connecter à son espace personnel
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 mt-0.5">2</span>
                Sélectionner les produits et les ajouter au panier
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 mt-0.5">3</span>
                Renseigner l'adresse de livraison (obligatoirement dans le 78) et choisir une date de livraison parmi celles proposées
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 mt-0.5">4</span>
                Confirmer la commande
              </li>
            </ol>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              La validation de la commande implique l'acceptation des présentes CGV. Un message de confirmation est envoyé par WhatsApp ou email. La commande est ferme et définitive après validation.
            </p>
          </section>

          <section id="livraison" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              5. Livraison
            </h2>
            <div className="space-y-4 text-[#5C4030] font-medium leading-relaxed">
              <p>
                Soleil et Saveurs livre uniquement dans le département des Yvelines (78), dans toutes ses communes. L'éligibilité d'une adresse peut être vérifiée sur la <Link href="/livraison" className="text-[#C73600] hover:underline font-bold">page Livraison</Link>.
              </p>
              <div className="bg-[#F5EAE0] rounded-2xl p-5 border border-[#E8DCCB] grid sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Livraison</p>
                  <p className="text-[#C73600] font-extrabold">15h – 20h</p>
                  <p className="text-xs text-[#6F5A4B] font-semibold">Dès le lendemain</p>
                </div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Commande avant</p>
                  <p className="text-[#C73600] font-extrabold">Minuit</p>
                  <p className="text-xs text-[#6F5A4B] font-semibold">La veille</p>
                </div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Zone</p>
                  <p className="text-[#C73600] font-extrabold">78</p>
                  <p className="text-xs text-[#6F5A4B] font-semibold">Yvelines uniquement</p>
                </div>
              </div>
              <p>
                La livraison a lieu à la date choisie par le Client lors de la commande, entre 15h et 20h. Les dates proposées dépendent des jours de livraison et de la capacité disponible ; la date la plus proche possible est le lendemain de la commande.
              </p>
              <p>
                En cas d'impossibilité de livraison (adresse incorrecte, absence du Client, zone non couverte), Soleil et Saveurs contactera le Client pour convenir d'une nouvelle modalité. Les produits frais non livrés ne peuvent être restitués.
              </p>
            </div>
          </section>

          <section id="paiement" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              6. Paiement
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Le paiement s'effectue à la livraison, en espèces ou par carte bancaire auprès du livreur. Le paiement en ligne n'est pas disponible à ce jour ; il sera proposé prochainement.
            </p>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              La commande est considérée comme validée dès sa confirmation via le site. Le règlement interviendra au moment de la réception des produits.
            </p>
          </section>

          <section id="retractation" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              7. Droit de rétractation
            </h2>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4">
              <p className="font-extrabold text-xs uppercase text-amber-700 tracking-widest mb-2">Produits périssables — exception légale</p>
              <p className="text-amber-700 font-medium text-sm leading-relaxed">
                Conformément à l'article L. 221-28, 3° du Code de la consommation, <strong>le droit de rétractation ne s'applique pas aux produits susceptibles de se détériorer ou de se périmer rapidement</strong>, ce qui est le cas de la totalité des produits frais proposés par Soleil et Saveurs.
              </p>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              Toutefois, si vous recevez un produit non conforme (avarie, erreur de produit), nous vous invitons à nous contacter immédiatement par WhatsApp ou email afin d'apporter une solution (remplacement, avoir ou remboursement).
            </p>
          </section>

          <section id="conformite" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              8. Conformité & réclamations
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Soleil et Saveurs s'engage à livrer des produits conformes à la commande et aux normes de qualité en vigueur. En cas de problème (produit abîmé, erreur de livraison), le Client dispose de <strong className="text-[#3D2B1F]">24h après réception</strong> pour nous le signaler avec photo à l'appui — idéalement dans les 2h suivant la livraison, pour un traitement plus rapide.
            </p>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              Contact : <strong className="text-[#3D2B1F]">soleiletsaveurs.livraison@gmail.com</strong> ou via WhatsApp au <strong className="text-[#3D2B1F]">07 59 72 00 83</strong>.
            </p>
          </section>

          <section id="responsabilite" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              9. Responsabilité
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              Soleil et Saveurs ne saurait être tenu responsable de dommages indirects liés à l'utilisation du site ou à une défaillance temporaire de service. Sa responsabilité ne peut excéder le montant de la commande concernée.
              En cas de force majeure (intempéries, indisponibilité des récoltes), Soleil et Saveurs informera le Client dans les meilleurs délais.
            </p>
          </section>

          <section id="donnees" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              10. Données personnelles
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              Les données personnelles collectées dans le cadre de la commande sont traitées conformément à notre <Link href="/rgpd" className="text-[#C73600] hover:underline font-bold">Politique de confidentialité (RGPD)</Link>.
              Elles sont utilisées exclusivement pour le traitement et la livraison des commandes, et ne sont pas cédées à des tiers.
            </p>
          </section>

          <section id="litiges" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              11. Litiges & médiation
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Les présentes CGV sont soumises au droit français. En cas de litige, le Client s'adressera en priorité à Soleil et Saveurs pour trouver une solution amiable.
            </p>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              À défaut de résolution amiable, le Client peut recourir gratuitement à la médiation de la consommation conformément aux articles L. 616-1 et R. 616-1 du Code de la consommation.
            </p>
          </section>

          {/* Liens vers les autres pages légales */}
          <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-[#E8DCCB]">
            <Link href="/mentions" className="group flex items-center gap-4 bg-white border border-[#E8DCCB] p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center group-hover:bg-[#FFF1EA] transition-colors">
                <ShoppingBag className="w-5 h-5 text-[#6F5A4B] group-hover:text-[#C73600]" />
              </div>
              <div>
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F]">Mentions légales</p>
                <p className="text-xs text-[#6F5A4B] font-semibold">Informations éditeur & hébergeur</p>
              </div>
            </Link>
            <Link href="/rgpd" className="group flex items-center gap-4 bg-white border border-[#E8DCCB] p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center group-hover:bg-[#FFF1EA] transition-colors">
                <ShoppingBag className="w-5 h-5 text-[#6F5A4B] group-hover:text-[#C73600]" />
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
