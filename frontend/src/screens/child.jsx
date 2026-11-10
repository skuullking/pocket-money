import React, { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Camera, Check, ChevronRight, Clock, ListChecks, Lock, LogOut, ShoppingBag, Target, Trophy, Wallet, Zap } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import { useApp } from '../context';
import { compressProofImage } from '../proofImage';
import { Layout } from '../components/layout';
import {
  Amount, Avatar, BigCoin, Btn, Card, Chip, Coin, CoinButton, CoinRow, CoinStack, EmptyState, Input,
  Modal, Segmented, Spinner, StatusBadge, Textarea, ThemeToggle, euro, euroShort, formatDeadline,
} from '../components/ui';

const formatDate = date => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

const myGoalsOf = (goals, user) => (goals || []).filter(g => g.participants?.some(p => p.childId === user.id) || g.childId === user.id);

const heading = 'font-headline font-extrabold tracking-tight';

// ── Accueil ───────────────────────────────────────────────────────────────
export function ChildDashboard() {
  const { user, chores, goals, loading } = useApp();
  const animBalance = useCountUp(user?.balance ?? 0, 900);

  if (loading || !user) return <Layout title="Chargement..."><Spinner /></Layout>;

  const mine = (chores || []).filter(c => c.assigneeId === user.id);
  const todo = mine.filter(c => c.status === 'PENDING' || c.status === 'REJECTED');
  const next = todo.find(c => c.status === 'PENDING') || todo[0];
  const waiting = mine.find(c => c.status === 'SUBMITTED');
  const goal = myGoalsOf(goals, user)[0];
  const monthDelta = user.monthDelta;

  return (
    <Layout title={`Salut ${user.name} !`} bare>
      <header className="relative bg-hero text-white px-5 pt-5 pb-[70px] overflow-hidden on-dark-field">
        <div aria-hidden="true" className="absolute -left-12 top-28 w-32 h-32 rounded-full border-[14px] border-white/10" />
        <div aria-hidden="true" className="absolute -right-8 top-10 w-24 h-24 rounded-full border-[12px] border-white/10" />
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-[22px]">
          <div className="w-full flex items-center gap-3">
            <Avatar letter={user.avatar || user.name.charAt(0)} color="#FFFFFF" size="sm" />
            <h1 className={`${heading} text-[26px]`}>Salut {user.name} !</h1>
          </div>
          <BigCoin label="Mon trésor" value={euro(animBalance)} />
          {typeof monthDelta === 'number' && monthDelta !== 0 && (
            <div className={`flex items-center gap-1.5 px-3.5 py-[7px] rounded-full bg-white font-bold text-[15px] ${monthDelta > 0 ? 'text-[#0A6B4B]' : 'text-[#A32C13]'}`}>
              {monthDelta > 0 ? <ArrowUpRight size={16} strokeWidth={2.6} aria-hidden="true" /> : <ArrowDownRight size={16} strokeWidth={2.6} aria-hidden="true" />}
              <span>{monthDelta > 0 ? '+' : '−'}{euroShort(Math.abs(monthDelta))} ce mois-ci</span>
            </div>
          )}
        </div>
      </header>

      <div className="relative max-w-2xl mx-auto px-4 -mt-[46px] flex flex-col gap-4">
        {next ? (
          <Card sticker as="section" className="p-[18px] flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-on-surface-variant">{next.status === 'REJECTED' ? 'À refaire' : 'Ta prochaine quête'}</span>
              <Link to="/child/available-chores" className="text-sm font-bold text-primary py-1.5">
                {todo.length > 1 ? `Voir les ${todo.length}` : 'Mes quêtes'}
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className={`${heading} text-2xl`}>{next.title}</h2>
                {next.deadline && <p className="mt-1 text-[15px] text-on-surface-variant">{formatDeadline(next.deadline)}</p>}
              </div>
              <Coin>+{euroShort(next.reward)}</Coin>
            </div>
            <Link to={`/child/submit-chore/${next.id}`} className={`${heading} flex items-center justify-center min-h-[56px] rounded-2xl bg-primary text-on-primary shadow-press text-lg active:translate-y-1 active:shadow-none transition-all`}>
              Je l'ai faite
            </Link>
          </Card>
        ) : (
          <Card sticker as="section" className="p-6 text-center">
            <p className={`${heading} text-xl`}>Toutes les quêtes sont finies !</p>
          </Card>
        )}

        {waiting && (
          <Link to="/child/available-chores" className="flex items-center gap-3 px-3.5 py-3 min-h-[48px] rounded-2xl bg-primary-container text-on-primary-container">
            <Clock size={22} strokeWidth={2.2} aria-hidden="true" />
            <span className="flex-1 text-[15px] font-semibold">{waiting.title} : tes parents vérifient</span>
            <span className="font-bold text-[15px]">+{euroShort(waiting.reward)}</span>
          </Link>
        )}

        {goal && (
          <Link to="/child/goals">
            <Card sticker as="section" className="p-[18px] flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={`${heading} text-xl`}>{goal.title}</h2>
                <span className="text-[15px] font-bold text-on-surface-variant">{Math.min(100, Math.round((goal.current / goal.target) * 100))} %</span>
              </div>
              <CoinRow value={goal.current} max={goal.target} />
              <p className="text-[15px] text-on-surface-variant">
                {goal.current >= goal.target
                  ? 'Rêve atteint, bravo !'
                  : <>Encore <strong className="text-on-surface">{euro(goal.target - goal.current)}</strong> et c'est à toi.</>}
              </p>
            </Card>
          </Link>
        )}
      </div>
    </Layout>
  );
}

// ── Quêtes ────────────────────────────────────────────────────────────────
const QUEST_TABS = [
  { value: 'todo', label: 'À faire' },
  { value: 'sent', label: 'Envoyées' },
  { value: 'done', label: 'Gagnées' },
];

function QuestBoard({ initialTab }) {
  const { user, chores, loading } = useApp();
  const [tab, setTab] = useState(initialTab);

  if (loading || !user) return <Layout title="Mes quêtes"><Spinner /></Layout>;

  const mine = (chores || []).filter(c => c.assigneeId === user.id);
  const rejected = mine.filter(c => c.status === 'REJECTED');
  const pending = mine.filter(c => c.status === 'PENDING');
  const sent = mine.filter(c => c.status === 'SUBMITTED');
  const done = mine.filter(c => c.status === 'COMPLETED');

  return (
    <Layout title="Mes quêtes">
      <div className="space-y-[18px]">
        <Segmented label="Filtrer mes quêtes" options={QUEST_TABS} value={tab} onChange={setTab} />

        {tab === 'todo' && (
          <div className="flex flex-col gap-3">
            {rejected.map(chore => (
              <div key={chore.id} className="flex flex-col gap-2.5 p-3.5 rounded-[18px] bg-error-container text-on-error-container">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">À refaire</span>
                  <span className="font-bold text-[15px]">+{euroShort(chore.reward)}</span>
                </div>
                <h2 className={`${heading} text-xl`}>{chore.title}</h2>
                <p className="text-[15px] leading-snug">
                  {chore.rejectionReason ? `Message de tes parents : « ${chore.rejectionReason} »` : 'Tes parents te demandent de la refaire.'}
                </p>
                <Link to={`/child/submit-chore/${chore.id}`} className="flex items-center justify-center min-h-[48px] rounded-[14px] bg-secondary text-on-secondary font-bold">
                  Réessayer
                </Link>
              </div>
            ))}
            {pending.map(chore => (
              <Link key={chore.id} to={`/child/submit-chore/${chore.id}`}>
                <Card sticker className="flex items-center gap-3 p-4">
                  <span className="flex-1 min-w-0">
                    <span className={`${heading} block text-xl`}>{chore.title}</span>
                    {chore.deadline && <span className="block mt-1 text-[15px] text-on-surface-variant">{formatDeadline(chore.deadline)}</span>}
                  </span>
                  <Coin size="sm">+{euroShort(chore.reward)}</Coin>
                </Card>
              </Link>
            ))}
            {rejected.length + pending.length === 0 && (
              <EmptyState icon={Trophy} title="Héros au repos !" description="Tu as fini toutes tes quêtes." />
            )}
          </div>
        )}

        {tab === 'sent' && (
          <div className="flex flex-col gap-3">
            {sent.map(chore => (
              <div key={chore.id} className="flex flex-col gap-1.5 p-[18px] rounded-[20px] bg-primary-container text-on-primary-container">
                <h2 className={`${heading} text-xl`}>{chore.title}</h2>
                <p className="text-[15px] leading-snug">Tes parents regardent ta photo. Tu gagneras {euroShort(chore.reward)} dès qu'ils auront validé.</p>
              </div>
            ))}
            {sent.length === 0 && <EmptyState icon={Clock} title="Rien en attente" description="Les quêtes envoyées à tes parents apparaîtront ici." />}
          </div>
        )}

        {tab === 'done' && (
          <div className="flex flex-col gap-2">
            {done.map(chore => (
              <div key={chore.id} className="flex items-center gap-3 px-4 py-3.5 rounded-[18px] bg-surface">
                <span className="w-9 h-9 flex-shrink-0 rounded-full bg-gain-container text-gain flex items-center justify-center">
                  <Check size={20} strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0 font-bold">{chore.title}</span>
                <span className="font-bold text-gain">+{euroShort(chore.reward)}</span>
              </div>
            ))}
            {done.length === 0 && <EmptyState icon={ListChecks} title="Aucun exploit" description="C'est le moment de commencer ta première quête !" />}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const AvailableChores = () => <QuestBoard initialTab="todo" />;
export const MyChores = () => <QuestBoard initialTab="done" />;

// ── Valider une quête ─────────────────────────────────────────────────────
function StepTitle({ number, children }) {
  return (
    <h2 className={`${heading} flex items-center gap-2.5 text-xl`}>
      <span className="w-[30px] h-[30px] rounded-full bg-secondary text-on-secondary flex items-center justify-center text-base">{number}</span>
      {children}
    </h2>
  );
}

export function SubmitChore() {
  const navigate = useNavigate();
  const { choreId } = useParams();
  const { chores, submitChore, showToast } = useApp();
  const chore = (chores || []).find(c => c.id === choreId);
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef();
  const back = () => navigate('/child/available-chores');

  if (!chore) return <Layout title="Erreur" showBack onBack={() => navigate('/child')}><p className="text-center py-20 font-bold">Corvée non trouvée</p></Layout>;

  const handleFile = async e => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;
    setIsSubmitting(true);
    try {
      setPhoto(await compressProofImage(file));
    } catch (error) {
      showToast("Cette photo n'a pas pu être préparée. Essaie avec une autre.", 'error');
    } finally {
      input.value = '';
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!photo) return;
    setIsSubmitting(true);
    try {
      await submitChore(chore.id, { note, proofImageUrl: photo });
      navigate('/child');
    } catch (e) {
      console.error('Submission failed', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Valider ma quête" showBack onBack={back}>
      <div className="space-y-[18px]">
        <section className="flex items-center justify-between gap-3 p-5 rounded-[22px] bg-hero text-white">
          <div className="min-w-0">
            <h2 className={`${heading} text-[30px] leading-[1.05]`}>{chore.title}</h2>
            {chore.description && <p className="mt-1.5 text-[15px] leading-snug">{chore.description}</p>}
          </div>
          <Coin size="lg" className="shadow-press">+{euroShort(chore.reward)}</Coin>
        </section>

        {chore.status === 'REJECTED' && chore.rejectionReason && (
          <p className="p-3.5 rounded-[14px] bg-error-container text-on-error-container text-[15px] leading-snug">
            Message de tes parents : « {chore.rejectionReason} »
          </p>
        )}

        <section className="space-y-3">
          <StepTitle number={1}>Montre ta réussite</StepTitle>
          {photo ? (
            <div className="relative rounded-[22px] overflow-hidden border-2 border-line">
              <img src={photo} alt="Ma réussite" className="w-full h-[250px] object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="Retirer la photo" className="absolute right-3 bottom-3 min-h-[44px] px-4 rounded-xl bg-[#1A1640] text-white font-bold text-[15px]">
                Reprendre
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-[250px] flex flex-col items-center justify-center gap-3 rounded-[22px] border-[3px] border-dashed border-primary bg-surface">
              <span className="w-[72px] h-[72px] rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
                <Camera size={34} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className={`${heading} text-xl`}>Prendre une photo</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-label="Photo de la quête" />
        </section>

        <section className="space-y-3">
          <StepTitle number={2}>Un mot pour tes parents ?</StepTitle>
          <Textarea aria-label="Ton message, facultatif" placeholder="ex: J'ai tout rangé avec soin !" value={note} onChange={e => setNote(e.target.value)} />
        </section>

        <div className="space-y-2.5 pt-2">
          {!photo && <p className="text-center text-[15px] text-on-surface-variant">Ajoute une photo pour pouvoir envoyer.</p>}
          <Btn full size="lg" variant="gold" loading={isSubmitting} disabled={!photo} onClick={handleSubmit}>Envoyer à mes parents</Btn>
        </div>
      </div>
    </Layout>
  );
}

// ── Rêves ─────────────────────────────────────────────────────────────────
const COIN_AMOUNTS = [1, 2, 5, 10];

export function GoalsScreen() {
  const { goals, user, loading, fundGoal, withdrawFromGoal } = useApp();
  const [sheet, setSheet] = useState(null); // { goal, mode: 'fund' | 'withdraw' }
  const [amount, setAmount] = useState('');

  if (loading || !user) return <Layout title="Mes rêves"><Spinner /></Layout>;

  const myGoals = goals || [];
  const open = (goal, mode) => { setAmount(''); setSheet({ goal, mode }); };
  const close = () => setSheet(null);
  const funding = sheet?.mode === 'fund';
  const value = parseFloat(amount) || 0;

  const confirm = () => {
    const { goal } = sheet;
    (funding ? fundGoal : withdrawFromGoal)(goal.id, amount);
    close();
  };

  return (
    <Layout title="Mes rêves">
      <Modal
        open={!!sheet}
        onClose={close}
        title={funding ? 'Combien de pièces ?' : 'Combien reprendre ?'}
        footer={
          <Btn full size="lg" disabled={amount === ''} onClick={confirm}>
            {funding ? 'Mettre de côté' : 'Reprendre'}{value > 0 ? ` ${euroShort(value)}` : ''}
          </Btn>
        }
      >
        <div className="space-y-4 pb-1">
          <div className="flex justify-between">
            {COIN_AMOUNTS.map(v => (
              <CoinButton key={v} active={value === v} onClick={() => setAmount(String(v))}>{euroShort(v)}</CoinButton>
            ))}
          </div>
          <Input label="Autre montant (€)" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          <p className="text-center text-base text-on-surface-variant">
            {funding
              ? <>Il te restera <strong className="text-on-surface">{euro(Math.max(0, (user.balance || 0) - value))}</strong> à dépenser</>
              : <>Déjà de côté : <strong className="text-on-surface">{euro(sheet?.goal.current)}</strong></>}
          </p>
        </div>
      </Modal>

      <p className="-mt-4 mb-5 text-base text-on-surface-variant">Empile tes pièces jusqu'en haut.</p>

      <div className="flex flex-col gap-4">
        {myGoals.map(goal => {
          const locked = goal.status === 'COMPLETED';
          const reached = goal.current >= goal.target;
          return (
            <Card key={goal.id} sticker as="article" className="p-[18px] flex flex-col gap-4">
              <div className="flex gap-[18px] items-end">
                <CoinStack value={goal.current} max={goal.target} />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-sm font-bold text-on-surface-variant">{goal.isShared ? 'Rêve partagé' : 'Rêve perso'}</span>
                  <h2 className={`${heading} text-2xl leading-[1.05]`}><span aria-hidden="true">{goal.icon} </span><span>{goal.title}</span></h2>
                  <p className={`${heading} mt-1.5 text-[22px]`}>
                    {euroShort(goal.current)} <span className="font-body font-medium text-base text-on-surface-variant">sur {euroShort(goal.target)}</span>
                  </p>
                  <p className={`text-[15px] font-semibold ${reached ? 'text-gain' : 'text-on-surface-variant'}`}>
                    {reached ? 'Rêve atteint, bravo !' : `Encore ${euro(goal.target - goal.current)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Btn variant="gold" className="flex-1" disabled={locked} onClick={() => open(goal, 'fund')}>Ajouter des pièces</Btn>
                <Btn variant="outline" disabled={!goal.current || locked} onClick={() => open(goal, 'withdraw')}>Retirer</Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {myGoals.length === 0 && <EmptyState icon={Target} title="C'est le moment de rêver" description="Quel sera ton prochain grand projet ?" />}
    </Layout>
  );
}

// ── Demande de dépense ────────────────────────────────────────────────────
const EXPENSE_TYPES = [
  { value: 'ONLINE', label: 'En ligne' },
  { value: 'CASH', label: 'Liquide' },
  { value: 'OTHER', label: 'Autre' },
];
const EMPTY_EXPENSE = { title: '', description: '', amount: '', expenseType: 'ONLINE', reference: '' };

function ExpenseSheet({ open, onClose }) {
  const { user, requestExpense } = useApp();
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [busy, setBusy] = useState(false);
  const frozen = !!user?.settings?.frozen;

  const handleSubmit = async e => {
    e.preventDefault();
    if (frozen || !form.title || !form.amount) return;
    setBusy(true);
    try {
      await requestExpense({ ...form, amount: parseFloat(form.amount) || 0 });
      setForm(EMPTY_EXPENSE);
      onClose();
    } catch {
      // requestExpense a déjà affiché le refus : le formulaire reste ouvert.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Que veux-tu acheter ?" footer={<Btn full size="lg" loading={busy} onClick={handleSubmit}>Envoyer la demande</Btn>}>
      <form className="space-y-4 pb-1" onSubmit={handleSubmit}>
        <Input label="Quoi ?" placeholder="ex: Livre Harry Potter" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <Input label="Combien (€) ?" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] font-bold">Comment ?</span>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_TYPES.map(t => (
              <Chip key={t.value} active={form.expenseType === t.value} onClick={() => setForm(f => ({ ...f, expenseType: t.value }))}>{t.label}</Chip>
            ))}
          </div>
        </div>
        <Textarea label="Pourquoi ? (facultatif)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Input label="Lien ou référence (facultatif)" placeholder="ex: amazon.fr/..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
      </form>
    </Modal>
  );
}

function FrozenNotice() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-[18px] bg-error-container text-on-error-container">
      <Lock size={22} className="flex-shrink-0" aria-hidden="true" />
      <p className="text-[15px] font-semibold">Ton compte est gelé par un parent : impossible de faire une nouvelle demande pour le moment.</p>
    </div>
  );
}

function ExpenseRow({ expense }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5 rounded-[18px] bg-surface">
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-bold">{expense.title}</span>
        <span className="flex-shrink-0 font-bold">{euroShort(expense.approvedAmount ?? expense.amount)}</span>
      </div>
      <div><StatusBadge status={expense.status} /></div>
      {expense.parentNote && <p className="text-[15px] leading-snug text-on-surface-variant">{expense.parentNote}</p>}
    </div>
  );
}

// ── Trésor ────────────────────────────────────────────────────────────────
export function BalanceScreen() {
  const { user, transactions, expenses, loading } = useApp();
  const [requesting, setRequesting] = useState(false);

  if (loading || !user) return <Layout title="Mon trésor"><Spinner /></Layout>;

  const history = transactions || [];
  const requests = (expenses || []).slice(0, 3);
  const frozen = !!user.settings?.frozen;
  const parts = [
    { label: 'Dépense', value: user.spendBalance ?? 0, color: 'bg-gold' },
    { label: 'Épargne', value: user.saveBalance ?? 0, color: 'bg-[#8E7CFF]' },
    { label: 'Don', value: user.giveBalance ?? 0, color: 'bg-white' },
  ];
  const total = parts.reduce((sum, p) => sum + p.value, 0);

  return (
    <Layout title="Mon trésor" bare>
      <ExpenseSheet open={requesting} onClose={() => setRequesting(false)} />
      <header className="bg-[#1A1640] text-white px-5 pt-6 pb-[22px] on-dark-field">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <h1 className="text-base font-semibold">Mon trésor</h1>
          <p className={`${heading} text-[60px] leading-none text-gold`}>{euro(user.balance)}</p>
          {user.settings?.splitEnabled && (
            <>
              {total > 0 && (
                <div role="img" aria-label={parts.map(p => `${p.label} ${euro(p.value)}`).join(', ')} className="flex gap-[3px] h-3 rounded-md overflow-hidden">
                  {parts.filter(p => p.value > 0).map(p => <div key={p.label} className={p.color} style={{ flex: p.value }} />)}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {parts.map(p => (
                  <div key={p.label}>
                    <p className="text-sm text-[#D9D5F2]">{p.label}</p>
                    <p className="font-bold text-[17px]">{euro(p.value)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-[18px] flex flex-col gap-[22px]">
        {frozen && <FrozenNotice />}
        <Btn full size="lg" variant="gold" icon={ShoppingBag} disabled={frozen} onClick={() => setRequesting(true)}>Demander à dépenser</Btn>

        {requests.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className={`${heading} text-[22px]`}>Mes demandes</h2>
              <Link to="/child/expenses" className="text-[15px] font-bold text-primary py-2">Tout voir</Link>
            </div>
            {requests.map(expense => <ExpenseRow key={expense.id} expense={expense} />)}
          </section>
        )}

        <section className="flex flex-col gap-0.5">
          <h2 className={`${heading} text-[22px] mb-2`}>Dernières pièces</h2>
          {history.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 min-h-[44px]">
              <span className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${t.amount >= 0 ? 'bg-gain-container text-gain' : 'bg-error-container text-error'}`}>
                {t.amount >= 0 ? <ArrowUpRight size={18} strokeWidth={2.6} aria-hidden="true" /> : <ArrowDownRight size={18} strokeWidth={2.6} aria-hidden="true" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{t.description}</span>
                <span className="block text-sm text-on-surface-variant">{formatDate(t.date)}</span>
              </span>
              <Amount value={t.amount} />
            </div>
          ))}
          {history.length === 0 && <EmptyState icon={Wallet} title="Tirelire vide" description="Pas encore de transactions." />}
        </section>
      </div>
    </Layout>
  );
}

export function ExpensesScreen() {
  const navigate = useNavigate();
  const { user, expenses, loading } = useApp();
  const [requesting, setRequesting] = useState(false);

  if (loading || !user) return <Layout title="Mes demandes"><Spinner /></Layout>;

  const list = expenses || [];
  const frozen = !!user.settings?.frozen;
  const ask = () => setRequesting(true);

  return (
    <Layout title="Mes demandes" showBack onBack={() => navigate('/child/balance')} headerRight={<Btn size="sm" disabled={frozen} onClick={ask}>Demander</Btn>}>
      <ExpenseSheet open={requesting} onClose={() => setRequesting(false)} />
      <div className="flex flex-col gap-2.5">
        {frozen && <FrozenNotice />}
        {list.length === 0 && (
          <EmptyState icon={ShoppingBag} title="Aucune demande" description="Envie de quelque chose ? Demande à tes parents." action={!frozen && <Btn onClick={ask}>Faire une demande</Btn>} />
        )}
        {list.map(expense => <ExpenseRow key={expense.id} expense={expense} />)}
      </div>
    </Layout>
  );
}

// ── Moi ───────────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, family, logout, loading, theme, toggleTheme } = useApp();

  if (loading || !user) return <Layout title="Moi"><Spinner /></Layout>;

  const rows = [
    { to: '/child/my-chores', label: 'Mes quêtes gagnées', Icon: Zap },
    { to: '/child/expenses', label: 'Mes demandes de dépense', Icon: ShoppingBag },
  ];

  return (
    <Layout title="Moi" bare>
      <div className="max-w-2xl mx-auto px-4 pt-10">
        <header className="flex flex-col items-center gap-3 mb-[26px]">
          <div className="coin-ridge w-[124px] h-[124px] rounded-full flex items-center justify-center shadow-press-lg">
            <div className="w-[104px] h-[104px] rounded-full bg-surface text-[52px] flex items-center justify-center font-headline font-extrabold">{user.avatar || user.name.charAt(0)}</div>
          </div>
          <h1 className={`${heading} mt-2 text-[34px]`}>{user.name}</h1>
          {family?.name && <p className="text-on-surface-variant">{family.name}</p>}
        </header>

        <nav aria-label="Mon espace" className="bg-surface border-2 border-line rounded-[22px] overflow-hidden">
          {rows.map(({ to, label, Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 min-h-[64px] px-[18px] font-bold text-[17px] border-b border-outline-variant">
              <Icon size={22} strokeWidth={2.2} className="text-primary" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={20} className="text-on-surface-variant" aria-hidden="true" />
            </Link>
          ))}
          <div className="flex items-center justify-between gap-3 min-h-[64px] px-[18px] font-bold text-[17px]">
            <span>Mode sombre</span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </nav>

        <Btn full variant="dangerGhost" icon={LogOut} className="mt-3" onClick={() => { logout(); navigate('/welcome'); }}>Quitter PocketMoney</Btn>
      </div>
    </Layout>
  );
}
