import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart, Bar, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CheckCircle, ChevronRight, Clock, Edit3, Lock, LogOut, Plus, Save, Search, Shield,
  ShoppingBag, Trash2, UserPlus,
} from 'lucide-react';
import { useApp } from '../context';
import { allowanceAPI, analyticsAPI, rulesAPI } from '../api';
import { Layout } from '../components/layout';
import {
  Amount, Avatar, Badge, Btn, Card, Chip, Coin, CoinButton, ConfirmModal, EmptyState, Input, Modal,
  Select, Spinner, StatCard, StatusBadge, Switch, Textarea, ThemeToggle, euro, euroShort, formatDeadline,
} from '../components/ui';

const heading = 'font-headline font-extrabold tracking-tight';
const sectionTitle = `${heading} text-[22px]`;

const childrenOf = family => (family?.users || []).filter(u => u.role === 'CHILD');
const firstName = name => (name || '').split(' ')[0];

// Les avatars de `expense.child` ne portent pas la couleur : on la reprend de la famille.
const childAvatar = (child, size = 'sm') => (
  <Avatar letter={child?.avatar || child?.name?.charAt(0)} color={child?.color} size={size} />
);

function useCopyInvite() {
  const { family, showToast } = useApp();
  return async () => {
    try {
      await navigator.clipboard.writeText(family?.inviteCode || '');
      showToast('Code copié !');
    } catch {
      showToast('Copie impossible : recopiez le code à la main.', 'error');
    }
  };
}

function Row({ to, state, avatar, title, sub, amount, className = '' }) {
  return (
    <Link to={to} state={state} className={`flex items-center gap-3.5 min-h-[76px] px-[18px] lg:px-6 py-2.5 border-t border-outline-variant ${className}`}>
      {avatar}
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[17px]">{title}</span>
        <span className="block text-[15px] text-on-surface-variant">{sub}</span>
      </span>
      {amount && <span className={`${heading} flex-shrink-0 text-xl`}>{amount}</span>}
      <ChevronRight size={20} className="flex-shrink-0 text-on-surface-variant" aria-hidden="true" />
    </Link>
  );
}

// ── File de validation : corvées soumises et dépenses en attente ──────────
function useInbox() {
  const { family, chores, expenses } = useApp();
  const children = childrenOf(family);
  const chorePart = (chores || []).filter(c => c.status === 'SUBMITTED').map(chore => {
    const child = children.find(u => u.id === chore.assigneeId);
    return {
      key: `chore-${chore.id}`, kind: 'chore', kindLabel: 'Corvée', id: chore.id, title: chore.title, child,
      amount: `+${euroShort(chore.reward)}`, note: chore.note, proof: chore.proofImageUrl,
    };
  });
  const expensePart = (expenses || []).filter(e => e.status === 'PENDING').map(expense => {
    const child = children.find(u => u.id === expense.childId) || expense.child;
    return {
      key: `expense-${expense.id}`, kind: 'expense', kindLabel: 'Dépense', id: expense.id, title: expense.title, child,
      amount: `−${euroShort(expense.amount)}`, raw: expense.amount, note: expense.description, reference: expense.reference,
    };
  });
  return [...chorePart, ...expensePart];
}

// ── Accueil ───────────────────────────────────────────────────────────────
export function ParentDashboard() {
  const navigate = useNavigate();
  const { user, family, loading } = useApp();
  const inbox = useInbox();

  if (loading || !family) return <Layout title="Accueil"><Spinner /></Layout>;

  const children = childrenOf(family);
  const total = children.reduce((sum, c) => sum + (c.balance || 0), 0);
  const count = inbox.length;

  return (
    <Layout
      title={`Bonjour ${firstName(user?.name)}`}
      headerRight={<Btn icon={Plus} className="hidden lg:inline-flex" onClick={() => navigate('/parent/chores/new')}>Assigner une corvée</Btn>}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
        <section className="lg:flex-[3] min-w-0 bg-surface rounded-[22px] border border-outline-variant overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-[18px] lg:px-6 pt-[22px] pb-3.5">
            <h2 className={`${heading} text-2xl`}>{count === 0 ? 'Rien à valider' : `${count} demande${count > 1 ? 's' : ''} à valider`}</h2>
            {count > 0 && <Link to="/parent/inbox" className="font-bold text-[15px] text-primary py-2 flex-shrink-0">Tout voir</Link>}
          </div>
          {inbox.slice(0, 4).map(item => (
            <Row
              key={item.key}
              to="/parent/inbox"
              state={{ id: item.key }}
              avatar={childAvatar(item.child)}
              title={item.title}
              sub={`${item.kindLabel}, ${item.child?.name ?? ''}`}
              amount={item.amount}
            />
          ))}
          {count === 0 && <p className="px-[18px] lg:px-6 pb-6 text-on-surface-variant">Vos enfants n'attendent aucune réponse.</p>}
        </section>

        <aside className="lg:flex-[2] min-w-0 flex flex-col gap-4">
          <section className="px-6 py-[22px] rounded-[22px] bg-gold text-on-gold">
            <p className="font-bold text-gold-label">Trésor familial</p>
            <p className={`${heading} text-[42px] lg:text-[50px] leading-[1.05]`}>{euro(total)}</p>
          </section>

          <section className="bg-surface rounded-[22px] border border-outline-variant py-2">
            <h2 className={`${heading} text-xl px-6 py-3`}>Mes enfants</h2>
            {children.map(child => (
              <Link key={child.id} to="/parent/children" className="flex items-center gap-3 min-h-[60px] px-6 py-1.5">
                {childAvatar(child)}
                <span className="flex-1 min-w-0 font-bold text-[17px] truncate">{child.name}</span>
                <span className="font-bold text-[17px]">{euro(child.balance)}</span>
              </Link>
            ))}
            {children.length === 0 && <p className="px-6 pb-4 text-on-surface-variant">Partagez le code famille pour ajouter un enfant.</p>}
          </section>

          <Btn full variant="outline" icon={Plus} className="lg:hidden" onClick={() => navigate('/parent/chores/new')}>Assigner une corvée</Btn>
        </aside>
      </div>
    </Layout>
  );
}

// ── À valider ─────────────────────────────────────────────────────────────
function InboxDetail({ item }) {
  const { approveChore, rejectChore, approveExpense, rejectExpense } = useApp();
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(item.raw === undefined ? '' : String(item.raw));
  const [busy, setBusy] = useState(false);
  const isChore = item.kind === 'chore';

  const run = async action => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const approve = () => run(() => (isChore ? approveChore(item.id) : approveExpense(item.id, { approvedAmount: amount })));
  const refuse = () => run(() => (isChore ? rejectChore(item.id, reason) : rejectExpense(item.id, { parentNote: reason })));

  return (
    <section aria-live="polite" className="flex flex-col gap-[18px] p-5 lg:p-[26px] bg-surface rounded-[22px] border border-outline-variant">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {childAvatar(item.child)}
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-on-surface-variant">{item.kindLabel} de {item.child?.name}</p>
            <h2 className={`${heading} text-[26px] lg:text-[30px] leading-[1.1]`}>{item.title}</h2>
          </div>
        </div>
        <span className={`${heading} flex-shrink-0 text-[26px] lg:text-[32px]`}>{item.amount}</span>
      </div>

      {isChore && (item.proof
        ? <img src={item.proof} alt="Preuve" className="w-full max-h-[420px] object-cover rounded-2xl" />
        : <div className="proof-placeholder h-40 rounded-2xl flex items-center justify-center font-bold text-on-surface-variant">Aucune photo fournie</div>)}

      {item.note && <p className="px-4 py-3.5 rounded-[14px] bg-surface-container text-[17px] leading-snug">{item.note}</p>}
      {item.reference && <p className="text-[15px] text-on-surface-variant break-all">Lien : {item.reference}</p>}

      {!isChore && !refusing && (
        <div className="max-w-[220px]">
          <Input label="Montant accordé (€)" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
      )}

      {refusing && (
        <Textarea label={`Dire pourquoi à ${item.child?.name ?? "l'enfant"} (facultatif)`} value={reason} onChange={e => setReason(e.target.value)} />
      )}

      <div className="flex gap-2.5">
        <Btn variant="dangerOutline" size="lg" className="flex-1" onClick={() => setRefusing(r => !r)}>{refusing ? 'Annuler' : 'Refuser'}</Btn>
        {refusing
          ? <Btn size="lg" variant="danger" className="flex-[2]" loading={busy} onClick={refuse}>Confirmer le refus</Btn>
          : <Btn size="lg" className="flex-[2]" loading={busy} onClick={approve}>{isChore ? 'Approuver et payer' : 'Approuver'}</Btn>}
      </div>
    </section>
  );
}

export function InboxScreen() {
  const location = useLocation();
  const { family, loading } = useApp();
  const items = useInbox();
  const [selected, setSelected] = useState(location.state?.id ?? null);

  if (loading || !family) return <Layout title="À valider"><Spinner /></Layout>;

  const index = Math.max(0, items.findIndex(item => item.key === selected));
  const current = items[index];

  return (
    <Layout
      title="À valider"
      headerRight={items.length > 0 && <span className="font-bold text-[15px] text-on-surface-variant lg:hidden">{index + 1} sur {items.length}</span>}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Tout est validé"
          description="Les corvées et dépenses à valider apparaîtront ici."
          action={<Link to="/parent/expenses" className="font-bold text-primary py-3">Historique des dépenses</Link>}
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          <div className="hidden lg:flex lg:flex-[2] min-w-0 flex-col gap-2">
            {items.map((item, i) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={i === index}
                onClick={() => setSelected(item.key)}
                className={`flex items-center gap-3 min-h-[76px] px-3.5 py-2.5 rounded-2xl border-2 bg-surface text-left ${i === index ? 'border-primary' : 'border-outline-variant'}`}
              >
                {childAvatar(item.child)}
                <span className="flex-1 min-w-0">
                  <span className="block font-bold">{item.title}</span>
                  <span className="block text-[15px] text-on-surface-variant">{item.kindLabel}, {item.child?.name}</span>
                </span>
                <span className="flex-shrink-0 font-bold text-[17px]">{item.amount}</span>
              </button>
            ))}
            <Link to="/parent/expenses" className="font-bold text-[15px] text-primary py-3 px-1">Historique des dépenses</Link>
          </div>
          <div className="lg:flex-[3] min-w-0">
            {/* `key` : un nouvel élément repart d'un formulaire vierge. */}
            <InboxDetail key={current.key} item={current} />
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Corvées ───────────────────────────────────────────────────────────────
const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function ChoreColumn({ title, count, children }) {
  return (
    <section className="flex flex-col gap-2 p-[18px] bg-surface rounded-[20px] border border-outline-variant">
      <h2 className={`${heading} flex items-center justify-between text-xl mb-1.5`}>
        <span>{title}</span>
        <span className="font-body font-bold text-[15px] text-on-surface-variant">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function ChoreRow({ to, state, child, title, sub, reward }) {
  return (
    <Link to={to} state={state} className="flex items-center gap-2.5 min-h-[58px] px-2.5 py-1.5 rounded-xl bg-surface-container">
      {childAvatar(child, 'xs')}
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[15px]">{title}</span>
        <span className="block text-sm text-on-surface-variant">{sub}</span>
      </span>
      <span className="flex-shrink-0 font-bold text-[15px]">{euroShort(reward)}</span>
    </Link>
  );
}

export function ChoresList() {
  const navigate = useNavigate();
  const { chores, family, choreTemplates, updateChoreTemplate, deleteChoreTemplate, loading } = useApp();
  const [search, setSearch] = useState('');
  const [childFilter, setChildFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  if (loading || !family) return <Layout title="Corvées"><Spinner /></Layout>;

  const children = childrenOf(family);
  const childOf = id => children.find(u => u.id === id);
  const matches = item => item.title.toLowerCase().includes(search.toLowerCase()) && (childFilter === 'all' || item.assigneeId === childFilter);
  const list = (chores || []).filter(matches);
  const submitted = list.filter(c => c.status === 'SUBMITTED');
  const pending = list.filter(c => c.status === 'PENDING');
  const templates = (choreTemplates || []).filter(matches);

  return (
    <Layout title="Corvées" headerRight={<Btn icon={Plus} onClick={() => navigate('/parent/chores/new')}>Nouvelle corvée</Btn>}>
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Supprimer ce modèle"
        message={`Le modèle « ${deleting?.title} » ne créera plus de corvée.`}
        onConfirm={() => { deleteChoreTemplate(deleting.id); setDeleting(null); }}
      />

      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 basis-64">
            <Input aria-label="Rechercher une corvée" placeholder="Rechercher une corvée" prefix={<Search size={18} aria-hidden="true" />} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={childFilter === 'all'} onClick={() => setChildFilter('all')}>Tous</Chip>
            {children.map(c => <Chip key={c.id} active={childFilter === c.id} onClick={() => setChildFilter(c.id)}>{c.name}</Chip>)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px] items-start">
          <ChoreColumn title="À vérifier" count={submitted.length}>
            {submitted.map(c => <ChoreRow key={c.id} to="/parent/inbox" state={{ id: `chore-${c.id}` }} child={childOf(c.assigneeId)} title={c.title} sub={childOf(c.assigneeId)?.name} reward={c.reward} />)}
            {submitted.length === 0 && <p className="text-[15px] text-on-surface-variant py-2">Rien à valider.</p>}
          </ChoreColumn>

          <ChoreColumn title="En cours" count={pending.length}>
            {pending.map(c => <ChoreRow key={c.id} to={`/parent/chores/${c.id}`} child={childOf(c.assigneeId)} title={c.title} sub={formatDeadline(c.deadline)} reward={c.reward} />)}
            {pending.length === 0 && <p className="text-[15px] text-on-surface-variant py-2">Aucune corvée en cours.</p>}
          </ChoreColumn>

          {(choreTemplates || []).length > 0 && (
            <ChoreColumn title="Récurrentes" count={templates.length}>
              {templates.map(t => {
                const frequency = t.frequency === 'DAILY' ? 'Chaque jour' : `Chaque ${(WEEKDAYS[t.weekday] || '').toLowerCase()}`;
                return (
                  <div key={t.id} className="flex items-center gap-2 min-h-[58px] px-2.5 py-1.5 rounded-xl bg-surface-container">
                    {childAvatar(childOf(t.assigneeId), 'xs')}
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-[15px]">{t.title}</span>
                      <span className="block text-sm text-on-surface-variant">{frequency}, {euroShort(t.reward)}{!t.active && ', en pause'}</span>
                    </span>
                    <button type="button" onClick={() => updateChoreTemplate(t.id, { active: !t.active })} aria-label={`${t.active ? 'Mettre en pause' : 'Réactiver'} ${t.title}`} className="w-11 h-11 flex items-center justify-center text-on-surface-variant">
                      {t.active ? <Clock size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button type="button" onClick={() => setDeleting(t)} aria-label={`Supprimer le modèle ${t.title}`} className="w-11 h-11 flex items-center justify-center text-on-surface-variant">
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </ChoreColumn>
          )}
        </div>
      </div>
    </Layout>
  );
}

export function ChoreDetail() {
  const navigate = useNavigate();
  const { chores, family, approveChore, rejectChore, deleteChore } = useApp();
  const { choreId } = useParams();
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const chore = (chores || []).find(c => c.id === choreId);
  const back = () => navigate('/parent/chores');

  if (!chore) return <Layout title="Erreur" showBack onBack={back}><p className="text-center py-20 font-bold text-on-surface-variant">Corvée introuvable</p></Layout>;

  const child = family?.users?.find(u => u.id === chore.assigneeId);
  const isSubmitted = chore.status === 'SUBMITTED';

  const handleApprove = async () => { await approveChore(chore.id); back(); };
  const handleReject = async () => { await rejectChore(chore.id, reason); back(); };
  const handleDelete = async () => {
    setConfirmDelete(false);
    await deleteChore(chore.id);
    back();
  };

  return (
    <Layout title="Détail de la corvée" showBack onBack={back} width="max-w-4xl">
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Supprimer cette corvée"
        message={`« ${chore.title} » sera définitivement supprimée.`}
        onConfirm={handleDelete}
      />

      <div className="flex flex-col gap-[18px] p-5 lg:p-[26px] bg-surface rounded-[22px] border border-outline-variant">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <StatusBadge status={chore.status} />
            <h2 className={`${heading} text-[30px] leading-[1.1]`}>{chore.title}</h2>
          </div>
          <Coin size="lg">{euroShort(chore.reward)}</Coin>
        </div>

        <p className="text-[17px] text-on-surface-variant leading-relaxed">{chore.description || 'Aucune description fournie.'}</p>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            {childAvatar(child)}
            <div>
              <p className="text-sm text-on-surface-variant">Pour</p>
              <p className="font-bold">{child?.name}</p>
            </div>
          </div>
          {chore.deadline && (
            <div>
              <p className="text-sm text-on-surface-variant">Échéance</p>
              <p className="font-bold">{formatDeadline(chore.deadline)}</p>
            </div>
          )}
        </div>

        {isSubmitted && (
          <>
            {chore.proofImageUrl
              ? <img src={chore.proofImageUrl} alt="Preuve" className="w-full max-h-[480px] object-cover rounded-2xl" />
              : <div className="proof-placeholder h-40 rounded-2xl flex items-center justify-center font-bold text-on-surface-variant">Aucune photo fournie</div>}
            <p className="px-4 py-3.5 rounded-[14px] bg-surface-container text-[17px] leading-snug">{chore.note || 'Aucun message laissé.'}</p>
            {refusing && <Textarea label={`Dire pourquoi à ${child?.name ?? "l'enfant"} (facultatif)`} value={reason} onChange={e => setReason(e.target.value)} />}
            <div className="flex gap-2.5">
              <Btn variant="dangerOutline" size="lg" className="flex-1" onClick={() => setRefusing(r => !r)}>{refusing ? 'Annuler' : 'Refuser'}</Btn>
              {refusing
                ? <Btn variant="danger" size="lg" className="flex-[2]" onClick={handleReject}>Confirmer le refus</Btn>
                : <Btn size="lg" className="flex-[2]" onClick={handleApprove}>Approuver</Btn>}
            </div>
          </>
        )}

        {chore.status === 'REJECTED' && chore.rejectionReason && (
          <p className="px-4 py-3.5 rounded-[14px] bg-error-container text-on-error-container">Motif du refus : {chore.rejectionReason}</p>
        )}

        {!isSubmitted && (
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Btn variant="outline" icon={Edit3} onClick={() => navigate(`/parent/chores/${chore.id}/edit`)}>Modifier la tâche</Btn>
            <Btn variant="dangerGhost" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer la corvée</Btn>
          </div>
        )}
      </div>
    </Layout>
  );
}

const REWARDS = [1, 2, 5, 10, 15];
const DEADLINES = ["Aujourd'hui", 'Demain', 'Ce week-end', 'Plus tard'];

export function CreateChore() {
  const navigate = useNavigate();
  const { choreId } = useParams();
  const isEdit = !!choreId;
  const { family, chores, addChore, editChore, createChoreTemplate, loading } = useApp();
  const children = childrenOf(family);
  const existing = isEdit ? (chores || []).find(c => c.id === choreId) : null;
  const [form, setForm] = useState({ title: '', description: '', reward: '', assigneeId: '', deadline: "Aujourd'hui" });
  const [initialized, setInitialized] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [repeatForm, setRepeatForm] = useState({ frequency: 'DAILY', weekday: '1' });
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    if (isEdit && existing && !initialized) {
      setForm({
        title: existing.title || '',
        description: existing.description || '',
        reward: String(existing.reward ?? ''),
        assigneeId: existing.assigneeId || '',
        deadline: existing.deadline || "Aujourd'hui",
      });
      setInitialized(true);
    }
  }, [isEdit, existing, initialized]);

  useEffect(() => {
    if (!isEdit && children.length > 0 && !form.assigneeId) update('assigneeId', children[0].id);
  }, [children, isEdit]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.assigneeId) return;
    const reward = parseFloat(form.reward) || 0;
    if (isEdit) {
      await editChore(choreId, { ...form, reward });
    } else if (repeat) {
      await createChoreTemplate({
        title: form.title, description: form.description, reward,
        assigneeId: form.assigneeId, frequency: repeatForm.frequency, weekday: repeatForm.weekday,
      });
    } else {
      await addChore({ ...form, reward });
    }
    navigate('/parent/chores');
  };

  const title = isEdit ? 'Modifier la corvée' : 'Nouvelle corvée';
  const back = () => navigate(isEdit ? `/parent/chores/${choreId}` : '/parent/chores');

  if (loading || !family) return <Layout title={title}><Spinner /></Layout>;

  if (isEdit && !existing) {
    return <Layout title="Erreur" showBack onBack={() => navigate('/parent/chores')}><p className="text-center py-20 font-bold text-on-surface-variant">Corvée introuvable</p></Layout>;
  }

  if (!isEdit && children.length === 0) {
    return (
      <Layout title="Nouvelle corvée" showBack onBack={back}>
        <EmptyState
          icon={UserPlus}
          title="Ajoutez d'abord un enfant"
          description="Il faut au moins un enfant dans la famille pour lui assigner une corvée. Partagez le code d'invitation depuis les Paramètres."
          action={<Btn onClick={() => navigate('/parent/settings')}>Voir le code d'invitation</Btn>}
        />
      </Layout>
    );
  }

  const assignee = children.find(c => c.id === form.assigneeId);
  const deadlines = DEADLINES.includes(form.deadline) ? DEADLINES : [form.deadline, ...DEADLINES];
  const rhythm = repeatForm.frequency === 'DAILY' ? 'Chaque jour' : `Chaque ${WEEKDAYS[repeatForm.weekday].toLowerCase()}`;
  const groupLabel = 'text-base font-bold';

  return (
    <Layout title={title} showBack onBack={back} width="max-w-5xl">
      <div className="flex flex-col lg:flex-row gap-7 lg:items-start">
        <form onSubmit={handleSubmit} className="lg:flex-[3] min-w-0 flex flex-col gap-[22px] p-5 lg:p-7 bg-surface rounded-[22px] border border-outline-variant">
          <div className="flex flex-col gap-2">
            <span className={groupLabel}>Pour qui ?</span>
            <div className="flex flex-wrap gap-2">
              {children.map(child => {
                const active = child.id === form.assigneeId;
                return (
                  <button key={child.id} type="button" aria-pressed={active} onClick={() => update('assigneeId', child.id)} className={`flex items-center gap-2 min-h-[52px] pl-2 pr-4 rounded-[14px] border-2 bg-surface font-bold ${active ? 'border-primary' : 'border-outline-variant'}`}>
                    {childAvatar(child, 'xs')}
                    {child.name}
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Quoi faire ?" placeholder="ex: Ranger la cuisine" value={form.title} onChange={e => update('title', e.target.value)} required />
          <Textarea label="Détails (facultatif)" placeholder="Dites précisément ce qu'il y a à faire..." value={form.description} onChange={e => update('description', e.target.value)} />

          <div className="flex flex-col gap-2">
            <span className={groupLabel}>Récompense</span>
            <div className="flex flex-wrap items-center gap-2">
              {REWARDS.map(v => <CoinButton key={v} active={parseFloat(form.reward) === v} onClick={() => update('reward', String(v))}>{euroShort(v)}</CoinButton>)}
              <div className="w-32">
                <Input aria-label="Autre montant en euros" placeholder="Autre" type="number" min="0" step="0.1" value={form.reward} onChange={e => update('reward', e.target.value)} required />
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[14px] bg-surface-container">
              <div>
                <p className="font-bold">Répéter cette corvée</p>
                <p className="text-[15px] text-on-surface-variant">Elle revient toute seule.</p>
              </div>
              <Switch checked={repeat} onChange={setRepeat} label="Répéter cette corvée" />
            </div>
          )}

          {repeat ? (
            <div className="flex flex-col gap-2">
              <span className={groupLabel}>À quel rythme ?</span>
              <div className="flex flex-wrap gap-2">
                <Chip active={repeatForm.frequency === 'DAILY'} onClick={() => setRepeatForm(f => ({ ...f, frequency: 'DAILY' }))}>Chaque jour</Chip>
                <Chip active={repeatForm.frequency === 'WEEKLY'} onClick={() => setRepeatForm(f => ({ ...f, frequency: 'WEEKLY' }))}>Chaque semaine</Chip>
              </div>
              {repeatForm.frequency === 'WEEKLY' && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {[1, 2, 3, 4, 5, 6, 0].map(day => (
                    <Chip key={day} active={repeatForm.weekday === String(day)} aria-label={WEEKDAYS[day]} onClick={() => setRepeatForm(f => ({ ...f, weekday: String(day) }))}>{WEEKDAYS[day].slice(0, 3)}</Chip>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className={groupLabel}>Pour quand ?</span>
              <div className="flex flex-wrap gap-2">
                {deadlines.map(d => <Chip key={d} active={form.deadline === d} onClick={() => update('deadline', d)}>{formatDeadline(d)}</Chip>)}
              </div>
            </div>
          )}

          <Btn type="submit" full size="lg" icon={isEdit ? Save : undefined}>
            {isEdit ? 'Enregistrer les modifications' : repeat ? 'Créer la corvée récurrente' : `Envoyer à ${assignee?.name ?? ''}`}
          </Btn>
        </form>

        <aside className="lg:flex-[2] min-w-0 flex flex-col gap-2.5 lg:sticky lg:top-10">
          <h2 className="font-bold text-on-surface-variant">Ce que verra {assignee?.name}</h2>
          <Card sticker className="p-[18px] flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`${heading} text-2xl break-words`}>{form.title || 'Titre de la corvée'}</p>
                <p className="mt-1 text-[15px] text-on-surface-variant">{repeat ? rhythm : formatDeadline(form.deadline)}</p>
              </div>
              <Coin>+{euroShort(parseFloat(form.reward) || 0)}</Coin>
            </div>
            <div className={`${heading} flex items-center justify-center min-h-[54px] rounded-[15px] bg-primary text-on-primary text-[17px]`}>Je l'ai faite</div>
          </Card>
        </aside>
      </div>
    </Layout>
  );
}

// ── Enfants ───────────────────────────────────────────────────────────────
export function ChildrenView() {
  const navigate = useNavigate();
  const { family, loading, applyPenalty } = useApp();
  const copyInvite = useCopyInvite();
  const [sanctioned, setSanctioned] = useState(null);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [applying, setApplying] = useState(false);

  if (loading || !family) return <Layout title="Enfants"><Spinner /></Layout>;

  const children = childrenOf(family);
  const rules = (family.rules || []).filter(r => r.active !== false);
  const selectedRule = rules.find(r => r.id === selectedRuleId);

  const openSanction = child => { setSelectedRuleId(null); setSanctioned(child); };

  const handleApply = async () => {
    if (!sanctioned || !selectedRuleId) return;
    setApplying(true);
    await applyPenalty(sanctioned.id, selectedRuleId);
    setApplying(false);
    setSanctioned(null);
  };

  return (
    <Layout title="Enfants">
      <Modal
        open={!!sanctioned}
        onClose={() => setSanctioned(null)}
        title={`Sanction pour ${sanctioned?.name}`}
        footer={<Btn full size="lg" variant="danger" disabled={!selectedRuleId} loading={applying} onClick={handleApply}>{selectedRule ? `Appliquer −${euroShort(selectedRule.amount)}` : 'Appliquer'}</Btn>}
      >
        {sanctioned && (rules.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <Shield size={36} className="text-on-surface-variant mx-auto" aria-hidden="true" />
            <p className="text-on-surface-variant">Aucune règle définie.</p>
            <button type="button" onClick={() => { setSanctioned(null); navigate('/parent/rules'); }} className="font-bold text-primary py-2">Créer des règles</button>
          </div>
        ) : (
          <div className="space-y-2 pb-1">
            {rules.map(rule => {
              const active = selectedRuleId === rule.id;
              return (
                <button key={rule.id} type="button" aria-pressed={active} onClick={() => setSelectedRuleId(rule.id)} className={`w-full flex items-center justify-between gap-3 min-h-[60px] px-3.5 py-2 rounded-[14px] border-2 text-left ${active ? 'border-error bg-error-container' : 'border-outline-variant bg-surface'}`}>
                  <span className="min-w-0">
                    <span className="block font-bold">{rule.title}</span>
                    {rule.description && <span className="block text-sm text-on-surface-variant">{rule.description}</span>}
                  </span>
                  <span className="flex-shrink-0 font-bold text-error">−{euroShort(rule.amount)}</span>
                </button>
              );
            })}
            <p className="pt-2">
              {selectedRule
                ? <>Nouveau solde de {sanctioned.name} : <strong>{euro(Math.max(0, (sanctioned.balance || 0) - selectedRule.amount))}</strong></>
                : <>Solde actuel : <strong>{euro(sanctioned.balance)}</strong></>}
            </p>
          </div>
        ))}
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[18px]">
        {children.map(child => (
          <Card key={child.id} as="article" className="p-[22px] flex flex-col gap-[18px]">
            <div className="flex items-center gap-3.5">
              {childAvatar(child, 'md')}
              <div>
                <h2 className={`${heading} text-[26px]`}>{child.name}</h2>
                <p className="text-[15px] text-on-surface-variant">{child.age} ans</p>
              </div>
            </div>
            {child.settings?.frozen && <div><Badge variant="danger"><Lock size={14} aria-hidden="true" />Compte gelé</Badge></div>}
            <p className={`${heading} text-[40px] leading-none`}>{euro(child.balance)}</p>
            <div className="flex flex-col gap-2">
              <Btn full onClick={() => navigate('/parent/chores/new')}>Assigner une corvée</Btn>
              <div className="flex gap-2">
                <Btn size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/parent/children/${child.id}/settings`)}>Réglages</Btn>
                <Btn size="sm" variant="dangerOutline" className="flex-1" onClick={() => openSanction(child)}>Sanction</Btn>
              </div>
            </div>
          </Card>
        ))}

        <article className="flex flex-col justify-center gap-2.5 p-[22px] rounded-[22px] bg-primary-container text-on-primary-container">
          <h2 className={`${heading} text-[22px]`}>Ajouter un enfant</h2>
          <p className="leading-snug">Donnez-lui ce code pour créer son compte.</p>
          <p className={`${heading} text-[32px] tracking-[0.1em] break-all`}>{family.inviteCode}</p>
          <div><Btn size="sm" variant="secondary" onClick={copyInvite}>Copier le code</Btn></div>
        </article>
      </div>
    </Layout>
  );
}

function SettingsCard({ title, subtitle, children }) {
  return (
    <section className="flex flex-col gap-4 p-5 lg:p-6 bg-surface rounded-[22px] border border-outline-variant">
      <div>
        <h2 className={sectionTitle}>{title}</h2>
        {subtitle && <p className="mt-1 text-[15px] text-on-surface-variant">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const SPLIT_PARTS = [
  { key: 'splitSpendPct', label: 'Dépense', color: 'bg-gold-edge' },
  { key: 'splitSavePct', label: 'Épargne', color: 'bg-primary' },
  { key: 'splitGivePct', label: 'Don', color: 'bg-secondary' },
];

export function ChildSettingsScreen() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const { family, loading, updateChildSettings, updateAllowance, updateSplitSettings, removeChild, resetChildPassword, showToast } = useApp();
  const child = (family?.users || []).find(u => u.id === childId);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [form, setForm] = useState({ maxExpensePerRequest: '', maxExpensePerWeek: '', frozen: false });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [splitForm, setSplitForm] = useState({ splitEnabled: false, splitSavePct: '0', splitSpendPct: '100', splitGivePct: '0' });
  const [savingSplit, setSavingSplit] = useState(false);
  const [allowanceForm, setAllowanceForm] = useState({ amount: '', frequency: 'WEEKLY', active: true });
  const [allowanceInitialized, setAllowanceInitialized] = useState(false);
  const [savingAllowance, setSavingAllowance] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

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

  if (loading || !family) return <Layout title="Réglages"><Spinner /></Layout>;
  if (!child) return <Layout title="Erreur" showBack onBack={() => navigate('/parent/children')}><p className="text-center py-20 font-bold text-on-surface-variant">Enfant introuvable</p></Layout>;

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeChild(child.id);
      navigate('/parent/children', { replace: true });
    } catch (e) {
      // Le toast affiche déjà l'erreur.
    } finally {
      setRemoving(false);
    }
  };

  const saveWith = (setBusy, action) => async () => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const handleSave = saveWith(setSaving, () => updateChildSettings(child.id, form));
  const handleSaveAllowance = saveWith(setSavingAllowance, () => updateAllowance(child.id, allowanceForm));

  const handleResetPassword = async e => {
    e.preventDefault();
    const { password, confirm } = passwordForm;
    if (password.length < 6 || password.length > 72) return showToast('Le mot de passe doit contenir entre 6 et 72 caractères.', 'error');
    if (password !== confirm) return showToast('Les mots de passe ne correspondent pas.', 'error');
    setSavingPassword(true);
    try {
      await resetChildPassword(child.id, password);
      setPasswordForm({ password: '', confirm: '' });
    } catch (e) {
      // Le toast affiche déjà l'erreur.
    } finally {
      setSavingPassword(false);
    }
  };

  const pct = key => parseFloat(splitForm[key]) || 0;
  const splitTotal = SPLIT_PARTS.reduce((sum, part) => sum + pct(part.key), 0);
  const splitValid = Math.round(splitTotal) === 100;
  const stepSplit = (key, delta) => setSplitForm(f => ({ ...f, [key]: String(Math.min(100, Math.max(0, (parseFloat(f[key]) || 0) + delta))) }));
  const handleSaveSplit = async () => {
    if (!splitValid) return;
    setSavingSplit(true);
    try {
      await updateSplitSettings(child.id, splitForm);
    } finally {
      setSavingSplit(false);
    }
  };

  const stepButton = 'w-11 h-11 rounded-xl border-[1.5px] border-outline bg-surface text-[22px] leading-none';

  return (
    <Layout title={`Réglages de ${child.name}`} showBack onBack={() => navigate('/parent/children')}>
      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={`Retirer ${child.name}`}
        footer={<Btn full variant="danger" icon={Trash2} loading={removing} onClick={handleRemove}>Retirer définitivement</Btn>}
      >
        <p className="leading-relaxed pb-1">
          Le compte de <b>{child.name}</b> sera supprimé, avec son solde de <b>{euro(child.balance)}</b>, ses corvées, ses dépenses et son historique. Ses objectifs personnels seront supprimés et sa part sera retirée des objectifs communs en cours. Cette action est irréversible.
        </p>
      </Modal>

      <div className="flex items-center gap-3.5 -mt-3 mb-6">
        {childAvatar(child, 'sm')}
        <p className="text-on-surface-variant">Solde : <strong className="text-on-surface">{euro(child.balance)}</strong></p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[18px] items-start">
        <SettingsCard title="Argent de poche">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant (€)" type="number" min="0" step="0.5" value={allowanceForm.amount} onChange={e => setAllowanceForm(f => ({ ...f, amount: e.target.value }))} />
            <Select
              label="Rythme"
              value={allowanceForm.frequency}
              onChange={e => setAllowanceForm(f => ({ ...f, frequency: e.target.value }))}
              options={[{ label: 'Chaque semaine', value: 'WEEKLY' }, { label: 'Chaque mois', value: 'MONTHLY' }]}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">Versement automatique</span>
            <Switch checked={allowanceForm.active} onChange={active => setAllowanceForm(f => ({ ...f, active }))} label="Versement automatique" />
          </div>
          <Btn full icon={Save} loading={savingAllowance} onClick={handleSaveAllowance}>Enregistrer</Btn>
        </SettingsCard>

        <SettingsCard title="Répartition des gains" subtitle={`Indicative : ne limite pas ce que ${child.name} peut dépenser.`}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">Activer la répartition</span>
            <Switch checked={splitForm.splitEnabled} onChange={splitEnabled => setSplitForm(f => ({ ...f, splitEnabled }))} label="Activer la répartition" />
          </div>
          {splitForm.splitEnabled && (
            <>
              <div role="img" aria-label={SPLIT_PARTS.map(p => `${p.label} ${pct(p.key)} %`).join(', ')} className="flex gap-[3px] h-4 rounded overflow-hidden">
                {SPLIT_PARTS.filter(p => pct(p.key) > 0).map(p => <div key={p.key} className={p.color} style={{ flex: pct(p.key) }} />)}
              </div>
              {SPLIT_PARTS.map(p => (
                <div key={p.key} className="flex items-center gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded-full ${p.color}`} aria-hidden="true" />
                  <span className="flex-1 font-bold">{p.label}</span>
                  <button type="button" className={stepButton} aria-label={`Moins pour ${p.label}`} onClick={() => stepSplit(p.key, -5)}>−</button>
                  <span className="w-14 text-center font-bold text-lg">{pct(p.key)} %</span>
                  <button type="button" className={stepButton} aria-label={`Plus pour ${p.label}`} onClick={() => stepSplit(p.key, 5)}>+</button>
                </div>
              ))}
              <p className={`text-[15px] font-bold ${splitValid ? 'text-gain' : 'text-error'}`}>
                {splitValid ? 'Total : 100 %' : `Total : ${splitTotal} %, il faut arriver à 100 %`}
              </p>
            </>
          )}
          <Btn full icon={Save} loading={savingSplit} disabled={splitForm.splitEnabled && !splitValid} onClick={handleSaveSplit}>Enregistrer</Btn>
        </SettingsCard>

        <SettingsCard title="Limites de dépenses">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Par demande (€)" type="number" min="0" step="1" placeholder="Sans limite" value={form.maxExpensePerRequest} onChange={e => setForm(f => ({ ...f, maxExpensePerRequest: e.target.value }))} />
            <Input label="Par semaine (€)" type="number" min="0" step="1" placeholder="Sans limite" value={form.maxExpensePerWeek} onChange={e => setForm(f => ({ ...f, maxExpensePerWeek: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold">Geler le compte</p>
              <p className="text-[15px] text-on-surface-variant">Bloque les nouvelles demandes.</p>
            </div>
            <Switch danger checked={form.frozen} onChange={frozen => setForm(f => ({ ...f, frozen }))} label="Geler le compte" />
          </div>
          <Btn full icon={Save} loading={saving} onClick={handleSave}>Enregistrer</Btn>
        </SettingsCard>

        <SettingsCard title={`Mot de passe de ${child.name}`}>
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
            <Input label="Nouveau mot de passe" type="password" autoComplete="new-password" value={passwordForm.password} onChange={e => setPasswordForm(f => ({ ...f, password: e.target.value }))} required />
            <Input label="Confirmer le mot de passe" type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} required />
            <Btn type="submit" full variant="outline" loading={savingPassword}>Changer le mot de passe</Btn>
          </form>
          <Btn full variant="dangerGhost" icon={Trash2} onClick={() => setRemoveOpen(true)}>Retirer de la famille</Btn>
        </SettingsCard>
      </div>
    </Layout>
  );
}

// ── Règles ────────────────────────────────────────────────────────────────
function HistoryRow({ entry }) {
  return (
    <div className="flex items-center gap-3 min-h-[60px]">
      {childAvatar(entry.child)}
      <span className="flex-1 min-w-0">
        <span className="block font-semibold">{entry.description}</span>
        <span className="block text-sm text-on-surface-variant">{entry.child?.name}, {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </span>
      <Amount value={entry.amount} />
    </div>
  );
}

export function RulesScreen() {
  const { family, createRule, editRule, deleteRule, loading } = useApp();
  const [editingId, setEditingId] = useState(null); // null = pas de formulaire, 'new' = création
  const [form, setForm] = useState({ title: '', description: '', amount: '' });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    rulesAPI.getPenaltyHistory().then(res => setHistory(res.history || [])).catch(() => setHistory([]));
  }, []);

  if (loading || !family) return <Layout title="Règles de la famille"><Spinner /></Layout>;

  const rules = family.rules || [];
  const startCreate = () => { setForm({ title: '', description: '', amount: '' }); setEditingId('new'); };
  const startEdit = rule => { setForm({ title: rule.title, description: rule.description || '', amount: String(rule.amount) }); setEditingId(rule.id); };

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

  const handleDelete = async () => {
    const rule = deleting;
    setDeleting(null);
    await deleteRule(rule.id);
  };

  return (
    <Layout title="Règles de la famille" headerRight={editingId === null && <Btn icon={Plus} onClick={startCreate}>Ajouter une règle</Btn>}>
      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} title="Supprimer cette règle" message={`La règle « ${deleting?.title} » ne pourra plus être appliquée.`} onConfirm={handleDelete} />

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        <section className="lg:flex-[3] min-w-0 flex flex-col gap-2.5 p-5 lg:p-6 bg-surface rounded-[22px] border border-outline-variant">
          <h2 className={`${sectionTitle} mb-1`}>Sanctions possibles</h2>

          {editingId !== null && (
            <div className="flex flex-col gap-3 p-3.5 rounded-[14px] bg-surface-container animate-fade-in">
              <Input label="Motif" placeholder="ex: Chambre non rangée" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Input label="Description (facultatif)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <Input label="Montant (€)" type="number" min="0" step="0.5" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2.5">
                <Btn variant="outline" onClick={() => setEditingId(null)}>Annuler</Btn>
                <Btn loading={busy} onClick={handleSave}>Enregistrer</Btn>
              </div>
            </div>
          )}

          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-2 min-h-[66px] px-3.5 py-2 rounded-[14px] bg-surface-container">
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[17px]">{rule.title}</span>
                {rule.description && <span className="block text-[15px] text-on-surface-variant">{rule.description}</span>}
              </span>
              <span className={`${heading} flex-shrink-0 text-xl text-error`}>−{euroShort(rule.amount)}</span>
              <button type="button" onClick={() => startEdit(rule)} aria-label={`Modifier ${rule.title}`} className="w-11 h-11 flex-shrink-0 rounded-xl bg-surface flex items-center justify-center"><Edit3 size={18} /></button>
              <button type="button" onClick={() => setDeleting(rule)} aria-label={`Supprimer ${rule.title}`} className="w-11 h-11 flex-shrink-0 rounded-xl bg-surface flex items-center justify-center"><Trash2 size={18} /></button>
            </div>
          ))}
          {rules.length === 0 && editingId === null && <p className="py-6 text-center text-on-surface-variant">Aucune sanction définie. Ajoutez-en une !</p>}
        </section>

        <section className="lg:flex-[2] min-w-0 flex flex-col p-5 lg:p-6 bg-surface rounded-[22px] border border-outline-variant">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className={sectionTitle}>Dernières sanctions</h2>
            {history.length > 0 && <Link to="/parent/rules/history" className="font-bold text-[15px] text-primary py-2 flex-shrink-0">Tout voir</Link>}
          </div>
          {history.slice(0, 5).map(entry => <HistoryRow key={entry.id} entry={entry} />)}
          {history.length === 0 && <p className="py-2 text-on-surface-variant">Aucune sanction appliquée.</p>}
        </section>
      </div>
    </Layout>
  );
}

export function PenaltyHistoryScreen() {
  const navigate = useNavigate();
  const { loading } = useApp();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    rulesAPI.getPenaltyHistory().then(res => setHistory(res.history || [])).catch(() => setHistory([]));
  }, []);

  const back = () => navigate('/parent/rules');
  if (loading || history === null) return <Layout title="Historique" showBack onBack={back}><Spinner /></Layout>;

  return (
    <Layout title="Historique des sanctions" showBack onBack={back} width="max-w-2xl">
      {history.length === 0
        ? <EmptyState icon={Shield} title="Aucune sanction appliquée" description="L'historique apparaîtra ici dès la première sanction." />
        : <div className="bg-surface rounded-[22px] border border-outline-variant px-5 py-2">{history.map(entry => <HistoryRow key={entry.id} entry={entry} />)}</div>}
    </Layout>
  );
}

// ── Statistiques ──────────────────────────────────────────────────────────
const CATEGORY_LABELS = { ONLINE: 'En ligne', CASH: 'Liquide', OTHER: 'Autre' };
const CHART = {
  first: 'rgb(var(--primary))',
  second: 'rgb(var(--gold-edge))',
  grid: 'rgb(var(--outline-variant))',
  text: 'rgb(var(--on-surface-variant))',
};
const TOOLTIP_STYLE = {
  contentStyle: { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--outline-variant))', borderRadius: 12, color: 'rgb(var(--on-surface))' },
  cursor: { fill: 'rgb(var(--surface-container))' },
};
const AXIS = { fontSize: 13, tick: { fill: CHART.text }, stroke: CHART.grid, tickLine: false };

function Legend({ items }) {
  return (
    <div className="flex gap-3.5 text-sm text-on-surface-variant">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

function ChartCard({ title, legend, children }) {
  return (
    <Card as="section" className="p-[22px] flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`${heading} text-xl`}>{title}</h2>
        {legend && <Legend items={legend} />}
      </div>
      {children}
    </Card>
  );
}

const NoData = ({ children }) => <p className="text-center py-14 text-on-surface-variant">{children}</p>;

export function AnalyticsScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    analyticsAPI.getOverview().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <Layout title="Statistiques"><p className="text-center py-20 text-on-surface-variant">{error}</p></Layout>;
  if (!data) return <Layout title="Statistiques"><Spinner /></Layout>;

  const counts = data.choreCounts || [];
  const totalChores = counts.reduce((sum, c) => sum + c.count, 0);
  const completedChores = counts.find(c => c.status === 'COMPLETED')?.count || 0;
  const weekly = (data.weeklyCompletion || []).map(w => ({
    semaine: new Date(w.week).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    Terminées: w.completed,
    Assignées: w.total,
  }));
  const categories = (data.spendingByCategory || []).filter(c => c.total > 0).map(c => ({ name: CATEGORY_LABELS[c.category] || c.category, value: c.total }));
  const totalSpent = categories.reduce((sum, c) => sum + c.value, 0);
  const maxCategory = Math.max(1, ...categories.map(c => c.value));
  const savings = (data.savingsTrend || []).map(s => ({
    date: new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    Épargné: s.cumulative,
  }));
  const perChild = (data.perChild || []).map(c => ({ name: c.name, Gagné: c.earned, Dépensé: c.spent }));

  return (
    <Layout title="Statistiques" headerRight={<Btn size="sm" variant="outline" aria-pressed={table} onClick={() => setTable(t => !t)}>{table ? 'Voir les graphiques' : 'Voir en tableau'}</Btn>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <StatCard title="Corvées terminées" value={completedChores} sub={`sur ${totalChores} au total`} />
          <StatCard title="Total dépensé" value={euroShort(totalSpent)} sub="Dépenses approuvées" />
          <StatCard title="Total épargné" value={euroShort(savings[savings.length - 1]?.Épargné || 0)} sub="Dans les rêves" />
        </div>

        {table ? (
          <Card className="p-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className={`${heading} text-xl text-left pb-2.5`}>Corvées par semaine</caption>
              <thead>
                <tr className="border-b border-outline">
                  <th scope="col" className="text-left p-2">Semaine du</th>
                  <th scope="col" className="text-right p-2">Terminées</th>
                  <th scope="col" className="text-right p-2">Assignées</th>
                </tr>
              </thead>
              <tbody>
                {weekly.map(w => (
                  <tr key={w.semaine}>
                    <td className="p-2">{w.semaine}</td>
                    <td className="p-2 text-right">{w.Terminées}</td>
                    <td className="p-2 text-right">{w.Assignées}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {weekly.length === 0 && <NoData>Pas encore assez de données.</NoData>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Corvées par semaine" legend={[['Terminées', CHART.first], ['Assignées', CHART.second]]}>
              {weekly.length === 0 ? <NoData>Pas encore assez de données.</NoData> : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={weekly} barGap={2}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="semaine" {...AXIS} />
                    <YAxis allowDecimals={false} width={28} {...AXIS} axisLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="Terminées" fill={CHART.first} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Assignées" fill={CHART.second} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Épargne cumulée">
              {savings.length === 0 ? <NoData>Pas encore d'épargne.</NoData> : (
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={savings}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="date" {...AXIS} />
                    <YAxis width={36} {...AXIS} axisLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ stroke: CHART.grid }} />
                    <Line type="monotone" dataKey="Épargné" stroke={CHART.first} strokeWidth={2} dot={{ r: 4, fill: CHART.first }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Dépenses par catégorie">
              {categories.length === 0 ? <NoData>Aucune dépense approuvée.</NoData> : categories.map(c => (
                <div key={c.name} title={`${c.name} : ${euroShort(c.value)}`} className="flex items-center gap-2.5 min-h-[36px]">
                  <span className="flex-shrink-0 w-[72px] text-[15px] font-semibold">{c.name}</span>
                  <div className="flex-1 min-w-0">
                    <div className="h-[18px] bg-primary rounded-r" style={{ width: `${Math.round((c.value / maxCategory) * 100)}%` }} />
                  </div>
                  <span className="flex-shrink-0 w-16 text-right font-bold text-[15px]">{euroShort(c.value)}</span>
                </div>
              ))}
            </ChartCard>

            <ChartCard title="Comparaison entre enfants" legend={[['Gagné', CHART.first], ['Dépensé', CHART.second]]}>
              {perChild.length === 0 ? <NoData>Aucun enfant dans la famille.</NoData> : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={perChild} barGap={2}>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="name" {...AXIS} />
                    <YAxis width={36} {...AXIS} axisLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="Gagné" fill={CHART.first} radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Dépensé" fill={CHART.second} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── Paramètres ────────────────────────────────────────────────────────────
function SettingsRow({ to, onClick, loading, children }) {
  const className = 'w-full flex items-center justify-between gap-3 min-h-[66px] px-[22px] border-t border-outline-variant font-bold text-[17px] text-left';
  const content = <><span>{children}</span><ChevronRight size={20} className="text-on-surface-variant" aria-hidden="true" /></>;
  if (to) return <Link to={to} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} disabled={loading} className={className}>{content}</button>;
}

function PasswordConfirm({ open, onClose, title, buttonLabel, text, password, setPassword, deleting, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<Btn full variant="danger" icon={Trash2} disabled={!password} loading={deleting} onClick={onConfirm}>{buttonLabel}</Btn>}>
      <div className="space-y-4 pb-1">
        <p className="leading-relaxed">{text}</p>
        <Input label="Confirme avec ton mot de passe" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
    </Modal>
  );
}

export function SettingsScreen() {
  const { user, family, logout, loading, deleteFamily, deleteAccount, giveConsent, exportData, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const copyInvite = useCopyInvite();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const closeAll = () => { setDeleteOpen(false); setAccountOpen(false); setPassword(''); };

  const handleExport = async () => {
    setExporting(true);
    await exportData();
    setExporting(false);
  };

  const confirmWith = action => async () => {
    setDeleting(true);
    try {
      await action(password);
      navigate('/welcome', { replace: true });
    } catch (e) {
      // Le toast affiche déjà l'erreur ; la fenêtre reste ouverte pour réessayer.
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !family) return <Layout title="Paramètres"><Spinner /></Layout>;

  return (
    <Layout title="Paramètres" width="max-w-3xl">
      <PasswordConfirm
        open={deleteOpen}
        onClose={closeAll}
        title="Supprimer la famille"
        buttonLabel="Supprimer définitivement"
        text={`Tous les comptes de ${family.name} seront supprimés, avec les soldes, corvées, objectifs et l'historique. Cette action est irréversible.`}
        password={password}
        setPassword={setPassword}
        deleting={deleting}
        onConfirm={confirmWith(deleteFamily)}
      />
      <PasswordConfirm
        open={accountOpen}
        onClose={closeAll}
        title="Supprimer mon compte"
        buttonLabel="Supprimer mon compte"
        text="Ton compte parent sera supprimé. La famille et les comptes des enfants restent gérés par l'autre parent. Si tu es le seul parent, supprime plutôt la famille."
        password={password}
        setPassword={setPassword}
        deleting={deleting}
        onConfirm={confirmWith(deleteAccount)}
      />

      <div className="flex flex-col gap-[18px]">
        <section className="flex flex-wrap items-center justify-between gap-[18px] p-6 rounded-[22px] bg-hero text-white on-dark-field">
          <div>
            <h2 className={`${heading} text-2xl`}>{family.name}</h2>
            <p className="mt-1">Code à donner aux enfants et à l'autre parent</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${heading} text-[30px] tracking-[0.1em] text-gold select-all`}>{family.inviteCode}</span>
            <button type="button" onClick={copyInvite} className="min-h-[46px] px-4 rounded-[13px] bg-white text-[#1A1640] font-bold text-[15px]">Copier</button>
          </div>
        </section>

        {!user?.parentalConsentAt && (
          <section className="flex flex-col gap-3 p-5 rounded-[22px] bg-primary-container text-on-primary-container">
            <p>Tes enfants ne pourront créer leur compte qu'après ton accord sur le traitement de leurs données et sur les <Link to="/terms" className="font-bold underline">conditions</Link>.</p>
            <Btn full icon={CheckCircle} onClick={giveConsent}>Donner mon consentement parental</Btn>
          </section>
        )}

        <section className="bg-surface rounded-[22px] border border-outline-variant overflow-hidden">
          <div className="flex items-center justify-between gap-3 min-h-[66px] px-[22px] font-bold text-[17px]">
            <span>Mode sombre</span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <SettingsRow to="/parent/rules">Règles et sanctions</SettingsRow>
          <SettingsRow to="/parent/analytics">Statistiques</SettingsRow>
          <SettingsRow onClick={handleExport} loading={exporting}>Exporter les données de la famille</SettingsRow>
          <SettingsRow to="/privacy">Confidentialité</SettingsRow>
          <SettingsRow to="/terms">Conditions d'utilisation</SettingsRow>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-2.5">
          <Btn variant="outline" icon={LogOut} onClick={() => { logout(); navigate('/welcome'); }}>Se déconnecter</Btn>
          <div className="flex flex-wrap gap-1">
            <Btn size="sm" variant="dangerGhost" onClick={() => setAccountOpen(true)}>Supprimer mon compte</Btn>
            <Btn size="sm" variant="dangerGhost" onClick={() => setDeleteOpen(true)}>Supprimer la famille</Btn>
          </div>
        </section>
      </div>
    </Layout>
  );
}

// ── Historique et revue des dépenses ──────────────────────────────────────
export function ExpensesReview() {
  const navigate = useNavigate();
  const { family, expenses, loading, approveExpense, rejectExpense } = useApp();
  const [approving, setApproving] = useState(null);
  const [refusing, setRefusing] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const back = () => navigate('/parent/inbox');

  if (loading || !family) return <Layout title="Dépenses" showBack onBack={back}><Spinner /></Layout>;

  const pending = (expenses || []).filter(e => e.status === 'PENDING');
  const resolved = (expenses || []).filter(e => e.status !== 'PENDING');
  const openApprove = expense => { setAmount(String(expense.amount)); setApproving(expense); };
  const openRefuse = expense => { setReason(''); setRefusing(expense); };

  const handleApprove = async () => {
    setBusy(true);
    await approveExpense(approving.id, { approvedAmount: amount });
    setBusy(false);
    setApproving(null);
  };

  const handleRefuse = async () => {
    setBusy(true);
    await rejectExpense(refusing.id, { parentNote: reason });
    setBusy(false);
    setRefusing(null);
  };

  return (
    <Layout title="Dépenses" showBack onBack={back} width="max-w-3xl">
      <Modal open={!!approving} onClose={() => setApproving(null)} title={`Approuver « ${approving?.title} »`} footer={<Btn full size="lg" loading={busy} onClick={handleApprove}>Approuver{amount ? ` ${euroShort(parseFloat(amount))}` : ''}</Btn>}>
        {approving && (
          <div className="space-y-4 pb-1">
            <p className="text-on-surface-variant">Demande de <b>{approving.child?.name}</b> : {approving.description || 'aucune description'}</p>
            <Input label="Montant accordé (€)" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        )}
      </Modal>

      <Modal open={!!refusing} onClose={() => setRefusing(null)} title={`Refuser « ${refusing?.title} »`} footer={<Btn full size="lg" variant="danger" loading={busy} onClick={handleRefuse}>Confirmer le refus</Btn>}>
        <div className="pb-1"><Textarea label="Dire pourquoi (facultatif)" value={reason} onChange={e => setReason(e.target.value)} /></div>
      </Modal>

      <div className="space-y-8">
        <section>
          <h2 className={`${sectionTitle} mb-3`}>À traiter ({pending.length})</h2>
          {pending.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Rien à traiter" description="Aucune demande de dépense en attente." />
          ) : (
            <div className="space-y-2.5">
              {pending.map(expense => (
                <Card key={expense.id} as="article" className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {childAvatar(expense.child)}
                    <div className="min-w-0">
                      <p className="font-bold">{expense.title}</p>
                      <p className="text-[15px] text-on-surface-variant">{expense.child?.name}, {euroShort(expense.amount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Btn size="sm" variant="dangerOutline" onClick={() => openRefuse(expense)}>Refuser</Btn>
                    <Btn size="sm" onClick={() => openApprove(expense)}>Approuver</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {resolved.length > 0 && (
          <section>
            <h2 className={`${sectionTitle} mb-3`}>Historique</h2>
            <div className="space-y-2">
              {resolved.map(expense => (
                <Card key={expense.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{expense.title}</p>
                    <p className="text-[15px] text-on-surface-variant">{expense.child?.name}, {euroShort(expense.approvedAmount ?? expense.amount)}</p>
                  </div>
                  <StatusBadge status={expense.status} />
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
