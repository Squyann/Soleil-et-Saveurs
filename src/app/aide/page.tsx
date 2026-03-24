'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageCircle, Phone, Mail, Clock, HelpCircle, 
  ShieldCheck, Truck, ChevronRight, ArrowLeft, 
  Search, CreditCard, Box, RefreshCcw, Star,
  ArrowRight, Loader2, Send, Leaf, Gift, UserCheck, 
  MapPin, AlertCircle, Sparkles
} from 'lucide-react';
import Link from 'next/link';

const FAQ_CATEGORIES = [
  {
    id: 'delivery',
    icon: <Truck className="w-5 h-5" />,
    title: "Livraison & Zones",
    questions: [
      {
        q: "Quels sont vos délais exacts de livraison ?",
        a: "Nous fonctionnons en flux tendu : Commandez avant 23h59, nous récoltons à l'aube (05h00) et vous êtes livré entre 16h et 20h le jour même ou le lendemain selon votre créneau."
      },
      {
        q: "Quelles villes du 78 desservez-vous ?",
        a: "Nous couvrons actuellement Plaisir, Les Clayes-sous-Bois, Villepreux, Beynes, Saint-Cyr-l'École, Versailles, et Montigny-le-Bretonneux. Nous étendons nos zones chaque mois !"
      },
      {
        q: "Que se passe-t-il si je suis absent lors de la livraison ?",
        a: "Pas d'inquiétude ! Vous pouvez nous indiquer un lieu sûr (voisin, garage, porche) dans les notes de commande. Nos livreurs déposent votre cagette dans un emballage protecteur."
      },
      {
        q: "Les frais de port sont-ils gratuits ?",
        a: "La livraison est offerte dès 35€ d'achat. En dessous, une participation de 4,90€ est demandée pour soutenir nos livreurs locaux."
      }
    ]
  },
  {
    id: 'products',
    icon: <Leaf className="w-5 h-5" />,
    title: "Qualité & Agriculture",
    questions: [
      {
        q: "Vos produits sont-ils tous BIO ?",
        a: "Nous privilégions l'agriculture raisonnée et locale. 60% de nos producteurs sont certifiés AB, les autres pratiquent une culture sans pesticides de synthèse mais n'ont pas encore le label officiel."
      },
      {
        q: "Pourquoi certains fruits ne sont pas disponibles toute l'année ?",
        a: "C'est notre promesse 'Zéro Frigo'. Si ce n'est pas la saison dans les Yvelines ou chez nos partenaires directs, nous ne le vendons pas. Pas de fraises en décembre ici !"
      },
      {
        q: "Comment garantissez-vous que c'est récolté le matin ?",
        a: "Chaque commande est accompagnée d'un bon de livraison indiquant l'heure de récolte exacte pour les produits ultra-frais comme les salades et les petits fruits."
      }
    ]
  },
  {
    id: 'account',
    icon: <UserCheck className="w-5 h-5" />,
    title: "Mon Compte & Fidélité",
    questions: [
      {
        q: "Comment fonctionne le programme de parrainage ?",
        a: "Dans votre espace client, partagez votre code unique. Votre filleul reçoit 10€ sur sa première commande, et vous recevez 10€ dès qu'il est livré !"
      },
      {
        q: "Puis-je modifier mon adresse après une commande ?",
        a: "Oui, via l'onglet 'Mes Commandes' tant que le statut n'est pas 'En préparation'. Sinon, contactez-nous par WhatsApp d'urgence."
      },
      {
        q: "Proposez-vous des abonnements ?",
        a: "Bientôt ! Nous travaillons sur des 'Paniers de Saison' hebdomadaires automatisés pour vous simplifier la vie."
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
        a: "Nous utilisons Stripe, le leader mondial du paiement. Vos données bancaires sont cryptées et nous n'y avons jamais accès."
      },
      {
        q: "Acceptez-vous les tickets restaurant ?",
        a: "Nous acceptons les cartes Ticket Restaurant (Edenred, Swile) pour tous les produits éligibles (fruits, légumes, produits traiteur)."
      },
      {
        q: "Comment obtenir ma facture ?",
        a: "Elle est envoyée automatiquement par mail dès la validation de la livraison et reste disponible en PDF dans votre historique client."
      }
    ]
  },
  {
    id: 'eco',
    icon: <RefreshCcw className="w-5 h-5" />,
    title: "Écologie & Retours",
    questions: [
      {
        q: "Que faire de ma cagette vide ?",
        a: "Ne la jetez pas ! Rendez-la au livreur lors de votre prochaine commande. Nous les réutilisons jusqu'à 20 fois pour limiter notre empreinte carbone."
      },
      {
        q: "Un produit est arrivé abîmé, que faire ?",
        a: "Prenez une photo rapide et envoyez-la nous par WhatsApp. Nous vous remboursons la valeur du produit sous forme d'avoir en moins de 2 heures."
      }
    ]
  }
];

export default function AidePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => setFormStatus('sent'), 1500);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-14 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FF4500] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Boutique
          </Link>
          <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#FF4500]"/> 78 uniquement</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-500"/> Garanti frais</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-slate-900 py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FF4500]/20 via-transparent to-transparent opacity-50 animate-pulse"></div>
        <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-4 relative italic">
          AIDE<span className="text-[#FF4500]">&</span>INFOS
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-bold uppercase tracking-[0.2em] mb-12">Soleil Saveurs — Votre Service Client Local</p>

        <div className="max-w-2xl mx-auto relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2">
            {isSearching ? <Loader2 className="w-6 h-6 text-[#FF4500] animate-spin" /> : <Search className="text-slate-500 w-6 h-6" />}
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tapez votre question (ex: Livraison, Bio, Remboursement...)" 
            className="w-full bg-white/10 border-2 border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white placeholder:text-slate-500 focus:outline-none focus:bg-white focus:text-slate-900 focus:border-[#FF4500] transition-all shadow-2xl text-lg font-medium"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {[
            { icon: <MessageCircle className="text-green-500"/>, label: "WhatsApp", sub: "Réponse < 15min", link: "https://wa.me/33600000000" },
            { icon: <Phone className="text-blue-500"/>, label: "Téléphone", sub: "9h-19h Non-stop", link: "tel:+33600000000" },
            { icon: <Gift className="text-purple-500"/>, label: "Parrainage", sub: "Gagnez 10€", link: "/compte" },
            { icon: <AlertCircle className="text-[#FF4500]"/>, label: "Litige", sub: "Photo & Crédit", link: "mailto:contact@soleilsaveurs.fr" }
          ].map((action, i) => (
            <a 
              key={i} 
              href={action.link} 
              target={action.link.startsWith('http') ? "_blank" : undefined}
              rel={action.link.startsWith('http') ? "noopener noreferrer" : undefined}
              className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-50 flex flex-col items-center text-center hover:translate-y-[-5px] transition-all group"
            >
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">{action.icon}</div>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-900">{action.label}</h3>
              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{action.sub}</p>
            </a>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-16">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => (
                <div key={cat.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FF4500] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF4500]/20">{cat.icon}</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 italic">{cat.title}</h2>
                  </div>
                  <div className="grid gap-4">
                    {cat.questions.map((item, i) => (
                      <details key={i} open={searchTerm.length > 0} className="group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden transition-all hover:border-[#FF4500]/40 shadow-sm">
                        <summary className="list-none p-8 flex items-center justify-between cursor-pointer select-none">
                          <span className="font-extrabold text-base text-slate-800 pr-4">{item.q}</span>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#FF4500]/10 transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                          </div>
                        </summary>
                        <div className="px-8 pb-8 text-sm font-medium text-slate-500 leading-relaxed border-t border-slate-50 pt-6 italic">
                          {item.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-[50px] p-20 text-center border-2 border-dashed border-slate-100">
                <Search className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-black uppercase text-slate-400">Aucun résultat trouvé</h3>
                <button onClick={() => setSearchTerm('')} className="mt-4 text-[#FF4500] font-black uppercase text-xs underline decoration-2">Tout afficher</button>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-[40px] p-10 shadow-2xl border border-slate-50 sticky top-24">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6"><Mail className="w-6 h-6"/></div>
              <h3 className="font-black uppercase text-2xl tracking-tighter text-slate-900 mb-2 leading-none">VOTRE QUESTION <br/>EST <span className="text-[#FF4500]">UNIQUE ?</span></h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">On vous répond personnellement</p>
              
              {formStatus === 'sent' ? (
                <div className="bg-green-50 border border-green-100 p-8 rounded-[32px] text-center animate-in zoom-in duration-300">
                  <Sparkles className="w-10 h-10 text-green-500 mx-auto mb-4" />
                  <p className="font-black uppercase text-xs text-green-700">Reçu 5/5 !</p>
                  <p className="text-[10px] mt-2 font-bold text-green-600/70 uppercase">L'équipe arrive à la rescousse.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input required type="text" placeholder="Votre nom" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:border-[#FF4500]/20 focus:bg-white outline-none transition-all" />
                  <input required type="email" placeholder="Email de contact" className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:border-[#FF4500]/20 focus:bg-white outline-none transition-all" />
                  <textarea required placeholder="Détaillez votre demande..." rows={4} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-6 text-xs font-bold focus:border-[#FF4500]/20 focus:bg-white outline-none transition-all resize-none" />
                  <button 
                    disabled={formStatus === 'sending'}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#FF4500] hover:shadow-xl hover:shadow-[#FF4500]/20 transition-all disabled:opacity-50"
                  >
                    {formStatus === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer</>}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-[#FF4500] rounded-[40px] p-10 text-white relative overflow-hidden group shadow-xl shadow-[#FF4500]/30">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Gift className="w-40 h-40" />
              </div>
              <h4 className="font-black uppercase text-xl italic tracking-tighter mb-4 leading-none">DEVENEZ <br/>AMBASSADEUR</h4>
              <p className="text-[11px] font-bold opacity-80 mb-8 italic">Offrez 10€, recevez 10€. Le goût se partage dans le 78.</p>
              <Link href="/compte" className="inline-flex items-center gap-3 bg-white text-[#FF4500] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">
                Mon Code <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-32 pt-20 border-t border-slate-100 text-center px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 text-left mb-20">
          <div>
            <h5 className="font-black uppercase text-xs mb-4">Soleil Saveurs</h5>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">Le circuit-court réinventé dans les Yvelines.</p>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs mb-4">Horaires</h5>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">WhatsApp : 07h — 22h<br/>Standard : 09h — 19h</p>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs mb-4">Sécurité</h5>
            <div className="flex gap-4">
              <div className="bg-slate-100 px-3 py-1 rounded-md text-[9px] font-bold text-slate-400 uppercase">Stripe Secure</div>
              <div className="bg-slate-100 px-3 py-1 rounded-md text-[9px] font-bold text-slate-400 uppercase">SSL Verified</div>
            </div>
          </div>
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-200 pb-10">
          © 2026 SOLEIL SAVEURS — TOUS DROITS RÉSERVÉS
        </p>
      </footer>
    </div>
  );
}