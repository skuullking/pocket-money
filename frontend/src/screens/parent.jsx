import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users, ListChecks, BarChart2, Settings, Plus,
  ChevronRight, Calendar, Wallet, CheckCircle, XCircle,
  Clock, AlertCircle, TrendingUp, TrendingDown, MoreHorizontal,
  ArrowUpRight, ArrowDownRight, UserPlus, Shield, Filter,
  Search, Trash2, Edit3, Save, X, Star, Zap, Sparkles, LogOut,
  ShoppingBag, Check, ClipboardList, MessageSquare, Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../context';
import { Layout } from '../components/layout';
import {
  Card, Btn, Badge, StatusBadge, Avatar, StatCard,
  ProgressBar, Modal, Input, Textarea, Select, EmptyState, Amount,
} from '../components/ui';

// ── Parent Dashboard ──────────────────────────────────────────────────────
export function ParentDashboard() {
  const navigate = useNavigate();
  const { family, chores, logout, loading } = useApp();

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
          title="Performance"
          value="92%"
          sub="Taux de réussite"
          icon={TrendingUp}
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
export function ChoresList() {
  const navigate = useNavigate();
  const { chores, family, approveChore, rejectChore, loading } = useApp();
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
        </div>
      </div>
    </Layout>
  );
}

// ── Chore Detail Screen ──────────────────────────────────────────────────
export function ChoreDetail() {
  const navigate = useNavigate();
  const { chores, family, approveChore, rejectChore } = useApp();
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
                   <Btn full variant="outline">Modifier la tâche</Btn>
                   <button className="w-full py-3 text-xs font-bold text-error/60 hover:text-error transition-colors uppercase tracking-widest">Supprimer la corvée</button>
                 </div>
               )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Create Chore Screen ──────────────────────────────────────────────────
export function CreateChore() {
  const navigate = useNavigate();
  const { family, addChore, loading } = useApp();
  const children = (family?.users || []).filter(u => u.role === 'CHILD');
  const [form, setForm] = useState({ title: '', description: '', reward: '', assigneeId: '', deadline: 'Aujourd\'hui' });

  useEffect(() => {
    if (children.length > 0 && !form.assigneeId) {
      setForm(f => ({ ...f, assigneeId: children[0].id }));
    }
  }, [children]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assigneeId) return;
    await addChore({ ...form, reward: parseFloat(form.reward) || 0 });
    navigate('/parent/chores');
  };

  if (loading || !family) return <Layout title="Nouvelle Corvée"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  return (
    <Layout title="Nouvelle Corvée" showBack onBack={() => navigate('/parent/chores')}>
      <div className="max-w-2xl mx-auto pt-4">
        <Card className="p-10 shadow-clay-primary border-t-8 border-primary">
          <form onSubmit={handleSubmit} className="space-y-8">
            <Input label="Titre de la corvée" placeholder="ex: Ranger la cuisine" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="h-14 text-lg font-bold" />
            <Textarea label="Description détaillée" placeholder="Dites à votre enfant précisément ce qu'il doit faire..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-base" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <Input label="Récompense (€)" type="number" min="0" step="0.1" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} required className="h-14 font-mono-num font-black" prefix="€" />
              <Select label="Pour qui ?" value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))} options={children.map(c => ({ label: c.name, value: c.id }))} />
            </div>

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
            
            <div className="pt-6">
              <Btn type="submit" full icon={Save} className="h-16 text-lg shadow-clay-primary">Lancer la mission !</Btn>
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
  const { family, loading, applyPenalty } = useApp();
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
                  onClick={() => { setSanctionModal(null); navigate('/parent/settings'); }}
                  className="text-sm text-primary font-label font-bold hover:underline cursor-pointer"
                >
                  Créer des sanctions dans Paramètres →
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
              </div>

              <div className="w-full bg-primary/5 dark:bg-white/5 rounded-3xl p-4 border border-primary/10">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Tirelire actuelle</p>
                <p className="text-3xl font-mono-num font-black text-on-surface leading-none">€{(child.balance || 0).toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full">
                <Btn full variant="primary" icon={Plus} onClick={() => navigate('/parent/chores/new')} className="h-12">Assigner une corvée</Btn>
                <div className="grid grid-cols-2 gap-3">
                  <Btn variant="outline" size="sm" icon={Edit3} onClick={() => navigate('/parent/settings')} className="h-12">Gérer</Btn>
                  <Btn variant="danger" size="sm" icon={AlertCircle} onClick={() => openSanction(child)} className="h-12">Sanction</Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}

        <button onClick={() => {}} className="border-4 border-dashed border-on-surface/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:bg-primary/5 hover:border-primary/20 transition-all group">
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
export function RulesScreen() {
  const navigate = useNavigate();
  const { family, updateRules, loading } = useApp();
  const [localRules, setLocalRules] = useState([]);

  useEffect(() => {
    if (family?.rules) {
      setLocalRules(family.rules);
    }
  }, [family]);

  const handleAdd = () => setLocalRules([...localRules, { title: '', amount: '0' }]);
  const handleRemove = (index) => setLocalRules(localRules.filter((_, i) => i !== index));
  const handleChange = (index, field, value) => {
    const next = [...localRules];
    next[index][field] = value;
    setLocalRules(next);
  };

  const handleSave = async () => {
    await updateRules(localRules.filter(r => r.title));
  };

  if (loading || !family) return <Layout title="Règles"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div></Layout>;

  return (
    <Layout title="Règles & Amendes" showBack onBack={() => navigate('/parent')}>
      <div className="max-w-2xl mx-auto py-4 space-y-8">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-headline font-black text-2xl tracking-tighter">Liste des amendes</h3>
             <Btn size="sm" icon={Plus} onClick={handleAdd}>Ajouter</Btn>
          </div>

          <div className="space-y-4">
            {localRules.map((rule, i) => (
              <div key={i} className="flex gap-4 items-end animate-fade-in">
                 <div className="flex-1">
                    <Input label={i === 0 ? "Motif" : ""} value={rule.title} onChange={e => handleChange(i, 'title', e.target.value)} />
                 </div>
                 <div className="w-24">
                    <Input label={i === 0 ? "Prix" : ""} type="number" value={rule.amount} onChange={e => handleChange(i, 'amount', e.target.value)} />
                 </div>
                 <button onClick={() => handleRemove(i)} className="p-4 text-error mb-1"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-on-surface/5">
             <Btn full icon={Save} onClick={handleSave}>Enregistrer les règles</Btn>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

// ── Analytics Screen ─────────────────────────────────────────────────────
export function AnalyticsScreen() {
  const navigate = useNavigate();
  return (
    <Layout title="Statistiques">
      <div className="max-w-4xl mx-auto space-y-10">
        <Card className="p-8">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-headline font-black text-2xl tracking-tighter">Activité Mensuelle</h3>
            <div className="p-2 bg-secondary/10 rounded-xl text-secondary"><BarChart2 size={24} /></div>
          </div>
          <div className="h-64 bg-surface-variant/20 rounded-[2rem] flex flex-col items-center justify-center border-2 border-dashed border-on-surface/5">
            <Sparkles size={48} className="text-gold mb-4 animate-pulse" />
            <p className="text-on-surface-variant font-extrabold text-lg tracking-tight">Vos données arrivent !</p>
            <p className="text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest mt-1">Calcul des statistiques en cours...</p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

// ── Settings Screen ──────────────────────────────────────────────────────
export function SettingsScreen() {
  const { family, logout, loading, updateRules } = useApp();
  const navigate = useNavigate();
  const [localRules, setLocalRules] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (family?.rules) setLocalRules(family.rules);
  }, [family]);

  const handleLogout = () => { logout(); navigate('/welcome'); };

  const handleAddRule = () => setLocalRules(prev => [...prev, { id: `new_${Date.now()}`, title: '', description: '', amount: '', active: true }]);
  const handleRemoveRule = (idx) => setLocalRules(prev => prev.filter((_, i) => i !== idx));
  const handleRuleChange = (idx, field, value) => setLocalRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleSaveRules = async () => {
    setSaving(true);
    await updateRules(localRules.filter(r => r.title.trim()));
    setSaving(false);
  };

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

        {/* Rules & Sanctions */}
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-headline font-black text-2xl tracking-tighter">Sanctions & Règles</h3>
              <p className="text-xs text-on-surface-variant font-body mt-1">Appliquables depuis l'onglet Enfants</p>
            </div>
            <Btn size="sm" icon={Plus} onClick={handleAddRule}>Ajouter</Btn>
          </div>

          <div className="space-y-3">
            {localRules.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant/50">
                <Shield size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-body">Aucune sanction définie. Ajoutez-en une !</p>
              </div>
            )}
            {localRules.map((rule, i) => (
              <div key={rule.id || i} className="flex gap-3 items-start bg-surface-container-low/50 rounded-2xl p-4 animate-fade-in">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Motif (ex: Mauvais comportement…)"
                    value={rule.title}
                    onChange={e => handleRuleChange(i, 'title', e.target.value)}
                  />
                  <Input
                    placeholder="Description (optionnel)"
                    value={rule.description || ''}
                    onChange={e => handleRuleChange(i, 'description', e.target.value)}
                  />
                </div>
                <div className="w-24 flex-shrink-0">
                  <Input
                    type="number"
                    placeholder="€"
                    min="0"
                    step="0.5"
                    value={rule.amount}
                    onChange={e => handleRuleChange(i, 'amount', e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handleRemoveRule(i)}
                  className="p-3 text-error hover:bg-error-container/30 rounded-xl transition-colors flex-shrink-0 mt-1 cursor-pointer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {localRules.length > 0 && (
            <div className="mt-6 pt-5 border-t border-on-surface/5">
              <Btn full icon={Save} loading={saving} onClick={handleSaveRules}>
                Enregistrer les sanctions
              </Btn>
            </div>
          )}
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
