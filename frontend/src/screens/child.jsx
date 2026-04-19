import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCountUp } from '../hooks/useCountUp';
import {
  Target, Plus, Camera, Upload, Check, X, Clock,
  TrendingUp, TrendingDown, ChevronRight, ArrowUpRight,
  ArrowDownRight, LogOut, Award, Star, Gift, Zap,
  ListChecks, Wallet, CheckCircle, XCircle, AlertCircle,
  Gamepad2, Bike, Music, Smartphone, Flame, Trophy,
  MoreHorizontal, Edit3
} from 'lucide-react';
import { useApp } from '../context';
import { Layout } from '../components/layout';
import {
  Card, Btn, Badge, StatusBadge, Avatar, StatCard,
  ProgressBar, Modal, Input, Textarea, EmptyState, Amount,
} from '../components/ui';

const KID_PALETTE = [
  { card: 'bg-white dark:bg-surface-container-high rounded-sticker shadow-sticker bubbly-card sticker-left cursor-pointer',  iconBg: 'bg-primary-container',   iconColor: 'text-primary',   rewardBg: 'bg-primary',   rewardText: 'text-on-primary' },
  { card: 'bg-white dark:bg-surface-container-high rounded-sticker shadow-sticker bubbly-card sticker-right cursor-pointer',  iconBg: 'bg-secondary-container', iconColor: 'text-secondary', rewardBg: 'bg-secondary', rewardText: 'text-on-secondary' },
  { card: 'bg-white dark:bg-surface-container-high rounded-sticker shadow-sticker bubbly-card sticker-left cursor-pointer',  iconBg: 'bg-tertiary-container',  iconColor: 'text-tertiary',  rewardBg: 'bg-tertiary',  rewardText: 'text-on-tertiary' },
  { card: 'bg-primary-container rounded-sticker shadow-sticker bubbly-card sticker-right cursor-pointer',    iconBg: 'bg-white/70 dark:bg-black/20', iconColor: 'text-primary',   rewardBg: 'bg-primary',   rewardText: 'text-on-primary' },
  { card: 'bg-secondary-container rounded-sticker shadow-sticker bubbly-card sticker-left cursor-pointer', iconBg: 'bg-white/70 dark:bg-black/20', iconColor: 'text-secondary', rewardBg: 'bg-secondary', rewardText: 'text-on-secondary' },
  { card: 'bg-tertiary-container rounded-sticker shadow-sticker bubbly-card sticker-right cursor-pointer',  iconBg: 'bg-white/70 dark:bg-black/20', iconColor: 'text-tertiary',  rewardBg: 'bg-tertiary',  rewardText: 'text-on-tertiary' },
];

export function ChildDashboard() {
  const navigate = useNavigate();
  const { user, chores, goals, transactions, loading } = useApp();

  if (loading || !user) {
    return (
      <Layout title="Chargement...">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const animBalance = useCountUp(user?.balance ?? 0, 900);
  const myChores = (chores || []).filter(c => c.assigneeId === user.id);
  const available = myChores.filter(c => c.status === 'PENDING' || c.status === 'pending');
  const myGoals = (goals || []).filter(g => g.participants?.some(p => p.childId === user.id) || g.childId === user.id);
  const myTrans = (transactions || []).slice(0, 5);
  const primaryGoal = myGoals[0];

  return (
    <Layout title={`Salut, ${user.name} !`}>
      <div className="max-w-4xl mx-auto space-y-10 pb-12">
        <div className="rounded-[3rem] p-10 relative overflow-hidden pop-in shadow-clay-primary border-t-8 border-white/20" style={{ background: `linear-gradient(135deg, ${user.color || '#835500'} 0%, ${user.color || '#835500'}ee 100%)` }}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/20 -translate-y-32 translate-x-32 blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-center sm:text-left text-white">
              <p className="text-white/70 text-sm font-black uppercase tracking-[0.2em] mb-2">Mon Trésor</p>
              <p className="font-mono-num font-black text-7xl tracking-tighter leading-none">
                €{animBalance.toFixed(2)}
              </p>
              <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-3">
                 <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 text-xs font-bold flex items-center gap-2">
                    <Star size={14} className="text-gold" fill="currentColor" /> +€12.50 ce mois
                 </div>
              </div>
            </div>
            <div className="w-32 h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-lg flex items-center justify-center border-4 border-white/40 shadow-2xl animate-float">
              <span className="text-white text-6xl">{user.avatar}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter">Mes Quêtes</h3>
              <button onClick={() => navigate('/child/available-chores')} className="text-sm font-bold text-primary hover:underline">Voir tout</button>
            </div>
            <div className="space-y-4">
              {available.length === 0 ? (
                <Card className="p-8 text-center border-2 border-dashed border-on-surface/5">
                  <p className="font-headline font-extrabold text-on-surface tracking-tight">Toutes les quêtes sont finies !</p>
                </Card>
              ) : (
                available.slice(0, 3).map((chore, i) => {
                  const pal = KID_PALETTE[i % KID_PALETTE.length];
                  return (
                    <Card key={chore.id} hover className={`p-6 ${pal.card} group transition-all`} onClick={() => navigate(`/child/submit-chore/${chore.id}`)}>
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl ${pal.iconBg} flex items-center justify-center ${pal.iconColor} shadow-inner group-hover:scale-110 transition-transform`}>
                          <Zap size={28} fill="currentColor" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-headline font-extrabold text-on-surface text-lg leading-tight truncate">{chore.title}</h4>
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Gagne <span className={pal.iconColor}>€{chore.reward}</span></p>
                        </div>
                        <ChevronRight size={20} className="text-on-surface-variant/30 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-10">
            {primaryGoal && (
              <div className="space-y-6">
                <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter px-2">Mon Rêve</h3>
                <Card className="p-8 bg-white dark:bg-surface-container-high border-b-8 border-secondary">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary text-3xl shadow-inner animate-pulse">
                      {primaryGoal.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-extrabold text-xl text-on-surface truncate tracking-tight">{primaryGoal.title}</p>
                      <div className="flex justify-between items-end mt-1">
                         <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Progression</p>
                         <p className="font-mono-num font-black text-secondary">€{primaryGoal.current} / €{primaryGoal.target}</p>
                      </div>
                    </div>
                  </div>
                  <ProgressBar value={primaryGoal.current} max={primaryGoal.target} color="success" height="lg" />
                  <Btn full variant="outline" className="mt-8 h-12" onClick={() => navigate('/child/goals')}>Gérer mes objectifs</Btn>
                </Card>
              </div>
            )}

            <div className="space-y-6">
              <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter px-2 opacity-70">Activités</h3>
              <div className="bg-white/40 dark:bg-white/5 rounded-[2.5rem] p-2 space-y-1">
                {myTrans.map(t => (
                  <div key={t.id} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${t.amount >= 0 ? 'bg-secondary-container/40 text-secondary' : 'bg-error-container/40 text-error'}`}>
                      {t.amount >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{t.description}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                    </div>
                    <Amount value={t.amount} size="sm" />
                  </div>
                ))}
                {myTrans.length === 0 && <p className="text-center py-10 text-on-surface-variant italic text-sm">Pas encore de mouvements.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export function AvailableChores() {
  const navigate = useNavigate();
  const { user, chores, loading } = useApp();
  if (loading || !user) return <Layout title="Quêtes"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;
  const myChores = (chores || []).filter(c => c.assigneeId === user.id && (c.status === 'PENDING' || c.status === 'pending'));

  return (
    <Layout title="Quêtes Disponibles" showBack onBack={() => navigate('/child')}>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myChores.map((chore, ci) => {
            const pal = KID_PALETTE[ci % KID_PALETTE.length];
            return (
              <Card key={chore.id} hover className={`p-8 ${pal.card} group relative overflow-hidden`} onClick={() => navigate(`/child/submit-chore/${chore.id}`)}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform"><Zap size={80} /></div>
                <div className="relative z-10 flex flex-col gap-6">
                   <div className={`w-16 h-16 rounded-[1.5rem] ${pal.iconBg} flex items-center justify-center ${pal.iconColor} shadow-inner`}>
                      <Zap size={32} fill="currentColor" />
                   </div>
                   <div>
                      <h4 className="font-headline font-black text-2xl text-on-surface tracking-tighter leading-tight mb-2">{chore.title}</h4>
                      <p className="text-on-surface-variant font-medium text-sm line-clamp-3 opacity-80 leading-relaxed">{chore.description}</p>
                   </div>
                   <div className="mt-auto flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2 text-xs font-black text-on-surface-variant uppercase tracking-widest opacity-60">
                         <Clock size={16} /> {chore.deadline}
                      </div>
                      <span className={`font-mono-num font-black text-xl px-4 py-2 rounded-2xl shadow-clay ${pal.rewardBg} ${pal.rewardText}`}>+€{chore.reward}</span>
                   </div>
                </div>
              </Card>
            );
          })}
        </div>
        {myChores.length === 0 && (
          <div className="py-20 text-center space-y-6">
             <div className="w-24 h-24 rounded-full bg-secondary-container mx-auto flex items-center justify-center text-secondary shadow-clay animate-bounce">
                <Trophy size={48} />
             </div>
             <h3 className="font-headline font-black text-3xl tracking-tighter">Héros au repos !</h3>
             <Btn onClick={() => navigate('/child')}>Retour au tableau de bord</Btn>
          </div>
        )}
      </div>
    </Layout>
  );
}

export function SubmitChore() {
  const navigate = useNavigate();
  const { choreId } = useParams();
  const { chores, submitChore } = useApp();
  const chore = (chores || []).find(c => c.id === choreId);
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef();

  if (!chore) return <Layout title="Erreur" showBack onBack={() => navigate('/child')}><div className="text-center py-20"><p className="font-bold">Corvée non trouvée</p></div></Layout>;

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target.result);
      reader.readAsDataURL(file);
    }
  };
const handleSubmit = async () => {
  if (!photo) return;
  setIsSubmitting(true);
  try {
    await submitChore(chore.id, { note, proofImageUrl: photo });
    navigate('/child');
  } catch (e) {
    console.error("Submission failed", e);
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Layout title="Valider ma quête" showBack onBack={() => navigate('/child/available-chores')}>
      <div className="max-w-2xl mx-auto space-y-8 pt-6">
        <Card className="p-8 text-center border-t-8 border-primary relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Mission à accomplir</p>
            <h2 className="font-headline font-black text-4xl text-on-surface mb-6 tracking-tighter leading-none">{chore.title}</h2>
            <div className="inline-flex bg-primary text-on-primary font-mono-num font-black text-3xl px-8 py-4 rounded-[2rem] shadow-clay-primary">+€{chore.reward}</div>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-container-high rounded-[2.5rem] shadow-sticker p-8">
            <p className="text-lg font-headline font-black text-on-surface mb-6 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Camera size={24} /></div>
              Preuve en image
            </p>
            {photo ? (
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl group border-4 border-white dark:border-surface-container-highest">
                <img src={photo} alt="Ma réussite" className="w-full h-80 object-cover" />
                <button onClick={() => setPhoto(null)} className="absolute top-5 right-5 p-4 bg-error text-white rounded-full shadow-2xl active:scale-90 transition-transform"><X size={24} strokeWidth={3} /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full border-4 border-dashed border-on-surface/5 rounded-[2.5rem] py-20 flex flex-col items-center justify-center gap-6 hover:bg-primary/5 hover:border-primary/20 transition-all group">
                <div className="w-20 h-20 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-inner"><Camera size={40} /></div>
                <div className="text-center space-y-1">
                  <p className="font-headline font-black text-xl text-on-surface">Prendre une photo</p>
                </div>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
          <Textarea label="Un message pour tes parents ?" placeholder="ex: J'ai tout rangé avec soin ! ✨" value={note} onChange={e => setNote(e.target.value)} className="h-32 text-lg" />
          <div className="pt-6 pb-12">
             <Btn full size="lg" loading={isSubmitting} onClick={handleSubmit} disabled={!photo} className="h-20 text-xl shadow-clay-primary">Envoyer ma réussite !</Btn>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export function MyChores() {
  const navigate = useNavigate();
  const { user, chores, loading } = useApp();
  if (loading || !user) return <Layout title="Mon historique"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;
  const myChores = (chores || []).filter(c => c.assigneeId === user.id);

  return (
    <Layout title="Mes Exploits" showBack onBack={() => navigate('/child')}>
      <div className="max-w-3xl mx-auto space-y-4 pb-20">
        {myChores.map(chore => (
          <Card key={chore.id} className="p-6 transition-all hover:translate-x-2" onClick={() => chore.status === 'PENDING' && navigate(`/child/submit-chore/${chore.id}`)}>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${chore.status === 'COMPLETED' ? 'bg-secondary-container text-secondary' : 'bg-surface-variant text-on-surface-variant opacity-50'}`}><Check size={24} strokeWidth={3} /></div>
                 <div>
                    <h4 className="font-headline font-extrabold text-on-surface text-lg tracking-tight">{chore.title}</h4>
                    <StatusBadge status={chore.status} />
                 </div>
              </div>
              <span className="font-mono-num font-black text-2xl text-primary tracking-tighter">€{chore.reward}</span>
            </div>
          </Card>
        ))}
        {myChores.length === 0 && <EmptyState icon={ListChecks} title="Aucun exploit" description="C'est le moment de commencer ta première quête !" />}
      </div>
    </Layout>
  );
}

export function BalanceScreen() {
  const navigate = useNavigate();
  const { user, transactions, loading } = useApp();
  if (loading || !user) return <Layout title="Mon Trésor"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;
  const myTrans = transactions || [];

  return (
    <Layout title="Mon Trésor" showBack onBack={() => navigate('/child')}>
      <div className="max-w-2xl mx-auto space-y-10 pb-20">
        <div className="bg-primary rounded-[3rem] p-12 text-white text-center shadow-clay-primary border-t-8 border-white/20 relative overflow-hidden">
          <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em] mb-4">Total accumulé</p>
          <p className="text-7xl font-mono-num font-black tracking-tighter">€{user.balance?.toFixed(2)}</p>
        </div>
        <div className="space-y-6">
          <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter px-2 opacity-70 text-center">Historique des pièces</h3>
          <div className="space-y-3">
            {myTrans.map(t => (
              <div key={t.id} className="flex items-center gap-5 p-6 bg-white dark:bg-surface-container-high rounded-[2rem] shadow-clay border border-on-surface/5 group hover:scale-[1.02] transition-transform">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${t.amount >= 0 ? 'bg-secondary-container/40 text-secondary' : 'bg-error-container/40 text-error'}`}>
                   {t.amount >= 0 ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-extrabold text-on-surface text-lg truncate tracking-tight">{t.description}</p>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</p>
                </div>
                <Amount value={t.amount} size="md" />
              </div>
            ))}
            {myTrans.length === 0 && <EmptyState icon={Wallet} title="Tirelire vide" description="Pas encore de transactions." />}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export function GoalsScreen() {
  const navigate = useNavigate();
  const { goals, user, loading, fundGoal } = useApp();
  if (loading || !user) return <Layout title="Objectifs"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;
  const myGoals = goals || [];

  return (
    <Layout title="Mes Grands Rêves" showBack onBack={() => navigate('/child')}>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {myGoals.map(goal => (
            <Card key={goal.id} className="p-8 relative overflow-hidden border-b-8 border-secondary">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-secondary-container flex items-center justify-center text-secondary text-4xl shadow-inner animate-float">{goal.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-headline font-black text-2xl text-on-surface tracking-tighter leading-tight">{goal.title}</h4>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60 mt-1">{goal.isShared ? 'Objectif Partagé' : 'Objectif Personnel'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                      <p className="text-xs font-black text-primary uppercase tracking-widest">Épargne</p>
                      <p className="font-mono-num font-black text-2xl text-on-surface">€{goal.current} <span className="text-on-surface-variant text-sm font-medium opacity-40">/ €{goal.target}</span></p>
                   </div>
                   <ProgressBar value={goal.current} max={goal.target} color="success" height="lg" />
                </div>
                <Btn full variant="secondary" className="h-12" onClick={() => {
                  const amount = window.prompt("Combien souhaites-tu épargner ?");
                  if (amount) fundGoal(goal.id, amount);
                }}>Ajouter des pièces</Btn>
              </div>
            </Card>
          ))}
        </div>
        {myGoals.length === 0 && <EmptyState icon={Target} title="C'est le moment de rêver" description="Quel sera ton prochain grand projet ?" />}
      </div>
    </Layout>
  );
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout, loading } = useApp();
  if (loading || !user) return <Layout title="Profil"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  return (
    <Layout title="Mon Espace" showBack onBack={() => navigate('/child')}>
      <div className="max-w-2xl mx-auto space-y-10 pb-20 text-center">
        <div className="w-40 h-40 mx-auto rounded-[3rem] bg-white/40 dark:bg-white/10 flex items-center justify-center border-4 border-primary/20 shadow-clay">
            <span className="text-8xl">{user.avatar}</span>
        </div>
        <h2 className="text-5xl font-headline font-black text-on-surface tracking-tighter">{user.name}</h2>
        <Btn full variant="ghost" className="h-16 text-lg text-error hover:bg-error-container/20" icon={LogOut} onClick={() => { logout(); navigate('/welcome'); }}>Quitter PocketMoney</Btn>
      </div>
    </Layout>
  );
}
