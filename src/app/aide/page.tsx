'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageCircle, Phone, ShieldCheck, Truck, Search, CreditCard, RefreshCcw, Star,
  ArrowRight, Loader2, Send, Leaf, Gift, UserCheck, MapPin, AlertCircle, Check, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const FAQ_CATEGORIES = [
  {
    id: 'delivery',
    icon: <Truck className="w-5 h-5" />,
    title: "Livraison & Zones",
    questions: [
      {
        q: "Quels sont vos délais exacts de livraison ?",
        a: "Vous choisissez votre date de livraison dans le panier : au plus tôt le lendemain (commande avant minuit), selon les jours de livraison proposés. La livraison a lieu entre 15h et 20h."
      },
      {
        q: "Quelles villes du 78 desservez-vous ?",
        a: "Nous livrons dans TOUTES les communes des Yvelines (78), au départ de nos points relais de Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre et Saint-Nom-la-Bretèche (livraison offerte dans ces 4 villes). Vous pouvez vérifier votre éligibilité directement sur la page d'accueil en saisissant votre adresse."
      },
      {
        q: "Que se passe-t-il si je suis absent lors de la livraison ?",
        a: "Pas d'inquiétude ! Indiquez un lieu sûr dans les notes de commande (voisin de confiance, boîte à colis, porche abrité). Nos livreurs sont habitués et vous enverront une photo de dépôt via WhatsApp pour confirmation."
      },
      {
        q: "Combien coûtent les frais de livraison ? Sont-ils gratuits ?",
        a: "La livraison est OFFERTE, quel que soit le montant, si vous habitez dans une ville de nos points relais : Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre ou Saint-Nom-la-Bretèche.\n\nAilleurs dans les Yvelines, elle est OFFERTE dès 40€ de produits. En dessous, les frais dépendent de la distance (à vol d'oiseau) entre votre adresse et notre point relais le plus proche :\n• jusqu'à 3 km : 3€\n• de 3 à 6 km : 4€\n• au-delà de 6 km : 5€\n\nLe seuil de 40€ se calcule sur vos produits avant remises : un code promo, la remise fidélité ou le parrainage ne vous font jamais perdre la livraison offerte. Le minimum de commande est de 10€ (après remises, hors frais de livraison). Les frais exacts s'affichent dans votre panier avant validation ; ils sont payés avec la commande, à la livraison."
      },
      {
        q: "Puis-je choisir un créneau horaire précis ?",
        a: "Pour le moment, la livraison se fait entre 15h et 20h. Nous travaillons sur des créneaux personnalisables pour les prochains mois. En attendant, notre équipe peut noter une préférence horaire dans les commentaires de commande."
      }
    ]
  },
  {
    id: 'products',
    icon: <Leaf className="w-5 h-5" />,
    title: "Qualité & Agriculture",
    questions: [
      {
        q: "Pourquoi certains fruits ne sont pas disponibles toute l'année ?",
        a: "Nous suivons les saisons et privilégions les producteurs français. Certains fruits (agrumes, ananas, mangues…) viennent de plus loin : l'origine de chaque produit est toujours indiquée sur sa fiche. Un produit hors saison ou introuvable en qualité suffisante sort simplement du catalogue."
      },
    ]
  },
  {
    id: 'account',
    icon: <UserCheck className="w-5 h-5" />,
    title: "Mon Compte & Fidélité",
    questions: [
      {
        q: "Comment fonctionne le programme de fidélité ?",
        a: "C'est automatique : chaque euro de commande (hors frais de livraison, après remises) vous rapporte 1 point. Dès 100 points, vous pouvez activer une remise de -10% dans le panier ; l'utiliser consomme la totalité de vos points. La remise fidélité ne se cumule ni avec le parrainage ni avec un code promo. Votre solde est visible dans votre espace client."
      },
      {
        q: "Puis-je modifier mon adresse après avoir passé une commande ?",
        a: "Contactez-nous au plus vite sur WhatsApp : tant que la commande n'est pas partie en livraison, nous la modifions pour vous. L'onglet 'Adresses' de votre espace client sert à mettre à jour l'adresse utilisée pour vos prochaines commandes."
      },
      {
        q: "Proposez-vous des abonnements ou des paniers récurrents ?",
        a: "Nous y travaillons activement ! Des 'Paniers de Saison' hebdomadaires automatisés sont prévus pour simplifier votre quotidien tout en soutenant les producteurs locaux. Restez connecté à votre compte pour être parmi les premiers informés."
      },
      {
        q: "Comment créer ou accéder à mon compte ?",
        a: "Rendez-vous sur la page de connexion via l'icône en haut à droite. La création de compte est rapide (moins de 2 minutes) et vous permet de suivre vos commandes, gérer vos adresses et consulter votre programme de fidélité."
      }
    ]
  },
  {
    id: 'billing',
    icon: <CreditCard className="w-5 h-5" />,
    title: "Paiement & Sécurité",
    questions: [
      {
        q: "Est-ce que le paiement est sécurisé ?",
        a: "Oui : le paiement se fait à la livraison, en espèces ou par carte bancaire auprès du livreur. Aucune donnée bancaire n'est saisie ni stockée sur le site. Le paiement en ligne sera proposé prochainement."
      },
      {
        q: "Acceptez-vous les tickets restaurant ?",
        a: "Non. Nous acceptons uniquement les espèces et la carte bancaire, au moment de la livraison."
      },
      {
        q: "Comment obtenir ma facture ?",
        a: "Votre facture est téléchargeable dans votre espace client (onglet Commandes) dès que la commande est livrée."
      }
    ]
  },
  {
    id: 'eco',
    icon: <RefreshCcw className="w-5 h-5" />,
    title: "Écologie & Réclamations",
    questions: [
      {
        q: "Que faire de ma cagette vide ?",
        a: "Surtout ne la jetez pas ! La cagette est consignée gratuitement : remettez-la au livreur lors de votre prochaine livraison. Nous réutilisons chaque cagette jusqu'à 20 fois."
      },
      {
        q: "Un produit est arrivé abîmé, que faire ?",
        a: "Prenez une photo et envoyez-la nous via WhatsApp ou ce formulaire dans les 24h suivant la livraison (idéalement dans les 2h). Nous vous créditons la valeur du produit, sans discussion. Votre satisfaction est non négociable."
      },
      {
        q: "Comment réduisez-vous votre empreinte carbone ?",
        a: "Nos tournées de livraison partent de 5 points relais au cœur des Yvelines et sont optimisées par zone pour réduire les kilomètres parcourus. Nos cagettes sont consignées et réutilisées, et nous privilégions les produits français de saison."
      }
    ]
  }
];

export default function AidePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  // Thème de FAQ affiché (« toutes » ou l'identifiant d'une catégorie)
  const [theme, setTheme] = useState('toutes');
  
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    if (searchTerm) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return FAQ_CATEGORIES;
    return FAQ_CATEGORIES.map(category => ({
      ...category,
      questions: category.questions.filter(
        q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
             q.a.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(category => category.questions.length > 0);
  }, [searchTerm]);

  // CORRECTION : insertion Supabase robuste avec gestion d'erreur détaillée
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('sending');

    try {
      const payload = { 
        nom: contactName.trim(), 
        email: contactEmail.trim(), 
        message: contactMessage.trim(),
        lu: false
      };

      const { error } = await supabase
        .from('messages')
        .insert([payload]);

      if (error) {
        console.error('Erreur Supabase:', error);
        throw new Error(error.message || 'Erreur inconnue');
      }

      setFormStatus('sent');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi:', err);
      setFormStatus('error');
    }
  };

  // Filtre par thème (« Toutes » par défaut) ; une recherche porte sur tous les thèmes
  const categoriesAffichees = searchTerm.trim() || theme === 'toutes'
    ? filteredCategories
    : filteredCategories.filter(c => c.id === theme);

  const SURTITRE = 'text-[11px] md:text-xs font-extrabold uppercase tracking-[0.14em] text-[#C73600]';
  const etiquette = 'block mb-1.5 text-[13px] font-bold text-[#5C4030]';
  const champ = 'w-full h-[52px] px-4 rounded-[14px] border-[1.5px] border-[#E0D3C0] bg-white text-base font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium outline-none focus:border-[#FF4500] transition-colors';

  return (
    <div className="min-h-screen bg-[#EDE3D5] text-[#3D2B1F] pb-10">

      {/* EN-TÊTE DE PAGE */}
      <header className="bg-[#F5EAE0] border-b border-[#E3D6C4]">
        <div className="max-w-[1240px] mx-auto px-5 pt-5 pb-6 md:pt-8 md:pb-[38px]">
          <nav aria-label="Fil d'Ariane" className="hidden md:flex items-center gap-2 mb-3.5 text-[13px] font-semibold text-[#6F5A4B]">
            <Link href="/" className="hover:text-[#C73600] transition-colors">Accueil</Link>
            <span aria-hidden>›</span>
            <span aria-current="page" className="font-bold text-[#3D2B1F]">Aide</span>
          </nav>
          <div className="flex items-end justify-between gap-x-6 gap-y-3 flex-wrap">
            <div>
              <h1 className="titre text-[44px] md:text-[64px] leading-none">Aide <em className="text-[#FF4500]">&amp; infos</em></h1>
              <p className="mt-2 md:mt-2.5 text-[15px] md:text-[17px] text-[#5C4030]">Soleil et Saveurs — Votre Service Client Local</p>
            </div>
            <p className="md:mb-1.5 flex gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-full bg-white border border-[#E8DCCB] text-xs md:text-[13px] font-bold text-[#C73600]"><MapPin className="w-[15px] h-[15px]" aria-hidden />78 uniquement</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-full bg-white border border-[#E8DCCB] text-xs md:text-[13px] font-bold text-[#166534]"><ShieldCheck className="w-[15px] h-[15px]" aria-hidden />Garanti frais</span>
            </p>
          </div>
          <div className="mt-5 md:mt-[26px] flex items-center gap-3 md:gap-3.5 h-[54px] md:h-[60px] px-4 md:px-[22px] rounded-2xl md:rounded-[18px] bg-white border border-[#E0D3C0] shadow-[0_14px_30px_-22px_rgba(61,43,31,0.35)] focus-within:border-[#FF4500] transition-colors">
            {isSearching ? <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[#FF4500]" aria-hidden /> : <Search className="w-5 h-5 shrink-0 text-[#6F5A4B]" aria-hidden />}
            <input
              type="search"
              aria-label="Rechercher dans l'aide"
              placeholder="Tapez votre question (ex: Livraison, Bio, Remboursement...)"
              className="flex-1 min-w-0 bg-transparent text-base md:text-[17px] font-semibold text-[#3D2B1F] placeholder:text-[#8C7867] placeholder:font-medium outline-none [&::-webkit-search-cancel-button]:hidden"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-3 md:px-5">

        {/* RACCOURCIS */}
        <div className="pt-4 md:pt-7 grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5">
          {[
            { icon: <MessageCircle className="w-[22px] h-[22px]" />, vert: true, label: "WhatsApp", sub: "Réponse < 15min", link: "https://wa.me/33759720083" },
            { icon: <Phone className="w-[22px] h-[22px]" />, vert: false, label: "Téléphone", sub: "9h-19h Non-stop", link: "tel:+33759720083" },
            { icon: <Star className="w-[22px] h-[22px]" />, vert: false, label: "Fidélité", sub: "-10% dès 100 pts", link: "/compte" },
            { icon: <AlertCircle className="w-[22px] h-[22px]" />, vert: false, label: "Litige", sub: "Photo & Crédit", link: "mailto:soleiletsaveurs.livraison@gmail.com" }
          ].map((action, i) => (
            <a
              key={i}
              href={action.link}
              target={action.link.startsWith('http') ? "_blank" : undefined}
              rel={action.link.startsWith('http') ? "noopener noreferrer" : undefined}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5 p-4 md:p-5 rounded-[20px] md:rounded-[22px] bg-white border border-[#E8DCCB] transition-[transform,box-shadow] duration-300 ease-out md:hover:-translate-y-1 md:hover:shadow-[0_26px_44px_-28px_rgba(61,43,31,0.5)]"
            >
              <span className={`shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-[14px] md:rounded-[15px] flex items-center justify-center ${action.vert ? 'bg-[#ECF7EF] text-[#15803D]' : 'bg-[#FFF1EA] text-[#FF4500]'}`} aria-hidden>{action.icon}</span>
              <span>
                <strong className="block text-[15px] md:text-[17px] font-extrabold">{action.label}</strong>
                <span className="block text-[13px] md:text-sm font-semibold text-[#6F5A4B]">{action.sub}</span>
              </span>
            </a>
          ))}
        </div>

        {/* FRAIS DE LIVRAISON : conditions et tarifs (mêmes règles que le calcul de la commande) */}
        <section id="frais-livraison" className="scroll-mt-32 mt-4 md:mt-7 bg-white rounded-3xl md:rounded-[32px] border border-[#E8DCCB] p-5 md:p-10 grid lg:grid-cols-2 gap-6 lg:gap-12">
          <div>
            <p className={`${SURTITRE} mb-2 md:mb-2.5`}>Partout dans les Yvelines (78)</p>
            <h2 className="titre text-[32px] md:text-[40px] leading-none mb-4 md:mb-[22px]">Frais de <em className="text-[#FF4500]">livraison</em></h2>
            <p className="mb-2.5 flex gap-3 px-3.5 py-3 md:px-4 md:py-3.5 rounded-2xl bg-[#ECF7EF] text-sm md:text-[15px] leading-snug font-semibold text-[#166534]">
              <Gift className="w-5 h-5 shrink-0 mt-px" aria-hidden />
              <span>Livraison <strong className="font-extrabold">offerte</strong> à Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre et Saint-Nom-la-Bretèche, quel que soit le montant</span>
            </p>
            <p className="mb-5 md:mb-[22px] flex gap-3 px-3.5 py-3 md:px-4 md:py-3.5 rounded-2xl bg-[#ECF7EF] text-sm md:text-[15px] leading-snug font-semibold text-[#166534]">
              <Gift className="w-5 h-5 shrink-0 mt-px" aria-hidden />
              <span>Ailleurs dans le 78 : offerte dès 40€ de produits</span>
            </p>
            <p className="mb-2.5 text-sm font-bold text-[#5C4030]">En dessous de 40€, hors villes relais, selon la distance</p>
            <table className="w-full border-separate border-spacing-0 rounded-2xl overflow-hidden border border-[#E8DCCB] text-[15px] md:text-base">
              <tbody>
                {[
                  { distance: "Jusqu'à 3 km", prix: '3€' },
                  { distance: 'De 3 à 6 km', prix: '4€' },
                  { distance: 'Au-delà de 6 km', prix: '5€' },
                ].map((palier, i) => (
                  <tr key={palier.distance}>
                    <th scope="row" className={`px-4 py-3 md:px-[18px] md:py-3.5 text-left font-semibold text-[#5C4030] ${i < 2 ? 'border-b border-[#F0E7DA]' : ''}`}>{palier.distance}</th>
                    <td className={`px-4 py-3 md:px-[18px] md:py-3.5 text-right text-[19px] font-black ${i < 2 ? 'border-b border-[#F0E7DA]' : ''}`}>{palier.prix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13px] leading-normal text-[#6F5A4B]">
              Distance à vol d&apos;oiseau entre votre adresse et notre point relais le plus proche : Chatou, Croissy-sur-Seine, Mareil-sur-Mauldre ou Saint-Nom-la-Bretèche.
            </p>
          </div>
          <ul className="rounded-[20px] md:rounded-3xl bg-[#F5EAE0] p-[18px] md:p-7 flex flex-col gap-3.5 md:gap-4 text-sm md:text-[15px] leading-normal text-[#5C4030]">
            {[
              { titre: 'Seuil de 40€ avant remises', texte: 'Un code promo, la remise fidélité ou le parrainage ne vous font jamais perdre la livraison offerte.' },
              { titre: 'Minimum de commande : 10€', texte: 'Montant de vos produits après remises, hors frais de livraison.' },
              { titre: 'Toutes les communes du 78', texte: "Votre adresse est vérifiée à la commande. Nous ne livrons pas en dehors des Yvelines." },
              { titre: 'Frais affichés avant de valider', texte: "Le montant exact apparaît dans votre panier dès que vous choisissez votre adresse. S'il ne peut pas être vérifié au moment de la commande, le tarif de 5€ s'applique." },
              { titre: 'Livraison dès le lendemain, de 15h à 20h', texte: 'À la date de votre choix parmi les jours proposés dans le panier. Paiement à la livraison, en espèces ou par carte.' },
            ].map(c => (
              <li key={c.titre} className="flex gap-3">
                <Check className="w-[19px] h-[19px] shrink-0 mt-0.5 text-[#C73600]" strokeWidth={2.4} aria-hidden />
                <span><strong className="font-extrabold text-[#3D2B1F]">{c.titre}.</strong> {c.texte}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="pt-10 md:pt-14 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-8 lg:gap-10 items-start">

          {/* QUESTIONS FRÉQUENTES */}
          <section className="min-w-0">
            <h2 className="titre text-[32px] md:text-[40px] leading-none mb-3.5 md:mb-[18px] px-2 md:px-0">Questions <em className="text-[#FF4500]">fréquentes</em></h2>
            {!searchTerm.trim() && (
              <div role="group" aria-label="Filtrer par thème" className="ss-ruban flex md:flex-wrap gap-2 mb-5 md:mb-[22px] overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
                {[{ id: 'toutes', title: 'Toutes' }, ...FAQ_CATEGORIES].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={theme === c.id}
                    onClick={() => setTheme(c.id)}
                    className={`shrink-0 h-11 px-4 rounded-[13px] border-[1.5px] text-sm font-bold whitespace-nowrap transition-colors ${
                      theme === c.id ? 'bg-[#3D2B1F] border-[#3D2B1F] text-[#F5EAE0]' : 'bg-white border-[#DDD0BF] text-[#3D2B1F] hover:border-[#3D2B1F]'}`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {categoriesAffichees.length > 0 ? (
              <div className="flex flex-col gap-6 md:gap-[26px]">
                {categoriesAffichees.map((cat) => (
                  <div key={cat.id}>
                    <h3 className="flex items-center gap-2 mb-2.5 px-2 md:px-0 text-xs md:text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#C73600]">
                      <span aria-hidden className="[&>svg]:w-4 [&>svg]:h-4">{cat.icon}</span>{cat.title}
                    </h3>
                    <div className="bg-white rounded-[22px] border border-[#E8DCCB] overflow-hidden divide-y divide-[#F0E7DA]">
                      {cat.questions.map((item, i) => (
                        <details key={i} open={searchTerm.length > 0} className="group">
                          <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-[60px] px-[18px] md:px-5 py-3 flex items-center justify-between gap-4 text-[15px] md:text-base font-bold hover:bg-[#FFFBF7] transition-colors">
                            <span>{item.q}</span>
                            <ChevronDown className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-open:rotate-180" strokeWidth={2.4} aria-hidden />
                          </summary>
                          <p className="px-[18px] md:px-5 pb-5 text-[15px] md:text-base leading-relaxed text-[#5C4030] whitespace-pre-line">{item.a}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[22px] border border-[#E8DCCB] px-5 py-12 flex flex-col items-center text-center">
                <span className="w-16 h-16 rounded-full bg-[#F5EAE0] text-[#C9BBAA] flex items-center justify-center mb-4"><Search className="w-7 h-7" aria-hidden /></span>
                <h3 className="titre text-2xl mb-4">Aucun résultat trouvé</h3>
                <button type="button" onClick={() => setSearchTerm('')} className="min-h-11 px-5 rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">Tout afficher</button>
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:sticky lg:top-20 flex flex-col gap-4 md:gap-5">
            {/* FORMULAIRE DE CONTACT */}
            <section className="bg-white rounded-3xl md:rounded-[28px] border border-[#E8DCCB] p-5 md:p-7">
              <h2 className="titre text-[28px] md:text-[30px] leading-[1.05] mb-1.5">Votre question est <em className="text-[#FF4500]">unique ?</em></h2>
              <p className="mb-5 text-[15px] text-[#5C4030]">On vous répond personnellement</p>

              {formStatus === 'sent' ? (
                <div role="status" className="flex flex-col items-center text-center gap-2 py-6">
                  <span className="ss-pop w-16 h-16 rounded-full bg-[#166534] text-white flex items-center justify-center mb-2"><Check className="w-8 h-8" strokeWidth={3} aria-hidden /></span>
                  <p className="titre text-2xl">Message reçu !</p>
                  <p className="text-[15px] text-[#5C4030]">L&apos;équipe vous répond très vite.</p>
                  <button type="button" onClick={() => setFormStatus('idle')} className="mt-3 min-h-11 px-5 rounded-full border-[1.5px] border-[#3D2B1F] text-sm font-bold hover:bg-[#3D2B1F] hover:text-[#F5EAE0] transition-colors">
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="aide-nom" className={etiquette}>Votre nom</label>
                    <input id="aide-nom" required type="text" autoComplete="name" maxLength={200} value={contactName} onChange={(e) => setContactName(e.target.value)} className={champ} />
                  </div>
                  <div>
                    <label htmlFor="aide-email" className={etiquette}>Email de contact</label>
                    <input id="aide-email" required type="email" autoComplete="email" maxLength={320} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={champ} />
                  </div>
                  <div>
                    <label htmlFor="aide-message" className={etiquette}>Votre message</label>
                    <textarea
                      id="aide-message"
                      required
                      placeholder="Détaillez votre demande..."
                      maxLength={5000}
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-[14px] border-[1.5px] border-[#E0D3C0] bg-white text-base font-medium text-[#3D2B1F] placeholder:text-[#8C7867] resize-none outline-none focus:border-[#FF4500] transition-colors"
                    />
                  </div>
                  {/* Le détail technique reste dans la console, pas affiché au client */}
                  {formStatus === 'error' && (
                    <div role="alert" className="px-3.5 py-3 rounded-[14px] bg-red-50 text-red-700">
                      <p className="text-sm font-extrabold">Erreur d&apos;envoi</p>
                      <p className="text-[13.5px] font-semibold">Votre message n&apos;a pas pu être envoyé. Réessayez, ou écrivez-nous sur WhatsApp au 07 59 72 00 83.</p>
                    </div>
                  )}
                  <button type="submit" disabled={formStatus === 'sending'} className="mt-1 min-h-14 rounded-[17px] bg-[#FF4500] text-white text-[19px] font-extrabold flex items-center justify-center gap-2.5 transition-[background-color,transform] duration-200 hover:bg-[#E63E00] active:scale-[0.98] disabled:opacity-70">
                    {formStatus === 'sending' ? <Loader2 className="w-6 h-6 animate-spin" aria-label="Envoi en cours" /> : <><Send className="w-[19px] h-[19px]" aria-hidden /> Envoyer</>}
                  </button>
                </form>
              )}
            </section>

            {/* Fidélité : renvoie vers le compte */}
            <Link href="/compte" className="group block bg-[#3D2B1F] rounded-3xl md:rounded-[28px] p-6 md:p-7 text-[#F5EAE0]">
              <h2 className="titre text-[26px] md:text-[28px] leading-[1.05] mb-2.5">Fidélité <em className="text-[#FF7A47]">récompensée</em></h2>
              <p className="mb-[18px] text-[15px] leading-relaxed text-[#E1D2C2]">1€ dépensé = 1 point. Dès 100 points, débloquez -10% sur votre prochaine commande. Votre solde est visible dans votre espace client.</p>
              <span className="inline-flex items-center gap-2.5 text-[15px] font-extrabold text-[#FF9466]">
                Voir mon compteur <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>

            <section className="bg-[#F5EAE0] rounded-[22px] md:rounded-3xl border border-[#E3D6C4] px-6 py-5 md:px-[26px] md:py-[22px]">
              <h2 className={`${SURTITRE} mb-2`}>Horaires</h2>
              <p className="text-[15px] leading-[1.7] font-semibold text-[#5C4030]">WhatsApp : 07h — 22h<br />Standard : 09h — 19h</p>
              <p className="mt-3 pt-3 border-t border-[#E3D6C4] flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold text-[#6F5A4B]">
                <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#15803D]" strokeWidth={2.4} aria-hidden />Paiement sécurisé</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-[#15803D]" strokeWidth={2.4} aria-hidden />SSL Verified</span>
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
