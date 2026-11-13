import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Plus, Trash2, Wallet } from 'lucide-react';
import { useApp } from '../context';
import { authAPI } from '../api';
import { Avatar, Btn, Checkbox, Input, Segmented } from '../components/ui';
import { Layout } from '../components/layout';

const heading = 'font-headline font-extrabold tracking-tight';

export function Splash({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-hero text-white p-6">
      <div className="w-28 h-28 rounded-full bg-gold border-4 border-gold-edge text-on-gold flex items-center justify-center shadow-press-lg animate-pop-in">
        <Wallet size={52} aria-hidden="true" />
      </div>
      <h1 className={`${heading} text-4xl`}>PocketMoney</h1>
      <p className="text-base font-medium">L'argent de poche simplifié</p>
    </div>
  );
}

export function Welcome() {
  const { family, cachedFamilyMembers } = useApp();
  const navigate = useNavigate();
  // `family` n'est rempli qu'après la connexion : sur cet écran, on retombe
  // sur la dernière famille vue depuis cet appareil.
  const quickAccess = family?.users?.filter(u => u.role === 'CHILD') || cachedFamilyMembers || [];

  return (
    <Layout bare>
      <div className="relative min-h-screen flex flex-col px-5 pt-7 pb-6 lg:px-20 lg:py-14 bg-hero text-white overflow-hidden on-dark-field">
        <div aria-hidden="true" className="coin-ridge absolute -right-28 top-20 lg:right-16 lg:top-1/2 lg:-translate-y-1/2 w-[360px] h-[360px] lg:w-[520px] lg:h-[520px] rounded-full flex items-center justify-center" style={{ boxShadow: '-10px 12px 0 #1A1640' }}>
          <div className="w-[90%] h-[90%] rounded-full bg-gold border-4 border-gold-edge flex items-center justify-center font-headline font-extrabold text-[170px] lg:text-[250px] text-gold-edge">€</div>
        </div>

        <span className={`${heading} relative text-2xl`}>PocketMoney</span>

        <div className="relative mt-auto lg:my-auto max-w-[32rem] flex flex-col gap-3.5">
          <h1 className={`${heading} text-[56px] lg:text-[80px] leading-[0.98] tracking-[-0.04em]`}>L'argent de poche, ça se gagne.</h1>
          <p className="text-lg leading-snug">Les parents confient des corvées. Les enfants gagnent, épargnent et apprennent.</p>

          {quickAccess.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-1.5">
              {quickAccess.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => navigate('/login', { state: { prefillName: child.name, prefillInviteCode: child.inviteCode || family?.inviteCode } })}
                  className="flex flex-col items-center gap-1 min-w-[60px] font-semibold text-sm"
                >
                  <Avatar letter={child.avatar || child.name.charAt(0)} color={child.color} size="sm" />
                  <span>{child.name}</span>
                </button>
              ))}
            </div>
          )}

          <Btn full size="lg" variant="gold" className="mt-1.5 !shadow-[0_5px_0_#1A1640]" onClick={() => navigate('/login')}>Se connecter</Btn>
          <Link to="/signup" className="flex items-center justify-center min-h-[54px] rounded-2xl border-2 border-white font-bold text-[17px]">Créer une famille</Link>
          <div className="flex justify-center gap-[18px] text-sm">
            <Link to="/privacy" className="underline py-2">Confidentialité</Link>
            <Link to="/terms" className="underline py-2">Conditions d'utilisation</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const LOGIN_ROLES = [
  { value: 'child', label: 'Enfant' },
  { value: 'parent', label: 'Parent' },
];

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useApp();
  const [role, setRole] = useState('child');
  const [form, setForm] = useState({
    name: location.state?.prefillName || '',
    email: '',
    inviteCode: location.state?.prefillInviteCode || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));
  const isChild = role === 'child';

  const handleSubmit = async e => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { name, email, password, inviteCode } = form;
      const data = await login(isChild ? { email: name, password, inviteCode } : { email, password });
      if (data && data.user) navigate(data.user.role === 'PARENT' ? '/parent' : '/child');
    } catch (err) {
      console.error('Login failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title={"Content de te revoir !"} showBack onBack={() => navigate('/welcome')}>
      <div className="space-y-5">
        <Segmented label="Je me connecte en tant que" options={LOGIN_ROLES} value={role} onChange={setRole} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isChild ? (
            <>
              <Input label="Ton prénom" placeholder="Alice" value={form.name} onChange={set('name')} required autoComplete="username" />
              <Input label="Code famille" placeholder="ABCD12" value={form.inviteCode} onChange={e => setForm(p => ({ ...p, inviteCode: e.target.value.toUpperCase() }))} required />
            </>
          ) : (
            <Input label="Email" type="email" placeholder="ex: sarah@gmail.com" value={form.email} onChange={set('email')} required autoComplete="username" />
          )}
          <Input
            label="Mot de passe"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            required
            autoComplete="current-password"
            suffix={
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPw} className="w-11 h-11 flex items-center justify-center text-on-surface-variant">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <Btn type="submit" full size="lg" loading={loading} className="mt-1">Me connecter</Btn>
          <Link to="/forgot-password" className="block text-center font-bold text-primary py-2">Mot de passe oublié ?</Link>
        </form>
      </div>
    </Layout>
  );
}

export function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setSent(true);
      showToast(res.message);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Mot de passe oublié" showBack onBack={() => navigate('/login')}>
      {sent ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><Mail size={30} aria-hidden="true" /></div>
          <h2 className={`${heading} text-2xl`}>Vérifie ta boîte mail</h2>
          <p className="text-on-surface-variant">Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé (valable 1 heure).</p>
          <Btn variant="outline" full onClick={() => navigate('/login')}>Retour à la connexion</Btn>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-[17px] leading-snug">Entre ton email de parent, tu recevras un lien pour choisir un nouveau mot de passe.</p>
          <p className="px-4 py-3.5 rounded-[14px] bg-primary-container text-on-primary-container leading-snug">Tu es un enfant ? Demande à ton parent de le changer dans tes réglages.</p>
          <Input label="Email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Btn type="submit" full size="lg" loading={loading}>Envoyer le lien</Btn>
        </form>
      )}
    </Layout>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) return showToast('6 caractères minimum.', 'error');
    if (password !== confirm) return showToast('Les mots de passe ne correspondent pas.', 'error');
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      showToast('Mot de passe mis à jour, tu peux te connecter !');
      navigate('/login');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <Layout title="Lien invalide" showBack onBack={() => navigate('/login')}><p className="text-center py-12 font-bold text-on-surface-variant">Lien de réinitialisation manquant ou invalide.</p></Layout>;
  }

  return (
    <Layout title="Nouveau mot de passe" showBack onBack={() => navigate('/login')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nouveau mot de passe" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
        <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        <Btn type="submit" full size="lg" loading={loading}>Définir le mot de passe</Btn>
      </form>
    </Layout>
  );
}

const SIGNUP_MODES = [
  { mode: 'parent-create', title: 'Parent, nouvelle famille', description: 'Je démarre PocketMoney.' },
  { mode: 'parent-join', title: 'Parent, famille existante', description: "J'ai un code famille." },
  { mode: 'child', title: 'Enfant', description: "Mon parent m'a donné un code." },
];

function Steps({ current, total }) {
  return (
    <div role="img" aria-label={`Étape ${current} sur ${total}`} className="flex gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`flex-1 h-2.5 rounded-full ${i < current ? 'bg-primary' : 'bg-outline-variant'}`} />
      ))}
    </div>
  );
}

export function SignUp() {
  const navigate = useNavigate();
  const { registerParentCreate, registerParentJoin, registerChild, showToast } = useApp();
  const [step, setStep] = useState('choice'); // 'choice', 'form', 'rules'
  const [mode, setMode] = useState(''); // 'parent-create', 'parent-join', 'child'
  const [form, setForm] = useState({ name: '', email: '', password: '', familyName: '', inviteCode: '', age: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [rules, setRules] = useState([
    { title: 'Chambre non rangée', amount: '2' },
    { title: 'Gros mot', amount: '1' },
  ]);
  const [loading, setLoading] = useState(false);
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));
  const isChild = mode === 'child';
  const totalSteps = mode === 'parent-create' ? 3 : 2;

  const handleRuleChange = (index, field, value) => setRules(rules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)));

  const handleSubmit = async e => {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { name, email, password, familyName, inviteCode, age } = form;
      let res;
      if (mode === 'parent-create') {
        res = await registerParentCreate({ name, email, password, familyName, acceptTerms, parentalConsent, rules: rules.filter(r => r.title && r.amount) });
      } else if (mode === 'parent-join') {
        res = await registerParentJoin({ name, email, password, inviteCode, acceptTerms, parentalConsent });
      } else {
        res = await registerChild({ name, password, inviteCode, age: parseInt(age, 10) });
      }
      if (res && res.user) navigate(res.user.role === 'PARENT' ? '/parent' : '/child');
    } catch (err) {
      console.error('Signup failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'choice') {
    return (
      <Layout title="Qui es-tu ?" showBack onBack={() => navigate('/welcome')}>
        <div className="flex flex-col gap-3">
          {SIGNUP_MODES.map(item => (
            <button
              key={item.mode}
              type="button"
              onClick={() => { setMode(item.mode); setStep('form'); }}
              className="flex flex-col gap-0.5 p-[18px] min-h-[92px] rounded-[20px] border-2 border-line bg-surface shadow-press text-left active:translate-y-1 active:shadow-none transition-all"
            >
              <span className={`${heading} text-[22px]`}>{item.title}</span>
              <span className="text-on-surface-variant">{item.description}</span>
            </button>
          ))}
        </div>
      </Layout>
    );
  }

  if (step === 'rules') {
    return (
      <Layout title="Vos règles de famille" showBack onBack={() => setStep('form')}>
        <Steps current={3} total={3} />
        <div className="space-y-4">
          <p className="text-[17px] leading-snug">Ces montants sont déduits en cas de manquement. Modifiables plus tard.</p>
          {rules.map((rule, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <Input label={index === 0 ? 'Motif' : ''} aria-label={index === 0 ? undefined : "Motif de l'amende"} placeholder="ex: Chambre en désordre" value={rule.title} onChange={e => handleRuleChange(index, 'title', e.target.value)} />
              </div>
              <div className="w-24 flex-shrink-0">
                <Input label={index === 0 ? 'Prix (€)' : ''} aria-label={index === 0 ? undefined : 'Prix (€)'} type="number" placeholder="2" value={rule.amount} onChange={e => handleRuleChange(index, 'amount', e.target.value)} />
              </div>
              <button type="button" aria-label={`Retirer la règle ${index + 1}`} onClick={() => setRules(rules.filter((_, i) => i !== index))} className="w-11 h-[54px] flex-shrink-0 flex items-center justify-center text-error">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          <Btn full variant="outline" icon={Plus} onClick={() => setRules([...rules, { title: '', amount: '' }])}>Ajouter une règle</Btn>
          <Btn full size="lg" variant="gold" loading={loading} onClick={handleSubmit}>Créer ma famille</Btn>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isChild ? 'Ton compte' : 'Vos informations'} showBack onBack={() => setStep('choice')}>
      <Steps current={2} total={totalSteps} />
      <form
        className="flex flex-col gap-4"
        onSubmit={e => {
          e.preventDefault();
          if (form.password.length < 6 || form.password.length > 72) {
            showToast('Le mot de passe doit contenir entre 6 et 72 caractères.', 'error');
            return;
          }
          if (!isChild && (!acceptTerms || !parentalConsent)) {
            showToast('Coche les deux cases pour continuer.', 'error');
            return;
          }
          if (mode === 'parent-create') setStep('rules');
          else handleSubmit();
        }}
      >
        <Input label={isChild ? 'Ton prénom' : 'Ton nom'} placeholder={isChild ? 'Alice' : 'Sarah Dupont'} value={form.name} onChange={set('name')} required />
        {!isChild && <Input label="Email" type="email" placeholder="votre@email.com" value={form.email} onChange={set('email')} required />}
        {isChild && <Input label="Âge" type="number" placeholder="8" value={form.age} onChange={set('age')} required />}
        <Input label="Mot de passe" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
        {mode === 'parent-create' && <Input label="Nom de la famille" placeholder="ex: Les Dupont" value={form.familyName} onChange={set('familyName')} required />}
        {mode !== 'parent-create' && (
          <Input label="Code famille" placeholder="ABCD12" value={form.inviteCode} onChange={e => setForm(p => ({ ...p, inviteCode: e.target.value.toUpperCase() }))} required />
        )}

        {!isChild && (
          <div className="space-y-3">
            <Checkbox
              checked={acceptTerms}
              onChange={setAcceptTerms}
              label={<>J'accepte les <Link to="/terms" target="_blank" rel="noopener" className="text-primary underline">conditions d'utilisation</Link> et la <Link to="/privacy" target="_blank" rel="noopener" className="text-primary underline">politique de confidentialité</Link>.</>}
            />
            <Checkbox checked={parentalConsent} onChange={setParentalConsent} label="Je suis titulaire de l'autorité parentale et j'autorise le traitement des données des enfants à qui je donne le code famille." />
          </div>
        )}

        {isChild && (
          <p className="text-[15px] text-on-surface-variant">
            En créant ton compte avec le code donné par ton parent, tu rejoins sa famille. <Link to="/privacy" target="_blank" rel="noopener" className="text-primary underline">Comment tes données sont protégées</Link>.
          </p>
        )}

        <Btn type="submit" full size="lg" loading={loading} className="mt-1">
          {mode === 'parent-create' ? 'Suivant : Configurer les règles' : 'Créer mon compte'}
        </Btn>
      </form>
    </Layout>
  );
}
