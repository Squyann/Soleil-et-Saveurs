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
    <div className="min-h-screen bg-[#FDFCF9]">

      {/* Hero */}
      <section className="bg-slate-900 pt-10 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-[#FF4500]/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#FF4500] font-bold text-xs uppercase tracking-widest transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Retour boutique
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#FF4500]/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#FF4500]" />
            </div>
            <span className="text-[#FF4500] font-black text-xs uppercase tracking-[0.3em]">Protection des données</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
            Politique de<br /><span className="text-[#FF4500]">Confidentialité</span>
          </h1>
          <p className="text-slate-400 text-sm font-bold mt-4">Dernière mise à jour : 3 mai 2026 — Conforme au RGPD (UE) 2016/679</p>
        </div>
      </section>

      {/* Bandeau intro */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 font-bold text-xs leading-relaxed">
            Soleil Saveurs s'engage à protéger votre vie privée. Nous ne collectons que les données strictement nécessaires à la réalisation de vos commandes et n'en faisons aucun usage commercial.
          </p>
        </div>
      </div>

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

          <section id="responsable" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              1. Responsable du traitement
            </h2>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2 text-slate-600 font-medium">
              <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Entité</span> Soleil Saveurs (entreprise individuelle)</p>
              <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Responsable</span> [Prénom Nom]</p>
              <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Adresse</span> Plaisir (78370), Yvelines, France</p>
              <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Email</span> soleiletsaveurs.livraison@gmail.com</p>
            </div>
          </section>

          <section id="collecte" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              2. Données collectées
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-5">
              Nous collectons uniquement les données nécessaires au fonctionnement du service :
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="font-black text-xs uppercase text-slate-900 tracking-widest mb-3">Lors de la création de compte</p>
                <ul className="space-y-1.5 text-slate-600 font-medium">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Adresse email</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Mot de passe (chiffré, non accessible)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Prénom et nom (optionnel à l'inscription)</li>
                </ul>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="font-black text-xs uppercase text-slate-900 tracking-widest mb-3">Lors d'une commande</p>
                <ul className="space-y-1.5 text-slate-600 font-medium">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Nom complet</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Numéro de téléphone (pour la livraison)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Adresse de livraison complète</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full flex-shrink-0" />Contenu et montant de la commande</li>
                </ul>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className="font-black text-xs uppercase text-slate-900 tracking-widest mb-3">Données techniques (automatiques)</p>
                <ul className="space-y-1.5 text-slate-600 font-medium">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full flex-shrink-0" />Cookies de session d'authentification (Supabase)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full flex-shrink-0" />Panier temporaire (localStorage navigateur)</li>
                </ul>
              </div>
            </div>
            <p className="text-slate-500 font-medium leading-relaxed mt-4 italic text-xs">
              Nous ne collectons pas de données de paiement (aucune carte bancaire n'est stockée sur nos serveurs).
            </p>
          </section>

          <section id="finalites" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              3. Finalités & bases légales
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left p-3 font-black uppercase tracking-widest rounded-tl-xl">Finalité</th>
                    <th className="text-left p-3 font-black uppercase tracking-widest">Base légale</th>
                    <th className="text-left p-3 font-black uppercase tracking-widest rounded-tr-xl">Art. RGPD</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 font-medium">
                  <tr className="border-b border-slate-100">
                    <td className="p-3">Gestion des comptes clients</td>
                    <td className="p-3">Exécution du contrat</td>
                    <td className="p-3">6(1)(b)</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="p-3">Traitement et livraison des commandes</td>
                    <td className="p-3">Exécution du contrat</td>
                    <td className="p-3">6(1)(b)</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-3">Contact client et service après-vente</td>
                    <td className="p-3">Intérêt légitime</td>
                    <td className="p-3">6(1)(f)</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td className="p-3">Obligations légales et comptabilité</td>
                    <td className="p-3">Obligation légale</td>
                    <td className="p-3">6(1)(c)</td>
                  </tr>
                  <tr>
                    <td className="p-3">Authentification sécurisée</td>
                    <td className="p-3">Intérêt légitime (sécurité)</td>
                    <td className="p-3">6(1)(f)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed mt-4">
              Nous n'utilisons pas vos données à des fins de marketing direct, de profilage commercial ou de vente à des tiers.
            </p>
          </section>

          <section id="conservation" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              4. Durée de conservation
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="font-bold text-slate-700">Données de compte</span>
                <span className="text-[#FF4500] font-black text-xs uppercase">Jusqu'à suppression du compte</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="font-bold text-slate-700">Données de commandes</span>
                <span className="text-[#FF4500] font-black text-xs uppercase">10 ans (obligation comptable)</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="font-bold text-slate-700">Cookie de session</span>
                <span className="text-[#FF4500] font-black text-xs uppercase">Durée de la session</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <span className="font-bold text-slate-700">Panier (localStorage)</span>
                <span className="text-[#FF4500] font-black text-xs uppercase">Jusqu'à vidage manuel / commande</span>
              </div>
            </div>
          </section>

          <section id="destinataires" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              5. Destinataires des données
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-5">
              Vos données sont accessibles uniquement à Soleil Saveurs et à nos sous-traitants techniques, dans la stricte mesure nécessaire au service :
            </p>
            <div className="space-y-3">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs text-slate-900">SB</div>
                <div>
                  <p className="font-black text-xs uppercase text-slate-900 mb-1">Supabase Inc.</p>
                  <p className="text-slate-500 font-medium text-xs">Hébergement de la base de données (authentification + commandes). Certifié SOC 2 Type II.</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs text-slate-900">VL</div>
                <div>
                  <p className="font-black text-xs uppercase text-slate-900 mb-1">Vercel Inc.</p>
                  <p className="text-slate-500 font-medium text-xs">Hébergement du site web. Logs de requêtes conservés 30 jours.</p>
                </div>
              </div>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed mt-4">
              Ces sous-traitants agissent exclusivement sur nos instructions et sont soumis à des obligations contractuelles de confidentialité conformes au RGPD.
              <strong className="text-slate-900"> Aucune donnée n'est vendue ou cédée à des tiers à des fins commerciales.</strong>
            </p>
          </section>

          <section id="droits" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              6. Vos droits
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-5">
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
                <div key={item.right} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-black text-xs uppercase text-slate-900">{item.right}</p>
                    <span className="text-[9px] font-black text-[#FF4500] bg-orange-50 px-2 py-0.5 rounded-full uppercase">{item.art}</span>
                  </div>
                  <p className="text-slate-500 font-medium text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 rounded-2xl p-5 mt-5 text-white">
              <p className="font-black text-xs uppercase tracking-widest text-[#FF4500] mb-2">Exercer vos droits</p>
              <p className="font-medium text-sm leading-relaxed text-slate-300">
                Adressez votre demande par email à <strong className="text-white">soleiletsaveurs.livraison@gmail.com</strong> en précisant votre identité. Nous répondrons dans un délai maximum d'<strong className="text-white">un mois</strong>.
              </p>
            </div>
          </section>

          <section id="securite" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              7. Sécurité des données
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="space-y-2 text-slate-600 font-medium">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Connexion chiffrée HTTPS (TLS) sur l'ensemble du site</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Mots de passe hachés (bcrypt via Supabase Auth)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Accès administrateur protégé par authentification forte</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Règles de sécurité au niveau base de données (RLS Supabase)</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />Aucune donnée de paiement stockée sur nos serveurs</li>
            </ul>
          </section>

          <section id="cookies" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              8. Cookies & traceurs
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-5">
              Notre site utilise uniquement des cookies strictement nécessaires au fonctionnement du service. Aucun cookie de traçage ou publicitaire n'est utilisé.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left p-3 font-black uppercase tracking-widest rounded-tl-xl">Cookie</th>
                    <th className="text-left p-3 font-black uppercase tracking-widest">Finalité</th>
                    <th className="text-left p-3 font-black uppercase tracking-widest">Durée</th>
                    <th className="text-left p-3 font-black uppercase tracking-widest rounded-tr-xl">Consentement</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 font-medium">
                  <tr className="border-b border-slate-100">
                    <td className="p-3 font-mono">sb-*-auth-token</td>
                    <td className="p-3">Session d'authentification Supabase</td>
                    <td className="p-3">Session</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Technique</span></td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-3 font-mono">mon-panier</td>
                    <td className="p-3">Conservation du panier (localStorage)</td>
                    <td className="p-3">Session / Manuel</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Technique</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 font-medium leading-relaxed mt-4 italic text-xs">
              Ces cookies étant strictement nécessaires, ils ne requièrent pas de consentement préalable conformément à la délibération CNIL du 17 septembre 2020.
            </p>
          </section>

          <section id="mineurs" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              9. Mineurs
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Le site Soleil Saveurs est destiné à un public adulte. Nous ne collectons pas sciemment de données personnelles concernant des enfants de moins de 16 ans. Si vous pensez qu'un mineur nous a transmis ses données, contactez-nous afin que nous procédions à leur suppression.
            </p>
          </section>

          <section id="contact" className="scroll-mt-24">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-5 pb-3 border-b-2 border-slate-100">
              10. Contact & réclamations
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-4">
              Pour toute question ou demande relative à vos données personnelles :
            </p>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2 text-slate-600 font-medium">
              <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">Email</span> soleiletsaveurs.livraison@gmail.com</p>
              <p><span className="text-slate-400 text-xs uppercase font-black tracking-widest mr-2">WhatsApp</span> [+33 6 XX XX XX XX]</p>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed mt-4">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la <strong className="text-slate-900">CNIL</strong> :
            </p>
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 bg-[#FF4500] text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all"
            >
              Saisir la CNIL →
            </a>
          </section>

          {/* Liens vers les autres pages légales */}
          <div className="grid sm:grid-cols-2 gap-4 pt-8 border-t border-slate-100">
            <Link href="/mentions" className="group flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <Shield className="w-5 h-5 text-slate-400 group-hover:text-[#FF4500]" />
              </div>
              <div>
                <p className="font-black text-xs uppercase text-slate-900">Mentions légales</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Informations éditeur & hébergeur</p>
              </div>
            </Link>
            <Link href="/cgv" className="group flex items-center gap-4 bg-white border border-slate-100 p-5 rounded-2xl hover:border-[#FF4500] hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <Shield className="w-5 h-5 text-slate-400 group-hover:text-[#FF4500]" />
              </div>
              <div>
                <p className="font-black text-xs uppercase text-slate-900">CGV</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Conditions Générales de Vente</p>
              </div>
            </Link>
          </div>

        </article>
      </div>

      <footer className="py-16 border-t border-slate-100 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
          © 2026 Soleil Saveurs — Conforme RGPD (UE) 2016/679
        </p>
      </footer>
    </div>
  );
}
