import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users, ListChecks, BarChart2, Settings, Plus,
  ChevronRight, Calendar, Wallet, CheckCircle, XCircle,
  Clock, AlertCircle, TrendingUp, TrendingDown, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, UserPlus, Shield, Filter,
  Search, Trash2, Edit3, Save, X, Star, Zap, Sparkles, LogOut,
  ShoppingBag, Check, ClipboardList, MessageSquare, Image as ImageIcon, Lock
} from 'lucide-react';
import { useApp } from '../context';
import { rulesAPI, allowanceAPI, analyticsAPI } from '../api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Layout } from '../components/layout';
import {
  Card, Btn, Badge, StatusBadge, Avatar, StatCard,
  ProgressBar, Modal, Input, Textarea, Select, EmptyState, Amount,
} from '../components/ui';

// ── Parent Dashboard ──────────────────────────────────────────────────────
export function ParentDashboard() {
  const navigate = useNavigate();
  const { family, chores, expenses, logout, loading } = useApp();

  if (loading || !family) {
    return (
      <Layout title="Tableau de Bord">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const children = (family?.users || []).filter(u => u.role === 'CHILD');
  const pendingCount = (chores || []).filter(c => c.status === 'SUBMITTED' || c.status === 'submitted').length;
  const pendingExpenseCount = (expenses || []).filter(e => e.status === 'PENDING').length;

  return (
    <Layout 
      title="Tableau de Bord"
      headerRight={<Btn icon={Plus} size="sm" onClick={() => navigate('/parent/chores/new')}>Assigner une corvée</Btn>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <StatCard
          title="Trésor Familial"
          value={`€${children.reduce((acc, c) => acc + (c.balance || 0), 0).toFixed(2)}`}
          sub="Total des tirelires"
          icon={Wallet}
        />
        <StatCard
          title="À Vérifier"
          value={pendingCount}
          sub="Corvées en attente"
          icon={Clock}
          color="secondary"
          onClick={() => navigate('/parent/chores')}
        />
        <StatCard
          title="Dépenses"
          value={pendingExpenseCount}
          sub="Demandes en attente"
          icon={ShoppingBag}
          color="secondary"
          onClick={() => navigate('/parent/expenses')}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-black text-2xl text-on-surface tracking-tight">Mes Enfants</h3>
            <button onClick={() => navigate('/parent/children')} className="text-sm font-bold text-primary hover:underline">Voir tout</button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children.slice(0, 4).map(child => (
              <Card key={child.id} hover onClick={() => navigate('/parent/children')} className="p-6">
                <div className="flex items-center gap-5">
                  <Avatar letter={child.avatar || child.name.charAt(0)} color={child.color || '#835500'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-extrabold text-on-surface text-lg truncate tracking-tight">{child.name}</p>
                    <p className="text-sm text-primary font-mono-num font-bold">€{(child.balance || 0).toFixed(2)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/30">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-96">
          <div className="bg-white/40 dark:bg-surface-container-high/40 rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5 shadow-clay">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline font-extrabold text-xl text-on-surface tracking-tight text-center">Action Requise</h3>
              <Badge variant="primary" size="sm">{pendingCount}</Badge>
            </div>
            
            <div className="space-y-4">
              {(chores || []).filter(c => c.status === 'SUBMITTED' || c.status === 'submitted').length === 0 ? (
                <div className="py-10 text-center space-y-3 opacity-50">
                   <div className="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center text-secondary">
                      <CheckCircle size={32} />
                   </div>
                   <p className="font-medium text-sm">Tout est validé !</p>
                </div>
              ) : (
                (chores || []).filter(c => c.status === 'SUBMITTED' || c.status === 'submitted').slice(0, 3).map(chore => {
                   const child = children.find(u => u.id === chore.assigneeId);
                   return (
                    <Card key={chore.id} hover className="p-4 bg-white/80 dark:bg-surface-container-highest/50 border border-primary/5 cursor-pointer" onClick={() => navigate(`/parent/chores/${chore.id}`)}>
                      <div className="flex items-center gap-4">
                        <Avatar letter={child?.avatar || child?.name?.charAt(0)} color={child?.color} size="xs" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{chore.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-bold uppercase">{child?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono-num font-extrabold text-primary">€{chore.reward}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3 mt-8">
              <Btn full variant="primary" icon={Plus} onClick={() => navigate('/parent/chores/new')}>Assigner une corvée</Btn>
              <Btn full variant="secondary" onClick={() => navigate('/parent/chores')}>Voir les soumissions</Btn>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Chores List Screen ───────────────────────────────────────────────────
const WEEKDAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function ChoresList() {
  const navigate = useNavigate();
  const { chores, family, choreTemplates, updateChoreTemplate, deleteChoreTemplate, loading } = useApp();
  const [search, setSearch] = useState('');

  if (loading || !family) return <Layout title="Corvées"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  const children = (family?.users || []).filter(u => u.role === 'CHILD');
  const submitted = (chores || []).filter(c => (c.status === 'SUBMITTED' || c.status === 'submitted') && c.title.toLowerCase().includes(search.toLowerCase()));
  const pending = (chores || []).filter(c => (c.status === 'PENDING' || c.status === 'pending') && c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout
      title="Mes Corvées"
      headerRight={<Btn icon={Plus} size="sm" onClick={() => navigate('/parent/chores/new')}>Assigner</Btn>}
    >
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <button 
          onClick={() => navigate('/parent/chores/new')}
          className="w-full group"
        >
          <Card className="p-8 border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary hover:border-primary transition-all duration-500 text-center">
             <div className="w-16 h-16 rounded-2xl bg-primary-container mx-auto flex items-center justify-center text-primary mb-4 shadow-clay group-hover:scale-110 transition-transform">
                <Plus size={32} strokeWidth={3} />
             </div>
             <h3 className="text-2xl font-headline font-black text-on-surface group-hover:text-on-primary transition-colors">Créer une nouvelle mission</h3>
          </Card>
        </button>

        <div className="relative group">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Rechercher une tâche..."
            className="w-full h-16 pl-14 pr-6 rounded-[2rem] text-base font-medium bg-white dark:bg-surface-container-high border-0 shadow-clay-well focus:ring-4 focus:ring-primary/10 outline-none transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-4 mb-6 px-2">
              <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter">À vérifier</h3>
              <div className="bg-primary px-3 py-1 rounded-full text-white text-xs font-black">{submitted.length}</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {submitted.map((chore) => {
                const child = children.find(u => u.id === chore.assigneeId);
                return (
                  <Card key={chore.id} hover className="p-6 border-l-8 border-primary relative overflow-hidden group cursor-pointer" onClick={() => navigate(`/parent/chores/${chore.id}`)}>
                    <div className="flex items-center justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar letter={child?.avatar || child?.name?.charAt(0)} color={child?.color} size="md" />
                        <div className="min-w-0">
                          <h4 className="font-headline font-extrabold text-on-surface text-lg leading-tight truncate">{chore.title}</h4>
                          <p className="text-xs font-bold text-primary uppercase mt-1 tracking-widest">{child?.name}</p>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-on-surface-variant/30 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                );
              })}
              {submitted.length === 0 && <div className="col-span-full py-10 text-center opacity-40 italic">Rien à valider.</div>}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 mb-6 px-2 opacity-60">
              <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter">En cours</h3>
              <div className="bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant text-xs font-black">{pending.length}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pending.map((chore) => {
                const child = children.find(u => u.id === chore.assigneeId);
                return (
                  <Card key={chore.id} hover className="p-5 opacity-80 hover:opacity-100" onClick={() => navigate(`/parent/chores/${chore.id}`)}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <Avatar letter={child?.avatar || child?.name?.charAt(0)} color={child?.color} size="xs" />
                         <span className="font-mono-num font-black text-primary">€{chore.reward}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-on-surface leading-tight truncate">{chore.title}</h4>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {choreTemplates.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6 px-2 opacity-60">
                <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter">Modèles récurrents</h3>
                <div className="bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant text-xs font-black">{choreTemplates.length}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {choreTemplates.map(t => {
                  const child = children.find(u => u.id === t.assigneeId);
                  const freqLabel = t.frequency === 'DAILY' ? 'Chaque jour' : `Chaque ${WEEKDAY_LABELS[t.weekday] || ''}`;
                  return (
                    <Card key={t.id} className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <Avatar letter={child?.avatar || child?.name?.charAt(0)} color={child?.color} size="xs" />
                        <div className="min-w-0">
                          <p className="font-bold text-on-surface truncate">{t.title}</p>
                          <p className="text-xs text-on-surface-variant">{freqLabel} · €{t.reward}{!t.active && ' · en pause'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => updateChoreTemplate(t.id, { active: !t.active })} className="p-2 text-on-surface-variant hover:text-primary" title={t.active ? 'Mettre en pause' : 'Réactiver'}>
                          {t.active ? <Clock size={16} /> : <CheckCircle size={16} />}
                        </button>
                        <button onClick={() => window.confirm(`Supprimer le modèle "${t.title}" ?`) && deleteChoreTemplate(t.id)} className="p-2 text-on-surface-variant hover:text-error">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ── Chore Detail Screen ──────────────────────────────────────────────────
export function ChoreDetail() {
  const navigate = useNavigate();
  const { chores, family, approveChore, rejectChore, deleteChore } = useApp();
  const { choreId } = useParams();
  const chore = (chores || []).find(c => c.id === choreId);

  if (!chore) return <Layout title="Erreur" showBack onBack={() => navigate('/parent/chores')}><div className="text-center py-20"><p className="font-bold text-on-surface-variant">Corvée introuvable</p></div></Layout>;

  const child = family?.users?.find(u => u.id === chore.assigneeId);
  const isSubmitted = chore.status === 'SUBMITTED' || chore.status === 'submitted';

  const handleApprove = async () => {
    await approveChore(chore.id);
    navigate('/parent/chores');
  };

  const handleReject = async () => {
    const reason = window.prompt("Raison du refus (optionnel) :");
    await rejectChore(chore.id, reason || '');
    navigate('/parent/chores');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer définitivement "${chore.title}" ?`)) return;
    await deleteChore(chore.id);
    navigate('/parent/chores');
  };

  return (
    <Layout title="Détails de la mission" showBack onBack={() => navigate('/parent/chores')}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-10 relative overflow-hidden">
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <StatusBadge status={chore.status} />
                  <div className="text-4xl font-mono-num font-black text-primary tracking-tighter">€{chore.reward.toFixed(2)}</div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter leading-tight">{chore.title}</h2>
                  <p className="text-lg text-on-surface-variant font-medium leading-relaxed opacity-80">{chore.description || "Aucune description fournie."}</p>
                </div>

                <div className="pt-8 border-t border-on-surface/5 flex items-center gap-4">
                   <Avatar letter={child?.avatar || child?.name?.charAt(0)} color={child?.color} size="sm" />
                   <div>
                     <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Assigné à</p>
                     <p className="font-headline font-extrabold text-on-surface text-lg">{child?.name}</p>
                   </div>
                </div>
              </div>
            </Card>

            {/* Proof Section if Submitted */}
            {isSubmitted && (
              <Card className="p-10 border-t-8 border-secondary overflow-hidden">
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-xl text-secondary"><ImageIcon size={24} /></div>
                    <h3 className="font-headline font-black text-2xl tracking-tighter">Preuve de l'enfant</h3>
                  </div>

                  {chore.proofImageUrl ? (
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-surface-container">
                      <img src={chore.proofImageUrl} alt="Preuve" className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  ) : (
                    <div className="p-8 bg-surface-container rounded-3xl text-center text-on-surface-variant opacity-60">
                      <p className="font-medium">Aucune photo fournie.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-on-surface-variant uppercase tracking-widest">
                       <MessageSquare size={16} /> Note de {child?.name}
                    </div>
                    <div className="p-6 bg-surface-container rounded-[1.5rem] italic font-medium text-lg leading-relaxed">
                      "{chore.note || "Aucun message laissé."}"
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            {isSubmitted && (
              <Card className="p-8 sticky top-24 border-2 border-primary/20 shadow-clay-primary">
                 <div className="space-y-6">
                    <h3 className="font-headline font-black text-xl text-center tracking-tight">Décision finale</h3>
                    <Btn full size="lg" icon={Check} onClick={handleApprove} className="h-16 shadow-clay-secondary bg-secondary text-on-secondary">Approuver</Btn>
                    <Btn full variant="danger" size="lg" icon={X} onClick={handleReject} className="h-16">Refuser</Btn>
                 </div>
              </Card>
            )}

            <Card className="p-8 space-y-6 opacity-80">
               <div className="space-y-1">
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Échéance</p>
                 <div className="flex items-center gap-2 font-headline font-extrabold text-on-surface">
                   <Clock size={16} className="text-primary" /> {chore.deadline}
                 </div>
               </div>
               {!isSubmitted && (
                 <div className="pt-6 border-t border-on-surface/5 space-y-3">
                   <Btn full variant="outline" onClick={() => navigate(`/parent/chores/${chore.id}/edit`)}>Modifier la tâche</Btn>
                   <button onClick={handleDelete} className="w-full py-3 text-xs font-bold text-error/60 hover:text-error transition-colors uppercase tracking-widest">Supprimer la corvée</button>
                 </div>
               )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Create / Edit Chore Screen ───────────────────────────────────────────
export function CreateChore() {
  const navigate = useNavigate();
  const { choreId } = useParams();
  const isEdit = !!choreId;
  const { family, chores, addChore, editChore, createChoreTemplate, loading } = useApp();
  const children = (family?.users || []).filter(u => u.role === 'CHILD');
  const existing = isEdit ? (chores || []).find(c => c.id === choreId) : null;
  const [form, setForm] = useState({ title: '', description: '', reward: '', assigneeId: '', deadline: 'Aujourd\'hui' });
  const [initialized, setInitialized] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [repeatForm, setRepeatForm] = useState({ frequency: 'DAILY', weekday: '1' });

  useEffect(() => {
    if (isEdit && existing && !initialized) {
      setForm({
        title: existing.title || '',
        description: existing.description || '',
        reward: String(existing.reward ?? ''),
        assigneeId: existing.assigneeId || '',
        deadline: existing.deadline || 'Aujourd\'hui',
      });
      setInitialized(true);
    }
  }, [isEdit, existing, initialized]);

  useEffect(() => {
    if (!isEdit && children.length > 0 && !form.assigneeId) {
      setForm(f => ({ ...f, assigneeId: children[0].id }));
    }
  }, [children, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assigneeId) return;
    if (isEdit) {
      await editChore(choreId, { ...form, reward: parseFloat(form.reward) || 0 });
    } else if (repeat) {
      await createChoreTemplate({
        title: form.title, description: form.description, reward: parseFloat(form.reward) || 0,
        assigneeId: form.assigneeId, frequency: repeatForm.frequency, weekday: repeatForm.weekday,
      });
    } else {
      await addChore({ ...form, reward: parseFloat(form.reward) || 0 });
    }
    navigate('/parent/chores');
  };

  if (loading || !family) return <Layout title={isEdit ? 'Modifier la corvée' : 'Nouvelle Corvée'}><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  if (isEdit && !existing) {
    return <Layout title="Erreur" showBack onBack={() => navigate('/parent/chores')}><div className="text-center py-20"><p className="font-bold text-on-surface-variant">Corvée introuvable</p></div></Layout>;
  }

  if (!isEdit && children.length === 0) {
    return (
      <Layout title="Nouvelle Corvée" showBack onBack={() => navigate('/parent/chores')}>
        <div className="max-w-md mx-auto">
          <EmptyState
            icon={UserPlus}
            title="Ajoutez d'abord un enfant"
            description="Il faut au moins un enfant dans la famille pour lui assigner une corvée. Partagez le code d'invitation depuis les Paramètres."
            action={<Btn onClick={() => navigate('/parent/settings')}>Voir le code d'invitation</Btn>}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEdit ? 'Modifier la corvée' : 'Nouvelle Corvée'} showBack onBack={() => navigate(isEdit ? `/parent/chores/${choreId}` : '/parent/chores')}>
      <div className="max-w-2xl mx-auto pt-4">
        <Card className="p-10 shadow-clay-primary border-t-8 border-primary">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Input label="Titre de la corvée" placeholder="ex: Ranger la cuisine" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="h-14 text-lg font-bold" />
            <Textarea label="Description détaillée" placeholder="Dites à votre enfant précisément ce qu'il doit faire..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-base" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Input label="Récompense (€)" type="number" min="0" step="0.1" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} required className="h-14 font-mono-num font-black" prefix="€" />
              <Select label="Pour qui ?" value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))} options={children.map(c => ({ label: c.name, value: c.id }))} />
            </div>

            {!repeat && (
              <Select
                label="Échéance"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                options={[
                  { label: 'Aujourd\'hui', value: 'Aujourd\'hui' },
                  { label: 'Demain', value: 'Demain' },
                  { label: 'Ce week-end', value: 'Ce week-end' },
                  { label: 'Plus tard', value: 'Plus tard' },
                ]}
              />
            )}

            {!isEdit && (
              <div className="bg-surface-container-low/50 rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-on-surface">Répéter cette corvée</p>
                    <p className="text-xs text-on-surface-variant mt-1">Régénérée automatiquement, pas besoin de la recréer.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRepeat(r => !r)}
                    className={`w-16 h-9 rounded-full flex-shrink-0 transition-colors relative ${repeat ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${repeat ? 'translate-x-7' : ''}`} />
                  </button>
                </div>
                {repeat && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <Select
                      label="Fréquence"
                      value={repeatForm.frequency}
                      onChange={e => setRepeatForm(f => ({ ...f, frequency: e.target.value }))}
                      options={[
                        { label: 'Chaque jour', value: 'DAILY' },
                        { label: 'Chaque semaine', value: 'WEEKLY' },
                      ]}
                    />
                    {repeatForm.frequency === 'WEEKLY' && (
                      <Select
                        label="Jour"
                        value={repeatForm.weekday}
                        onChange={e => setRepeatForm(f => ({ ...f, weekday: e.target.value }))}
                        options={[
                          { label: 'Dimanche', value: '0' }, { label: 'Lundi', value: '1' },
                          { label: 'Mardi', value: '2' }, { label: 'Mercredi', value: '3' },
                          { label: 'Jeudi', value: '4' }, { label: 'Vendredi', value: '5' },
                          { label: 'Samedi', value: '6' },
                        ]}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="pt-6">
              <Btn type="submit" full icon={Save} className="h-16 text-lg shadow-clay-primary">{isEdit ? 'Enregistrer les modifications' : (repeat ? 'Créer le modèle récurrent' : 'Lancer la mission !')}</Btn>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}

// ── Children Management Screen ───────────────────────────────────────────
export function ChildrenView() {
  const navigate = useNavigate();
  const { family, loading, applyPenalty, showToast } = useApp();
  const children = (family?.users || []).filter(u => u.role === 'CHILD');
  const rules = (family?.rules || []).filter(r => r.active !== false);

  const [sanctionModal, setSanctionModal] = useState(null); // { child }
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [applying, setApplying] = useState(false);

  const openSanction = (child) => {
    setSelectedRuleId(null);
    setSanctionModal({ child });
  };

  const handleApply = async () => {
    if (!sanctionModal || !selectedRuleId) return;
    setApplying(true);
    await applyPenalty(sanctionModal.child.id, selectedRuleId);
    setApplying(false);
    setSanctionModal(null);
  };

  const selectedRule = rules.find(r => r.id === selectedRuleId);

  if (loading || !family) return <Layout title="Mes Enfants"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  return (
    <Layout title="Mes Enfants">
      {/* Sanction Modal */}
      <Modal
        open={!!sanctionModal}
        onClose={() => setSanctionModal(null)}
        title={`Sanctionner ${sanctionModal?.child?.name}`}
        footer={
          <Btn
            full
            variant="danger"
            icon={AlertCircle}
            disabled={!selectedRuleId}
            loading={applying}
            onClick={handleApply}
          >
            Appliquer {selectedRule ? `(-€${selectedRule.amount})` : ''}
          </Btn>
        }
      >
        {sanctionModal && (
          <div className="space-y-4">
            {/* Child balance reminder */}
            <div className="flex items-center gap-3 bg-error-container/20 rounded-2xl p-4">
              <Avatar
                letter={sanctionModal.child.avatar || sanctionModal.child.name.charAt(0)}
                color={sanctionModal.child.color}
                size="xs"
              />
              <div>
                <p className="text-sm font-bold text-on-surface">{sanctionModal.child.name}</p>
                <p className="text-xs text-on-surface-variant font-body">
                  Solde actuel : <span className="font-mono-num font-bold text-primary">€{(sanctionModal.child.balance || 0).toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Rules list */}
            {rules.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <Shield size={36} className="text-on-surface-variant/30 mx-auto" />
                <p className="text-sm text-on-surface-variant font-body">
                  Aucune règle définie.
                </p>
                <button
                  onClick={() => { setSanctionModal(null); navigate('/parent/rules'); }}
                  className="text-sm text-primary font-label font-bold hover:underline cursor-pointer"
                >
                  Créer des règles →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-on-surface-variant font-label font-bold uppercase tracking-widest px-1">
                  Choisir une sanction
                </p>
                {rules.map(rule => {
                  const selected = selectedRuleId === rule.id;
                  return (
                    <button
                      key={rule.id}
                      onClick={() => setSelectedRuleId(rule.id)}
                      className={`w-full flex items-center justify-between gap-4 px-4 py-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer active:scale-[0.98]
                        ${selected
                          ? 'bg-error-container/30 border-error text-on-surface'
                          : 'bg-white dark:bg-surface-container-high border-surface-container-highest/30 hover:border-error/40'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                          ${selected ? 'border-error bg-error' : 'border-on-surface-variant/30'}`}>
                          {selected && <Check size={11} className="text-on-error" />}
                        </div>
                        <div>
                          <p className="font-body font-semibold text-sm text-on-surface">{rule.title}</p>
                          {rule.description && (
                            <p className="text-xs text-on-surface-variant font-body leading-tight mt-0.5">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <span className={`font-mono-num font-bold text-sm flex-shrink-0 ${selected ? 'text-error' : 'text-on-surface-variant'}`}>
                        -€{rule.amount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {children.map(child => (
          <Card key={child.id} className="p-8 group relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left gap-6">
              <Avatar letter={child.avatar || child.name.charAt(0)} color={child.color} size="lg" />
              <div className="space-y-1">
                <h4 className="text-3xl font-headline font-black text-on-surface tracking-tighter leading-none">{child.name}</h4>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Explorateur · {child.age} ans</p>
                {child.settings?.frozen && (
                  <Badge variant="danger" size="sm"><Lock size={10} className="inline -mt-0.5 mr-1" />Compte gelé</Badge>
                )}
              </div>

              <div className="w-full bg-primary/5 dark:bg-white/5 rounded-3xl p-4 border border-primary/10">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Tirelire actuelle</p>
                <p className="text-3xl font-mono-num font-black text-on-surface leading-none">€{(child.balance || 0).toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full">
                <Btn full variant="primary" icon={Plus} onClick={() => navigate('/parent/chores/new')} className="h-12">Assigner une corvée</Btn>
                <div className="grid grid-cols-2 gap-3">
                  <Btn variant="outline" size="sm" icon={Edit3} onClick={() => navigate(`/parent/children/${child.id}/settings`)} className="h-12">Gérer</Btn>
                  <Btn variant="danger" size="sm" icon={AlertCircle} onClick={() => openSanction(child)} className="h-12">Sanction</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}

        <button
          onClick={() => { showToast('Partagez votre code d\'invitation avec votre enfant pour qu\'il crée son compte.', 'info'); navigate('/parent/settings'); }}
          className="border-4 border-dashed border-on-surface/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary/20 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <UserPlus size={32} />
          </div>
          <span className="font-headline font-black text-xl text-on-surface-variant tracking-tighter">Ajouter un enfant</span>
        </button>
      </div>
    </Layout>
  );
}

// ── Rules and Penalties Screen ───────────────────────────────────────────
// Chaque règle a une identité persistante (CRUD unitaire) — plus de
// remplacement en bloc qui perdait les identifiants à chaque édition.
export function RulesScreen() {
  const navigate = useNavigate();
  const { family, createRule, editRule, deleteRule, loading } = useApp();
  const rules = family?.rules || [];
  const [editingId, setEditingId] = useState(null); // null = pas de formulaire, 'new' = création
  const [form, setForm] = useState({ title: '', description: '', amount: '' });
  const [busy, setBusy] = useState(false);

  if (loading || !family) return <Layout title="Règles"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  const startCreate = () => { setForm({ title: '', description: '', amount: '' }); setEditingId('new'); };
  const startEdit = (rule) => { setForm({ title: rule.title, description: rule.description || '', amount: String(rule.amount) }); setEditingId(rule.id); };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      if (editingId === 'new') await createRule(form);
      else await editRule(editingId, form);
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Supprimer la règle "${rule.title}" ?`)) return;
    await deleteRule(rule.id);
  };

  return (
    <Layout
      title="Règles & Amendes"
      showBack
      onBack={() => navigate('/parent')}
      headerRight={<Btn size="sm" variant="outline" onClick={() => navigate('/parent/rules/history')}>Historique</Btn>}
    >
      <div className="max-w-2xl mx-auto py-4 space-y-8">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-headline font-black text-2xl tracking-tighter">Liste des sanctions</h3>
             {editingId === null && <Btn size="sm" icon={Plus} onClick={startCreate}>Ajouter</Btn>}
          </div>

          {editingId !== null && (
            <div className="space-y-4 mb-8 p-5 bg-surface-container-low/50 rounded-2xl animate-fade-in">
              <Input label="Motif" placeholder="ex: Chambre non rangée" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Input label="Description (optionnel)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <Input label="Montant (€)" type="number" min="0" step="0.5" prefix="€" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Btn variant="outline" onClick={() => setEditingId(null)}>Annuler</Btn>
                <Btn loading={busy} onClick={handleSave}>Enregistrer</Btn>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {rules.length === 0 && editingId === null && (
              <div className="text-center py-8 text-on-surface-variant/50">
                <Shield size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-body">Aucune sanction définie. Ajoutez-en une !</p>
              </div>
            )}
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between gap-4 bg-white dark:bg-surface-container-high rounded-2xl p-4 shadow-clay-well">
                <div className="min-w-0">
                  <p className="font-bold text-on-surface">{rule.title}</p>
                  {rule.description && <p className="text-xs text-on-surface-variant mt-0.5">{rule.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono-num font-black text-error">-€{rule.amount}</span>
                  <button onClick={() => startEdit(rule)} className="p-2 text-on-surface-variant hover:text-primary"><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(rule)} className="p-2 text-on-surface-variant hover:text-error"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

// ── Penalty History Screen ────────────────────────────────────────────────
export function PenaltyHistoryScreen() {
  const navigate = useNavigate();
  const { loading } = useApp();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    rulesAPI.getPenaltyHistory().then(res => setHistory(res.history || [])).catch(() => setHistory([]));
  }, []);

  if (loading || history === null) return <Layout title="Historique" showBack onBack={() => navigate('/parent/rules')}><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  return (
    <Layout title="Historique des sanctions" showBack onBack={() => navigate('/parent/rules')}>
      <div className="max-w-2xl mx-auto space-y-3 pb-20">
        {history.length === 0 && <EmptyState icon={Shield} title="Aucune sanction appliquée" description="L'historique apparaîtra ici dès la première sanction." />}
        {history.map(entry => (
          <Card key={entry.id} className="p-5">
            <div className="flex items-center gap-4">
              <Avatar letter={entry.child?.avatar || entry.child?.name?.charAt(0)} color={entry.child?.color} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-on-surface truncate">{entry.description}</p>
                <p className="text-xs text-on-surface-variant">{entry.child?.name} · {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <span className="font-mono-num font-black text-error flex-shrink-0">{entry.amount.toFixed(2)}€</span>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}

// ── Analytics Screen ─────────────────────────────────────────────────────
const CHART_COLORS = { primary: '#8a5a1f', secondary: '#2E75B6', tertiary: '#7B61FF', error: '#d64545', gold: '#eab308' };
const STATUS_LABELS = { PENDING: 'En attente', SUBMITTED: 'À valider', COMPLETED: 'Terminées', REJECTED: 'Refusées' };
const CATEGORY_LABELS = { ONLINE: 'En ligne', CASH: 'Liquide', OTHER: 'Autre' };

export function AnalyticsScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    analyticsAPI.getOverview().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) {
    return <Layout title="Statistiques"><div className="text-center py-20 text-on-surface-variant">{error}</div></Layout>;
  }
  if (!data) {
    return <Layout title="Statistiques"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;
  }

  const choreData = (data.choreCounts || []).map(c => ({ name: STATUS_LABELS[c.status] || c.status, value: c.count }));
  const totalChores = choreData.reduce((sum, c) => sum + c.value, 0);
  const completedChores = data.choreCounts?.find(c => c.status === 'COMPLETED')?.count || 0;

  const weeklyData = (data.weeklyCompletion || []).map(w => ({
    semaine: new Date(w.week).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    complétées: w.completed,
    total: w.total,
  }));

  const categoryData = (data.spendingByCategory || []).filter(c => c.total > 0).map(c => ({ name: CATEGORY_LABELS[c.category] || c.category, value: c.total }));
  const totalSpent = categoryData.reduce((sum, c) => sum + c.value, 0);

  const savingsData = (data.savingsTrend || []).map(s => ({
    date: new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    épargné: s.cumulative,
  }));

  const childData = (data.perChild || []).map(c => ({ name: c.name, gagné: c.earned, dépensé: c.spent }));
  const pieColors = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.error];

  return (
    <Layout title="Statistiques">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard title="Corvées terminées" value={completedChores} sub={`sur ${totalChores} au total`} icon={CheckCircle} />
          <StatCard title="Total dépensé" value={`€${totalSpent.toFixed(2)}`} sub="Dépenses approuvées" icon={ShoppingBag} color="secondary" />
          <StatCard title="Total épargné" value={`€${(savingsData[savingsData.length - 1]?.épargné || 0).toFixed(2)}`} sub="Dans les objectifs" icon={TrendingUp} />
        </div>

        <Card className="p-8">
          <h3 className="font-headline font-black text-2xl tracking-tighter mb-6">Corvées par semaine</h3>
          {weeklyData.length === 0 ? (
            <p className="text-center py-16 text-on-surface-variant opacity-60">Pas encore assez de données.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="semaine" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill={CHART_COLORS.secondary} opacity={0.35} radius={[8, 8, 0, 0]} />
                <Bar dataKey="complétées" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8">
            <h3 className="font-headline font-black text-2xl tracking-tighter mb-6">Dépenses par catégorie</h3>
            {categoryData.length === 0 ? (
              <p className="text-center py-16 text-on-surface-variant opacity-60">Aucune dépense approuvée.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryData.map((entry, i) => <Cell key={entry.name} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card className="p-8">
            <h3 className="font-headline font-black text-2xl tracking-tighter mb-6">Tendance d'épargne</h3>
            {savingsData.length === 0 ? (
              <p className="text-center py-16 text-on-surface-variant opacity-60">Pas encore d'épargne.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="épargné" stroke={CHART_COLORS.secondary} strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <Card className="p-8">
          <h3 className="font-headline font-black text-2xl tracking-tighter mb-6">Comparaison entre enfants</h3>
          {childData.length === 0 ? (
            <p className="text-center py-16 text-on-surface-variant opacity-60">Aucun enfant dans la famille.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={childData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="gagné" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
                <Bar dataKey="dépensé" fill={CHART_COLORS.error} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </Layout>
  );
}

// ── Settings Screen ──────────────────────────────────────────────────────
export function SettingsScreen() {
  const { family, logout, loading } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/welcome'); };

  if (loading || !family) return <Layout title="Paramètres"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  return (
    <Layout title="Paramètres">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Family info */}
        <Card className="p-8 space-y-6">
          <h3 className="font-headline font-black text-2xl tracking-tighter">Ma Famille</h3>
          <Input label="Nom de la tribu" value={family?.name || ''} readOnly className="h-14 font-bold" />
          <div className="bg-primary/5 dark:bg-white/5 rounded-3xl p-6 border-2 border-primary/10">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 text-center">Code d'invitation famille</p>
            <div className="bg-white dark:bg-surface-container-highest rounded-2xl p-5 text-center shadow-inner group">
              <span className="text-3xl font-mono font-black tracking-[0.5em] text-on-surface select-all cursor-copy group-hover:text-primary transition-colors">{family?.inviteCode}</span>
            </div>
          </div>
        </Card>

        {/* Rules & Sanctions — édition complète sur /parent/rules */}
        <Card className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline font-black text-2xl tracking-tighter">Sanctions & Règles</h3>
              <p className="text-xs text-on-surface-variant font-body mt-1">{(family?.rules || []).length} règle(s) définie(s)</p>
            </div>
            <Btn size="sm" icon={Shield} variant="outline" onClick={() => navigate('/parent/rules')}>Gérer</Btn>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="p-8">
          <Btn variant="danger" full icon={LogOut} onClick={handleLogout} className="h-16 text-lg">
            Se déconnecter
          </Btn>
        </Card>
      </div>
    </Layout>
  );
}

// ── Expense Requests Review Screen ───────────────────────────────────────
export function ExpensesReview() {
  const navigate = useNavigate();
  const { family, expenses, loading, approveExpense, rejectExpense } = useApp();
  const [approveModal, setApproveModal] = useState(null); // expense
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading || !family) return <Layout title="Dépenses" showBack onBack={() => navigate('/parent')}><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  const children = (family?.users || []).filter(u => u.role === 'CHILD');
  const pending = (expenses || []).filter(e => e.status === 'PENDING');
  const resolved = (expenses || []).filter(e => e.status !== 'PENDING');

  const openApprove = (expense) => { setAmount(String(expense.amount)); setApproveModal(expense); };

  const handleApprove = async () => {
    if (!approveModal) return;
    setBusy(true);
    await approveExpense(approveModal.id, { approvedAmount: amount });
    setBusy(false);
    setApproveModal(null);
  };

  const handleReject = async (expense) => {
    const reason = window.prompt('Raison du refus (optionnel) :');
    await rejectExpense(expense.id, { parentNote: reason || '' });
  };

  return (
    <Layout title="Dépenses" showBack onBack={() => navigate('/parent')}>
      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title={`Approuver "${approveModal?.title}"`}
        footer={
          <Btn full variant="secondary" loading={busy} onClick={handleApprove}>Approuver {amount ? `(€${amount})` : ''}</Btn>
        }
      >
        {approveModal && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">Demande de <b>{approveModal.child?.name}</b> : {approveModal.description || 'Aucune description'}</p>
            <Input label="Montant approuvé (€)" type="number" min="0" step="0.1" value={amount} onChange={e => setAmount(e.target.value)} prefix="€" />
          </div>
        )}
      </Modal>

      <div className="max-w-3xl mx-auto space-y-12 pb-20">
        <section>
          <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter mb-6">À traiter ({pending.length})</h3>
          {pending.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Rien à traiter" description="Aucune demande de dépense en attente." />
          ) : (
            <div className="space-y-4">
              {pending.map(expense => (
                <Card key={expense.id} className="p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar letter={expense.child?.avatar || expense.child?.name?.charAt(0)} size="sm" />
                      <div className="min-w-0">
                        <p className="font-headline font-extrabold text-on-surface truncate">{expense.title}</p>
                        <p className="text-xs text-on-surface-variant font-bold uppercase">{expense.child?.name} · €{expense.amount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Btn size="sm" variant="secondary" icon={Check} onClick={() => openApprove(expense)}>Approuver</Btn>
                      <Btn size="sm" variant="danger" icon={X} onClick={() => handleReject(expense)}>Refuser</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {resolved.length > 0 && (
          <section>
            <h3 className="font-headline font-black text-2xl text-on-surface tracking-tighter mb-6 opacity-60">Historique</h3>
            <div className="space-y-3">
              {resolved.map(expense => (
                <Card key={expense.id} className="p-5 opacity-80">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface truncate">{expense.title}</p>
                      <p className="text-xs text-on-surface-variant">{expense.child?.name}</p>
                    </div>
                    <StatusBadge status={expense.status} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

// ── Child Settings Screen (limites, gel de compte) ───────────────────────
export function ChildSettingsScreen() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const { family, loading, updateChildSettings, updateAllowance, updateSplitSettings } = useApp();
  const child = (family?.users || []).find(u => u.id === childId);
  const [form, setForm] = useState({ maxExpensePerRequest: '', maxExpensePerWeek: '', frozen: false });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [splitForm, setSplitForm] = useState({ splitEnabled: false, splitSavePct: '0', splitSpendPct: '100', splitGivePct: '0' });
  const [savingSplit, setSavingSplit] = useState(false);

  const [allowanceForm, setAllowanceForm] = useState({ amount: '', frequency: 'WEEKLY', active: true });
  const [allowanceInitialized, setAllowanceInitialized] = useState(false);
  const [savingAllowance, setSavingAllowance] = useState(false);

  useEffect(() => {
    if (child?.settings && !initialized) {
      setForm({
        maxExpensePerRequest: child.settings.maxExpensePerRequest ?? '',
        maxExpensePerWeek: child.settings.maxExpensePerWeek ?? '',
        frozen: !!child.settings.frozen,
      });
      setSplitForm({
        splitEnabled: !!child.settings.splitEnabled,
        splitSavePct: String(child.settings.splitSavePct ?? 0),
        splitSpendPct: String(child.settings.splitSpendPct ?? 100),
        splitGivePct: String(child.settings.splitGivePct ?? 0),
      });
      setInitialized(true);
    }
  }, [child, initialized]);

  useEffect(() => {
    if (!childId || allowanceInitialized) return;
    allowanceAPI.get(childId).then(res => {
      if (res.allowance) {
        setAllowanceForm({
          amount: String(res.allowance.amount),
          frequency: res.allowance.frequency,
          active: res.allowance.active,
        });
      }
      setAllowanceInitialized(true);
    }).catch(() => setAllowanceInitialized(true));
  }, [childId, allowanceInitialized]);

  if (loading || !family) return <Layout title="Réglages"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;
  if (!child) return <Layout title="Erreur" showBack onBack={() => navigate('/parent/children')}><div className="text-center py-20"><p className="font-bold text-on-surface-variant">Enfant introuvable</p></div></Layout>;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateChildSettings(child.id, form);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllowance = async () => {
    setSavingAllowance(true);
    try {
      await updateAllowance(child.id, allowanceForm);
    } finally {
      setSavingAllowance(false);
    }
  };

  const splitTotal = (parseFloat(splitForm.splitSavePct) || 0) + (parseFloat(splitForm.splitSpendPct) || 0) + (parseFloat(splitForm.splitGivePct) || 0);
  const handleSaveSplit = async () => {
    if (Math.round(splitTotal) !== 100) return;
    setSavingSplit(true);
    try {
      await updateSplitSettings(child.id, splitForm);
    } finally {
      setSavingSplit(false);
    }
  };

  return (
    <Layout title={`Réglages · ${child.name}`} showBack onBack={() => navigate('/parent/children')}>
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="p-8 flex items-center gap-5">
          <Avatar letter={child.avatar || child.name.charAt(0)} color={child.color} size="lg" />
          <div>
            <h3 className="text-2xl font-headline font-black text-on-surface tracking-tight">{child.name}</h3>
            <p className="text-sm text-on-surface-variant font-mono-num font-bold">Solde : €{(child.balance || 0).toFixed(2)}</p>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="font-headline font-black text-2xl tracking-tighter">Argent de poche récurrent</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant (€)"
              type="number" min="0" step="0.5" prefix="€"
              value={allowanceForm.amount}
              onChange={e => setAllowanceForm(f => ({ ...f, amount: e.target.value }))}
            />
            <Select
              label="Fréquence"
              value={allowanceForm.frequency}
              onChange={e => setAllowanceForm(f => ({ ...f, frequency: e.target.value }))}
              options={[
                { label: 'Chaque semaine', value: 'WEEKLY' },
                { label: 'Chaque mois', value: 'MONTHLY' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between bg-surface-container-low/50 rounded-2xl p-5">
            <div>
              <p className="font-bold text-on-surface">Activer le versement automatique</p>
              <p className="text-xs text-on-surface-variant mt-1">Crédité automatiquement à la bonne fréquence.</p>
            </div>
            <button
              onClick={() => setAllowanceForm(f => ({ ...f, active: !f.active }))}
              className={`w-16 h-9 rounded-full flex-shrink-0 transition-colors relative ${allowanceForm.active ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${allowanceForm.active ? 'translate-x-7' : ''}`} />
            </button>
          </div>
          <Btn full icon={Save} loading={savingAllowance} onClick={handleSaveAllowance}>Enregistrer</Btn>
        </Card>

        <Card className="p-8 space-y-6">
          <div>
            <h3 className="font-headline font-black text-2xl tracking-tighter">Répartition Épargne / Dépense / Don</h3>
            <p className="text-xs text-on-surface-variant font-body mt-1">Répartit automatiquement chaque gain (corvée, argent de poche) — sans limiter ce que l'enfant peut dépenser.</p>
          </div>
          <div className="flex items-center justify-between bg-surface-container-low/50 rounded-2xl p-5">
            <p className="font-bold text-on-surface">Activer la répartition</p>
            <button
              onClick={() => setSplitForm(f => ({ ...f, splitEnabled: !f.splitEnabled }))}
              className={`w-16 h-9 rounded-full flex-shrink-0 transition-colors relative ${splitForm.splitEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${splitForm.splitEnabled ? 'translate-x-7' : ''}`} />
            </button>
          </div>
          {splitForm.splitEnabled && (
            <div className="grid grid-cols-3 gap-3 animate-fade-in">
              <Input label="Dépense %" type="number" min="0" max="100" value={splitForm.splitSpendPct} onChange={e => setSplitForm(f => ({ ...f, splitSpendPct: e.target.value }))} />
              <Input label="Épargne %" type="number" min="0" max="100" value={splitForm.splitSavePct} onChange={e => setSplitForm(f => ({ ...f, splitSavePct: e.target.value }))} />
              <Input label="Don %" type="number" min="0" max="100" value={splitForm.splitGivePct} onChange={e => setSplitForm(f => ({ ...f, splitGivePct: e.target.value }))} />
            </div>
          )}
          {splitForm.splitEnabled && (
            <p className={`text-xs font-bold ${Math.round(splitTotal) === 100 ? 'text-secondary' : 'text-error'}`}>
              Total : {splitTotal}% {Math.round(splitTotal) === 100 ? '✓' : '(doit faire 100%)'}
            </p>
          )}
          <Btn full icon={Save} loading={savingSplit} disabled={splitForm.splitEnabled && Math.round(splitTotal) !== 100} onClick={handleSaveSplit}>Enregistrer</Btn>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="font-headline font-black text-2xl tracking-tighter">Limites de dépenses</h3>
          <Input
            label="Maximum par demande (€)"
            type="number" min="0" step="1" prefix="€"
            placeholder="Aucune limite"
            value={form.maxExpensePerRequest}
            onChange={e => setForm(f => ({ ...f, maxExpensePerRequest: e.target.value }))}
          />
          <Input
            label="Maximum par semaine (€)"
            type="number" min="0" step="1" prefix="€"
            placeholder="Aucune limite"
            value={form.maxExpensePerWeek}
            onChange={e => setForm(f => ({ ...f, maxExpensePerWeek: e.target.value }))}
          />
          <div className="flex items-center justify-between bg-surface-container-low/50 rounded-2xl p-5">
            <div>
              <p className="font-bold text-on-surface">Geler le compte</p>
              <p className="text-xs text-on-surface-variant mt-1">Bloque toute nouvelle demande de dépense.</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, frozen: !f.frozen }))}
              className={`w-16 h-9 rounded-full flex-shrink-0 transition-colors relative ${form.frozen ? 'bg-error' : 'bg-surface-container-highest'}`}
            >
              <span className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform ${form.frozen ? 'translate-x-7' : ''}`} />
            </button>
          </div>
          <Btn full icon={Save} loading={saving} onClick={handleSave}>Enregistrer</Btn>
        </Card>
      </div>
    </Layout>
  );
}
