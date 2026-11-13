import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function RGPDPage() {
  const sections = [
    { id: 'responsable',   title: 'Responsable du traitement' },
    { id: 'collecte',      title: 'Données collectées' },
    { id: 'finalites',     title: 'Finalités & bases légales' },
    { id: 'conservation',  title: 'Durée de conservation' },
    { id: 'destinataires', title: 'Destinataires' },
    { id: 'droits',        title: 'Vos droits' },
    { id: 'securite',      title: 'Sécurité' },
    { id: 'cookies',       title: 'Cookies & traceurs' },
    { id: 'mineurs',       title: 'Mineurs' },
    { id: 'contact',       title: 'Contact & réclamations' },
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
              <Shield className="w-6 h-6 text-[#C73600]" />
            </div>
            <span className="text-[#C73600] font-extrabold text-xs uppercase tracking-[0.14em]">Protection des données</span>
          </div>
          <h1 className="titre text-[44px] md:text-[64px] text-[#3D2B1F] leading-none">
            Politique de<br /><span className="italic font-medium text-[#FF4500]">Confidentialité</span>
          </h1>
          <p className="text-[#6F5A4B] text-sm font-semibold mt-3">Dernière mise à jour : 25 octobre 2026 — Conforme au RGPD (UE) 2016/679</p>
        </div>
      </section>

      {/* Bandeau intro */}
      <div className="bg-[#F5EAE0] border-b border-[#E3D6C4] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#5C4030] flex-shrink-0 mt-0.5" />
          <p className="text-[#5C4030] font-bold text-xs leading-relaxed">
            Soleil et Saveurs s'engage à protéger votre vie privée. Nous ne collectons que les données strictement nécessaires à la réalisation de vos commandes. Nous ne vous envoyons nos offres par e-mail que si vous l'avez accepté.
          </p>
        </div>
      </div>

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

          <section id="responsable" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              1. Responsable du traitement
            </h2>
            <div className="bg-[#F5EAE0] rounded-2xl p-5 border border-[#E8DCCB] space-y-2 text-[#5C4030] font-medium">
              <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Entité</span> SOLEIL ET SAVEURS (SAS au capital de 1 000 €, RCS Bobigny 821 324 324)</p>
              <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Responsable</span> Khaled Boulila</p>
              <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Adresse</span> 6-8 AVENUE HENRIETTE, 93170 BAGNOLET</p>
              <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Email</span> soleiletsaveurs.livraison@gmail.com</p>
            </div>
          </section>

          <section id="collecte" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              2. Données collectées
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-5">
              Nous collectons uniquement les données nécessaires au fonctionnement du service :
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5">
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F] tracking-widest mb-3">Lors de la création de compte</p>
                <ul className="space-y-1.5 text-[#5C4030] font-medium">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Adresse email</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Mot de passe (chiffré, non accessible)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Prénom et nom</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Date de naissance (vérification de la majorité)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Téléphone et adresse</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Code de parrainage utilisé (le cas échéant)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Choix de recevoir ou non nos offres par e-mail</li>
                </ul>
              </div>
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5">
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F] tracking-widest mb-3">Lors d'une commande</p>
                <ul className="space-y-1.5 text-[#5C4030] font-medium">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Nom complet</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Numéro de téléphone (pour la livraison)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Adresse de livraison complète</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Contenu et montant de la commande</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Date de livraison et commentaire éventuel</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Points de fidélité, parrainage et code promo utilisés</li>
                </ul>
              </div>
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5">
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F] tracking-widest mb-3">Données techniques (automatiques)</p>
                <ul className="space-y-1.5 text-[#5C4030] font-medium">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#C9BBAA] rounded-full flex-shrink-0" />Cookies de session d'authentification (Supabase)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#C9BBAA] rounded-full flex-shrink-0" />Panier temporaire (localStorage navigateur)</li>
                </ul>
              </div>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4 italic text-xs">
              Nous ne collectons pas de données de paiement (aucune carte bancaire n'est stockée sur nos serveurs).
            </p>
          </section>

          <section id="finalites" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              3. Finalités & bases légales
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#3D2B1F] text-[#F5EAE0]">
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest rounded-tl-xl">Finalité</th>
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest">Base légale</th>
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest rounded-tr-xl">Art. RGPD</th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4030] font-medium">
                  <tr className="border-b border-[#E8DCCB]">
                    <td className="p-3">Gestion des comptes clients</td>
                    <td className="p-3">Exécution du contrat</td>
                    <td className="p-3">6(1)(b)</td>
                  </tr>
                  <tr className="border-b border-[#E8DCCB] bg-[#F5EAE0]">
                    <td className="p-3">Traitement et livraison des commandes</td>
                    <td className="p-3">Exécution du contrat</td>
                    <td className="p-3">6(1)(b)</td>
                  </tr>
                  <tr className="border-b border-[#E8DCCB]">
                    <td className="p-3">Contact client et service après-vente</td>
                    <td className="p-3">Intérêt légitime</td>
                    <td className="p-3">6(1)(f)</td>
                  </tr>
                  <tr className="border-b border-[#E8DCCB] bg-[#F5EAE0]">
                    <td className="p-3">Obligations légales et comptabilité</td>
                    <td className="p-3">Obligation légale</td>
                    <td className="p-3">6(1)(c)</td>
                  </tr>
                  <tr>
                    <td className="p-3">Authentification sécurisée</td>
                    <td className="p-3">Intérêt légitime (sécurité)</td>
                    <td className="p-3">6(1)(f)</td>
                  </tr>
                  <tr className="border-t border-[#E8DCCB] bg-[#F5EAE0]">
                    <td className="p-3">Envoi de nos offres par e-mail (si vous l'avez accepté)</td>
                    <td className="p-3">Consentement (retirable à tout moment)</td>
                    <td className="p-3">6(1)(a)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              Nous ne faisons aucun profilage commercial et ne vendons jamais vos données. Les offres par e-mail ne sont envoyées qu'aux clients qui l'ont accepté à l'inscription ; vous pouvez retirer ce consentement à tout moment par simple e-mail.
            </p>
          </section>

          <section id="conservation" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              4. Durée de conservation
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-[#F5EAE0] rounded-2xl p-4 border border-[#E8DCCB]">
                <span className="font-bold text-[#3D2B1F]">Données de compte</span>
                <span className="text-[#C73600] font-extrabold text-xs uppercase">Jusqu'à suppression du compte</span>
              </div>
              <div className="flex justify-between items-center bg-[#F5EAE0] rounded-2xl p-4 border border-[#E8DCCB]">
                <span className="font-bold text-[#3D2B1F]">Données de commandes</span>
                <span className="text-[#C73600] font-extrabold text-xs uppercase">10 ans (obligation comptable)</span>
              </div>
              <div className="flex justify-between items-center bg-[#F5EAE0] rounded-2xl p-4 border border-[#E8DCCB]">
                <span className="font-bold text-[#3D2B1F]">Cookie de session</span>
                <span className="text-[#C73600] font-extrabold text-xs uppercase">Jusqu'à la déconnexion</span>
              </div>
              <div className="flex justify-between items-center bg-[#F5EAE0] rounded-2xl p-4 border border-[#E8DCCB]">
                <span className="font-bold text-[#3D2B1F]">Panier (localStorage)</span>
                <span className="text-[#C73600] font-extrabold text-xs uppercase">Jusqu'à vidage manuel / commande</span>
              </div>
            </div>
          </section>

          <section id="destinataires" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              5. Destinataires des données
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-5">
              Vos données sont accessibles uniquement à Soleil et Saveurs et à nos sous-traitants techniques, dans la stricte mesure nécessaire au service :
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-xs text-[#3D2B1F]">SB</div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Supabase Inc.</p>
                  <p className="text-[#5C4030] font-medium text-[13px]">Hébergement de la base de données (authentification + commandes). Certifié SOC 2 Type II.</p>
                </div>
              </div>
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-xs text-[#3D2B1F]">HO</div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Hostinger International Ltd</p>
                  <p className="text-[#5C4030] font-medium text-[13px]">Hébergement du site web.</p>
                </div>
              </div>
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-xs text-[#3D2B1F]">RS</div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Resend</p>
                  <p className="text-[#5C4030] font-medium text-[13px]">Envoi des e-mails de confirmation et de livraison (adresse e-mail, nom, adresse et contenu de la commande).</p>
                </div>
              </div>
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-xs text-[#3D2B1F]">TG</div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Telegram et Anthropic</p>
                  <p className="text-[#5C4030] font-medium text-[13px]">Assistant de gestion réservé à l'administrateur : consultation des commandes du jour (nom, téléphone, adresse, articles).</p>
                </div>
              </div>
              <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-xs text-[#3D2B1F]">BA</div>
                <div>
                  <p className="font-extrabold text-xs uppercase text-[#3D2B1F] mb-1">Base Adresse Nationale (État)</p>
                  <p className="text-[#5C4030] font-medium text-[13px]">Vérification et géolocalisation de l'adresse saisie (api-adresse.data.gouv.fr), pour la zone et les frais de livraison.</p>
                </div>
              </div>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              Ces sous-traitants agissent exclusivement sur nos instructions et sont soumis à des obligations contractuelles de confidentialité conformes au RGPD. Certains sont établis hors de l'Union européenne (notamment aux États-Unis), ce qui implique un transfert de données hors UE.
              <strong className="text-[#3D2B1F]"> Aucune donnée n'est vendue ou cédée à des tiers à des fins commerciales.</strong>
            </p>
          </section>

          <section id="droits" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              6. Vos droits
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-5">
              Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants sur vos données personnelles :
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { right: "Droit d'accès", desc: 'Obtenir une copie de vos données personnelles', art: 'Art. 15' },
                { right: 'Droit de rectification', desc: 'Corriger vos données inexactes ou incomplètes', art: 'Art. 16' },
                { right: "Droit à l'effacement", desc: 'Demander la suppression de vos données', art: 'Art. 17' },
                { right: 'Droit à la limitation', desc: 'Restreindre le traitement de vos données', art: 'Art. 18' },
                { right: 'Droit à la portabilité', desc: 'Recevoir vos données dans un format structuré', art: 'Art. 20' },
                { right: "Droit d'opposition", desc: 'Vous opposer au traitement de vos données', art: 'Art. 21' },
              ].map((item) => (
                <div key={item.right} className="bg-[#F5EAE0] rounded-2xl p-4 border border-[#E8DCCB]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-extrabold text-xs uppercase text-[#3D2B1F]">{item.right}</p>
                    <span className="text-[11px] font-extrabold text-[#C73600] bg-[#FFF1EA] px-2 py-0.5 rounded-full uppercase">{item.art}</span>
                  </div>
                  <p className="text-[#5C4030] font-medium text-[13px] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#3D2B1F] rounded-2xl p-5 mt-5 text-[#F5EAE0]">
              <p className="font-extrabold text-xs uppercase tracking-widest text-[#C73600] mb-2">Exercer vos droits</p>
              <p className="font-medium text-sm leading-relaxed text-[#E1D2C2]">
                Adressez votre demande par email à <strong className="text-[#F5EAE0]">soleiletsaveurs.livraison@gmail.com</strong> en précisant votre identité. Nous répondrons dans un délai maximum d'<strong className="text-[#F5EAE0]">un mois</strong>.
              </p>
            </div>
          </section>

          <section id="securite" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              7. Sécurité des données
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="space-y-2 text-[#5C4030] font-medium">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Connexion chiffrée HTTPS (TLS) sur l'ensemble du site</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Mots de passe hachés (bcrypt via Supabase Auth)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Accès administrateur réservé au compte administrateur (rôle vérifié côté serveur)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Règles de sécurité au niveau base de données (RLS Supabase)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Aucune donnée de paiement stockée sur nos serveurs</li>
            </ul>
          </section>

          <section id="cookies" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              8. Cookies & traceurs
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-5">
              Notre site utilise uniquement des cookies strictement nécessaires au fonctionnement du service. Aucun cookie de traçage ou publicitaire n'est utilisé.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#3D2B1F] text-[#F5EAE0]">
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest rounded-tl-xl">Cookie</th>
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest">Finalité</th>
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest">Durée</th>
                    <th className="text-left p-3 font-extrabold uppercase tracking-widest rounded-tr-xl">Consentement</th>
                  </tr>
                </thead>
                <tbody className="text-[#5C4030] font-medium">
                  <tr className="border-b border-[#E8DCCB]">
                    <td className="p-3 font-mono">sb-*-auth-token</td>
                    <td className="p-3">Session d'authentification Supabase</td>
                    <td className="p-3">Jusqu'à la déconnexion</td>
                    <td className="p-3"><span className="bg-[#F5EAE0] text-[#5C4030] px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase">Technique</span></td>
                  </tr>
                  <tr className="bg-[#F5EAE0]">
                    <td className="p-3 font-mono">mon-panier</td>
                    <td className="p-3">Conservation du panier (localStorage)</td>
                    <td className="p-3">Session / Manuel</td>
                    <td className="p-3"><span className="bg-[#F5EAE0] text-[#5C4030] px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase">Technique</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4 italic text-xs">
              Ces cookies étant strictement nécessaires, ils ne requièrent pas de consentement préalable conformément à la délibération CNIL du 17 septembre 2020.
            </p>
          </section>

          <section id="mineurs" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              9. Mineurs
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed">
              Le site Soleil et Saveurs est destiné à un public adulte. Nous ne collectons pas sciemment de données personnelles concernant des enfants de moins de 16 ans. Si vous pensez qu'un mineur nous a transmis ses données, contactez-nous afin que nous procédions à leur suppression.
            </p>
          </section>

          <section id="contact" className="scroll-mt-20">
            <h2 className="titre text-2xl md:text-[28px] leading-tight text-[#3D2B1F] mb-4 pb-3 border-b border-[#E3D6C4]">
              10. Contact & réclamations
            </h2>
            <p className="text-[#5C4030] font-medium leading-relaxed mb-4">
              Pour toute question ou demande relative à vos données personnelles :
            </p>
            <div className="bg-[#F5EAE0] rounded-2xl p-5 border border-[#E8DCCB] space-y-2 text-[#5C4030] font-medium">
              <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">Email</span> soleiletsaveurs.livraison@gmail.com</p>
              <p><span className="text-[#6F5A4B] text-xs uppercase font-extrabold tracking-wider mr-2">WhatsApp</span> 07 59 72 00 83</p>
            </div>
            <p className="text-[#5C4030] font-medium leading-relaxed mt-4">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la <strong className="text-[#3D2B1F]">CNIL</strong> :
            </p>
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 bg-[#FF4500] text-white px-5 py-3 rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-[#3D2B1F] transition-all"
            >
              Saisir la CNIL →
            </a>
          </section>

          {/* Liens vers les autres pages légales */}
          <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-[#E8DCCB]">
            <Link href="/mentions" className="group flex items-center gap-4 bg-white border border-[#E8DCCB] p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center group-hover:bg-[#FFF1EA] transition-colors">
                <Shield className="w-5 h-5 text-[#6F5A4B] group-hover:text-[#C73600]" />
              </div>
              <div>
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F]">Mentions légales</p>
                <p className="text-xs text-[#6F5A4B] font-semibold">Informations éditeur & hébergeur</p>
              </div>
            </Link>
            <Link href="/cgv" className="group flex items-center gap-4 bg-white border border-[#E8DCCB] p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-[#F5EAE0] rounded-xl flex items-center justify-center group-hover:bg-[#FFF1EA] transition-colors">
                <Shield className="w-5 h-5 text-[#6F5A4B] group-hover:text-[#C73600]" />
              </div>
              <div>
                <p className="font-extrabold text-xs uppercase text-[#3D2B1F]">CGV</p>
                <p className="text-xs text-[#6F5A4B] font-semibold">Conditions Générales de Vente</p>
              </div>
            </Link>
          </div>

        </article>
      </div>

      <footer className="py-10 border-t border-[#E3D6C4] text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6F5A4B]">
          © 2026 Soleil et Saveurs — Conforme RGPD (UE) 2016/679
        </p>
      </footer>
    </div>
  );
}
