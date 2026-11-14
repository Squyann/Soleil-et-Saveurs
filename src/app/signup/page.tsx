'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Mail, Lock, ArrowRight, Loader2, Gift, ShieldCheck, Calendar, Phone, MapPin, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import GabaritConnexion, { etiquetteChamp, champ, champAvecIcone, iconeChamp, boutonPrincipal, messageErreur } from '@/components/GabaritConnexion';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [cgvAccepte, setCgvAccepte] = useState(false);
  const router = useRouter();

  // --- LOGIQUE DE CONFETTIS ---
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // --- ZONE DE LIVRAISON : tout le département des Yvelines (78) ---
  // Le code INSEE (citycode) et le code postal commencent par le n° de département.
  const [addressDept, setAddressDept] = useState<string | null>(null);

  const isEligibleZone = (addressDept || '').startsWith('78');

  // --- VALIDATIONS ---
  const isPhoneValid = phone.replace(/\s/g, '').length === 10;
  
  const calculateAge = (date: string) => {
    if (!date) return 0;
    const today = new Date();
    const birth = new Date(date);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };
  const isAdult = calculateAge(birthDate) >= 18;

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 10) return 2;
    return 3;
  };

  // API ADRESSE
  useEffect(() => {
    if (address.length > 5 && !addressDept) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=5`);
          const data = await res.json();
          setSuggestions(data.features);
        } catch (err) { console.error(err); }
      };
      const timer = setTimeout(fetchAddress, 300);
      return () => clearTimeout(timer);
    } else { setSuggestions([]); }
  }, [address, addressDept]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) { setError("Vous devez être majeur."); return; }
    if (!isEligibleZone) { setError("Livraison uniquement dans le 78."); return; }
    if (!isPhoneValid) { setError("Téléphone invalide."); return; }
    if (!cgvAccepte) { setError("Vous devez accepter les CGV et la politique de confidentialité."); return; }

    setLoading(true);
    setError(null);

    const cleanReferral = referralCodeInput.trim().toUpperCase();

    try {
      if (cleanReferral) {
        const { data: refValide } = await supabase.rpc('referral_code_valide', { p_code: cleanReferral });
        if (!refValide) {
          setError("Code de parrainage invalide.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            birth_date: birthDate,
            phone: phone,
            address: address,
            referral_code_used: cleanReferral || null,
            referral_processed: false,
            accepts_marketing: acceptsMarketing,
            cgv_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;

      triggerConfetti();
      setTimeout(() => {
        router.push('/login?message=check-email');
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
      setLoading(false);
    }
  };

  const force = passwordStrength();
  const caseACocher = 'shrink-0 mt-0.5 w-[22px] h-[22px] accent-[#FF4500]';

  return (
    <GabaritConnexion
      titre="Créer un compte"
      accroche={<>Soleil<br /><em className="text-[#FF7A47]">&amp; Saveurs.</em></>}
      arguments={[
        { icone: <Gift className="w-[22px] h-[22px]" />, texte: '-10 % sur votre 1re commande avec le code SOLEIL78' },
        { icone: <ShieldCheck className="w-[22px] h-[22px]" />, texte: 'Produits frais et premium' },
      ]}
      retour={{ href: '/login', libelle: 'Retour' }}
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className={messageErreur}>
            <AlertCircle className="w-[18px] h-[18px] shrink-0" aria-hidden /> {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="inscription-nom" className={etiquetteChamp}>Nom</label>
            <input id="inscription-nom" type="text" required autoComplete="family-name" maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} className={champ} />
          </div>
          <div>
            <label htmlFor="inscription-prenom" className={etiquetteChamp}>Prénom</label>
            <input id="inscription-prenom" type="text" required autoComplete="given-name" maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={champ} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-3">
          <div>
            <label htmlFor="inscription-naissance" className={etiquetteChamp}>
              Date de naissance {birthDate && !isAdult && <span className="font-extrabold text-red-700">Réservé aux majeurs.</span>}
            </label>
            <div className="relative">
              <Calendar className={iconeChamp} aria-hidden />
              <input id="inscription-naissance" type="date" required autoComplete="bday" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={champAvecIcone} />
            </div>
          </div>
          <div>
            <label htmlFor="inscription-telephone" className={etiquetteChamp}>Téléphone</label>
            <div className="relative">
              <Phone className={iconeChamp} aria-hidden />
              <input id="inscription-telephone" type="tel" required autoComplete="tel" maxLength={20} placeholder="06XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className={champAvecIcone} />
            </div>
          </div>
        </div>

        <div className="relative">
          <label htmlFor="inscription-adresse" className={etiquetteChamp}>Adresse complète (Yvelines 78)</label>
          <div className="relative">
            <MapPin className={iconeChamp} aria-hidden />
            <input id="inscription-adresse" type="text" required autoComplete="off" maxLength={200} placeholder="Tapez votre adresse…" value={address} onChange={(e) => { setAddress(e.target.value); setAddressDept(null); }} className={champAvecIcone} />
          </div>
          {suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1.5 bg-white border border-[#E0D3C0] rounded-2xl shadow-2xl overflow-hidden">
              {suggestions.map((s: any) => (
                <button key={s.properties.id} type="button" onClick={() => { setAddress(s.properties.label); setSuggestions([]); setAddressDept(String(s.properties.citycode || s.properties.postcode || '')); }}
                  className="w-full min-h-12 px-4 py-2.5 flex items-center gap-2.5 text-left text-sm font-semibold border-b border-[#F0E7DA] last:border-b-0 hover:bg-[#F5EAE0] transition-colors">
                  <MapPin className="w-4 h-4 shrink-0 text-[#FF4500]" aria-hidden /> {s.properties.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="inscription-email" className={etiquetteChamp}>E-mail</label>
          <div className="relative">
            <Mail className={iconeChamp} aria-hidden />
            <input id="inscription-email" type="email" required autoComplete="email" maxLength={320} placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={champAvecIcone} />
          </div>
        </div>

        <div>
          <label htmlFor="inscription-mdp" className={etiquetteChamp}>Mot de passe (8 caractères minimum)</label>
          <div className="relative">
            <Lock className={iconeChamp} aria-hidden />
            <input id="inscription-mdp" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${champAvecIcone} pr-14`} />
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center text-[#6F5A4B] hover:text-[#3D2B1F] transition-colors">
              {showPassword ? <EyeOff className="w-[19px] h-[19px]" aria-hidden /> : <Eye className="w-[19px] h-[19px]" aria-hidden />}
            </button>
          </div>
          <div aria-hidden className="mt-2 grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map(n => (
              <span key={n} className={`h-1.5 rounded-full transition-colors duration-300 ${force >= n ? (force === 1 ? 'bg-red-500' : force === 2 ? 'bg-[#FF7A47]' : 'bg-[#15803D]') : 'bg-[#E3D6C4]'}`} />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="inscription-parrainage" className={etiquetteChamp}>
            Code de parrainage <span className="font-semibold text-[#6F5A4B]">(optionnel)</span>
          </label>
          <div className="relative">
            <Gift className={iconeChamp} aria-hidden />
            <input id="inscription-parrainage" type="text" autoComplete="off" maxLength={40} placeholder="Ex. : ABC12345" value={referralCodeInput} onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())} className={`${champAvecIcone} uppercase`} />
          </div>
          <p className="mt-1.5 text-[13px] leading-snug font-semibold text-[#6F5A4B]">Votre parrain reçoit -10 % sur sa prochaine commande, et vous -10 % sur votre 2e commande</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={cgvAccepte} onChange={(e) => setCgvAccepte(e.target.checked)} className={caseACocher} />
          <span className="text-sm leading-snug font-semibold text-[#5C4030]">
            J&apos;ai lu et j&apos;accepte les{' '}
            <a href="/cgv" target="_blank" className="font-extrabold text-[#C73600] underline underline-offset-2">conditions générales de vente</a>
            {' '}et la{' '}
            <a href="/rgpd" target="_blank" className="font-extrabold text-[#C73600] underline underline-offset-2">politique de confidentialité</a>.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={acceptsMarketing} onChange={(e) => setAcceptsMarketing(e.target.checked)} className={caseACocher} />
          <span className="text-sm leading-snug font-semibold text-[#5C4030]">
            Je souhaite recevoir les offres et nouveautés de Soleil et Saveurs par e-mail <span className="text-[#6F5A4B]">(optionnel)</span>
          </span>
        </label>

        <button type="submit"
          disabled={loading || !isEligibleZone || !isPhoneValid || !isAdult || password.length < 8 || !cgvAccepte}
          className={`${boutonPrincipal} mt-1`}
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" aria-label="Création du compte" /> : <>Rejoindre Soleil et Saveurs <ArrowRight className="w-[22px] h-[22px] shrink-0" strokeWidth={2.4} aria-hidden /></>}
        </button>
      </form>

      <p className="mt-5 text-center text-[15px] font-semibold text-[#5C4030]">
        Déjà membre ? <Link href="/login" className="font-extrabold text-[#C73600] underline underline-offset-4">Se connecter ici</Link>
      </p>
    </GabaritConnexion>
  );
}
