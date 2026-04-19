import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, User, ChevronRight, Eye, EyeOff, ArrowLeft,
  Shield, Plus, Wallet, Sparkles, Zap, Trash2
} from 'lucide-react';
import { useApp } from '../context';
import { Btn, Input, Card, Avatar } from '../components/ui';
import { Layout } from '../components/layout';

// ── Splash Screen ─────────────────────────────────────────────────────────
export function Splash({ onFinish }) {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  
  useEffect(() => {
    const timer = setTimeout(onFinish, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${isDark ? 'bg-[#1E1C00]' : 'bg-primary'} text-white p-6 overflow-hidden relative`}>
      <div className="relative animate-float z-10">
        <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/30 text-on-primary">
          <Wallet size={52} />
        </div>
        <div className="absolute -top-6 -right-6 animate-pulse">
          <Sparkles className="text-gold" size={36} />
        </div>
      </div>
      <div className="mt-10 text-center animate-fade-in z-10">
        <h1 className="font-headline font-extrabold text-4xl tracking-tighter mb-2">PocketMoney</h1>
        <p className="text-white/70 font-body text-base font-medium">L'argent de poche simplifié</p>
      </div>
    </div>
  );
}

// ── Welcome Screen ─────────────────────────────────────────────────────────
export function Welcome() {
  const { family, loginAsChild } = useApp();
  const navigate = useNavigate();

  return (
    <Layout noPadding>
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-6 py-12 text-center max-w-lg mx-auto">
        <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center mb-8 shadow-clay-primary animate-pop-in text-on-primary">
          <Wallet size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-headline font-black text-on-surface mb-4 tracking-tighter">
          Pocket<span className="text-primary">Money</span>
        </h1>
        <p className="text-on-surface-variant text-lg font-medium mb-12 max-w-sm leading-relaxed opacity-80">
          Gérez l'argent de poche en famille simplement.
        </p>

        <div className="w-full space-y-4 animate-fade-up">
          <Link to="/login" className="block w-full">
            <Btn full size="lg" className="h-16 text-lg shadow-clay-primary">Se connecter</Btn>
          </Link>
          
          <div className="pt-8 space-y-3">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-40">— Accès Rapide —</p>
             <div className="grid grid-cols-2 gap-3">
                {family?.users?.filter(u => u.role === 'CHILD').map(child => (
                  <button key={child.id} onClick={() => { loginAsChild(child); navigate('/child'); }} className="group">
                    <Card hover className="p-4 flex flex-col items-center gap-2 border-2 border-transparent hover:border-primary/20">
                      <Avatar letter={child.avatar || child.name.charAt(0)} color={child.color} size="sm" />
                      <span className="font-bold text-xs text-on-surface truncate w-full">{child.name}</span>
                    </Card>
                  </button>
                ))}
             </div>
          </div>

          <div className="pt-8 border-t border-on-surface/5 w-full text-center">
            <Link to="/signup" className="text-sm font-bold text-primary hover:underline">Créer une nouvelle famille</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Sign In Screen ─────────────────────────────────────────────────────────
export function SignIn() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const data = await login(form);
      if (data && data.user) {
        navigate(data.user.role === 'PARENT' ? '/parent' : '/child');
      }
    } catch (err) {
      console.error("Login failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Connexion" showBack onBack={() => navigate('/welcome')}>
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="mb-12 text-center">
          <div className="inline-flex p-4 rounded-3xl bg-secondary-container/30 text-secondary mb-6 shadow-inner">
            <Zap size={32} fill="currentColor" />
          </div>
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter">De retour ?</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email ou Prénom"
            placeholder="ex: sarah@gmail.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            autoComplete="username"
          />
          <Input
            label="Mot de passe"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
            autoComplete="current-password"
            suffix={
              <button type="button" onClick={() => setShowPw(!showPw)} className="text-on-surface-variant p-2">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <Btn type="submit" full loading={loading} size="lg" className="h-16 shadow-clay-primary text-lg mt-4">Me connecter</Btn>
        </form>
      </div>
    </Layout>
  );
}

// ── Sign Up Screen ─────────────────────────────────────────────────────────
export function SignUp() {
  const navigate = useNavigate();
  const { registerParentCreate, registerParentJoin, registerChild } = useApp();
  const [step, setStep] = useState('choice'); // 'choice', 'form', 'rules'
  const [mode, setMode] = useState(''); // 'parent-create', 'parent-join', 'child'
  const [form, setForm] = useState({ name: '', email: '', password: '', familyName: '', inviteCode: '', age: '' });
  const [rules, setRules] = useState([
    { title: 'Chambre non rangée', amount: '2' },
    { title: 'Gros mot', amount: '1' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAddRule = () => setRules([...rules, { title: '', amount: '' }]);
  const handleRemoveRule = (index) => setRules(rules.filter((_, i) => i !== index));
  const handleRuleChange = (index, field, value) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      let res;
      if (mode === 'parent-create') {
        res = await registerParentCreate({ 
          name: form.name, 
          email: form.email, 
          password: form.password, 
          familyName: form.familyName,
          rules: rules.filter(r => r.title && r.amount)
        });
      } else if (mode === 'parent-join') {
        res = await registerParentJoin({ name: form.name, email: form.email, password: form.password, inviteCode: form.inviteCode });
      } else if (mode === 'child') {
        res = await registerChild({ name: form.name, password: form.password, inviteCode: form.inviteCode, age: parseInt(form.age) });
      }
      
      if (res && res.user) {
        navigate(res.user.role === 'PARENT' ? '/parent' : '/child');
      }
    } catch (err) {
      console.error("Signup failed", err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'choice') {
    return (
      <Layout title="Inscription" showBack onBack={() => navigate('/welcome')}>
        <div className="max-w-md mx-auto space-y-4 px-4">
          <button onClick={() => { setMode('parent-create'); setStep('form'); }} className="w-full text-left">
            <Card hover className="p-6 flex items-center gap-5 border-2 border-transparent hover:border-primary/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-primary-container/40 flex items-center justify-center text-primary shadow-inner">
                <Plus size={32} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-on-surface text-lg tracking-tight">Parent : Créer une famille</p>
                <p className="text-xs text-on-surface-variant opacity-70">Démarrez votre gestion.</p>
              </div>
              <ChevronRight size={24} className="text-outline-variant" />
            </Card>
          </button>

          <button onClick={() => { setMode('parent-join'); setStep('form'); }} className="w-full text-left">
            <Card hover className="p-6 flex items-center gap-5 border-2 border-transparent hover:border-secondary/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-secondary shadow-inner">
                <Users size={32} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-on-surface text-lg tracking-tight">Parent : Rejoindre une famille</p>
              </div>
              <ChevronRight size={24} className="text-outline-variant" />
            </Card>
          </button>

          <button onClick={() => { setMode('child'); setStep('form'); }} className="w-full text-left">
            <Card hover className="p-6 flex items-center gap-5 border-2 border-transparent hover:border-tertiary/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-tertiary-container/40 flex items-center justify-center text-tertiary shadow-inner">
                <User size={32} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-on-surface text-lg tracking-tight">Enfant : Créer mon compte</p>
              </div>
              <ChevronRight size={24} className="text-outline-variant" />
            </Card>
          </button>
        </div>
      </Layout>
    );
  }

  if (step === 'rules') {
    return (
      <Layout title="Règles Familiales" showBack onBack={() => setStep('form')}>
        <div className="max-w-md mx-auto py-8 px-4 space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
              <Shield size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Définissez vos amendes</h2>
            <p className="text-sm text-on-surface-variant mt-1">Ces montants seront déduits du solde de l'enfant en cas de manquement.</p>
          </div>

          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={index} className="flex gap-3 items-end animate-fade-in">
                <div className="flex-1">
                  <Input 
                    label={index === 0 ? "Motif de l'amende" : ""} 
                    placeholder="ex: Chambre en désordre" 
                    value={rule.title} 
                    onChange={(e) => handleRuleChange(index, 'title', e.target.value)}
                  />
                </div>
                <div className="w-24">
                  <Input 
                    label={index === 0 ? "Prix (€)" : ""} 
                    type="number" 
                    placeholder="2" 
                    value={rule.amount} 
                    onChange={(e) => handleRuleChange(index, 'amount', e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => handleRemoveRule(index)}
                  className="p-4 text-error hover:bg-error/10 rounded-xl transition-colors mb-1"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAddRule}
            className="w-full py-4 border-2 border-dashed border-primary/20 rounded-2xl text-primary font-bold hover:bg-primary/5 transition-all"
          >
            + Ajouter une autre règle
          </button>

          <Btn full size="lg" loading={loading} onClick={handleSubmit} className="h-16 shadow-clay-primary text-lg mt-6">Créer ma famille</Btn>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Vos informations" showBack onBack={() => setStep('choice')}>
      <div className="max-w-md mx-auto py-8 px-4">
        <form onSubmit={(e) => { e.preventDefault(); mode === 'parent-create' ? setStep('rules') : handleSubmit(); }} className="space-y-6">
          <Input
            label={mode === 'child' ? "Ton prénom" : "Ton nom complet"}
            placeholder={mode === 'child' ? "Alice" : "Sarah Dupont"}
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          
          {(mode === 'parent-create' || mode === 'parent-join') && (
            <Input
              label="Adresse Email"
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
            />
          )}

          {mode === 'child' && (
            <Input
              label="Âge"
              type="number"
              placeholder="8"
              value={form.age}
              onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
              required
            />
          )}

          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
          />

          {mode === 'parent-create' && (
            <Input
              label="Nom de la famille"
              placeholder="ex: Les Dupont"
              value={form.familyName}
              onChange={e => setForm(p => ({ ...p, familyName: e.target.value }))}
              required
            />
          )}

          {(mode === 'parent-join' || mode === 'child') && (
            <Input
              label="Code Famille (Invite Code)"
              placeholder="ABCD12"
              value={form.inviteCode}
              onChange={e => setForm(p => ({ ...p, inviteCode: e.target.value.toUpperCase() }))}
              required
            />
          )}

          <Btn type="submit" full loading={loading} size="lg" className="h-16 shadow-clay-primary text-lg mt-6">
            {mode === 'parent-create' ? "Suivant : Configurer les règles" : "Créer mon compte"}
          </Btn>
        </form>
      </div>
    </Layout>
  );
}
