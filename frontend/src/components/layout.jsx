import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, ChevronLeft, Home, Inbox, ListChecks, Settings, Shield, SlidersHorizontal,
  Target, User, Users, Wallet, Zap,
} from 'lucide-react';
import { useApp } from '../context';
import { Avatar, Toast, ThemeToggle } from './ui';

const PARENT_NAV = [
  { path: '/parent', label: 'Accueil', Icon: Home, exact: true },
  { path: '/parent/inbox', label: 'À valider', Icon: Inbox, also: ['/parent/expenses'], badge: true },
  { path: '/parent/chores', label: 'Corvées', Icon: ListChecks },
  { path: '/parent/children', label: 'Enfants', Icon: Users },
  { path: '/parent/rules', label: 'Règles', Icon: Shield, desktopOnly: true },
  { path: '/parent/analytics', label: 'Statistiques', Icon: BarChart2, desktopOnly: true },
  { path: '/parent/settings', label: 'Paramètres', shortLabel: 'Plus', Icon: Settings, MobileIcon: SlidersHorizontal },
];

const CHILD_NAV = [
  { path: '/child', label: 'Accueil', Icon: Home, exact: true },
  { path: '/child/available-chores', label: 'Quêtes', Icon: Zap, also: ['/child/my-chores', '/child/submit-chore'] },
  { path: '/child/goals', label: 'Rêves', Icon: Target },
  { path: '/child/balance', label: 'Trésor', Icon: Wallet, also: ['/child/expenses'] },
  { path: '/child/profile', label: 'Moi', Icon: User },
];

const isActive = (item, pathname) => {
  if (item.exact) return pathname === item.path;
  return [item.path, ...(item.also || [])].some(path => pathname === path || pathname.startsWith(`${path}/`));
};

const usePendingCount = role => {
  const { chores, expenses } = useApp();
  if (role !== 'PARENT') return 0;
  return (chores || []).filter(c => c.status === 'SUBMITTED').length
    + (expenses || []).filter(e => e.status === 'PENDING').length;
};

function CountBadge({ count, className = '' }) {
  return (
    <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full bg-gold text-on-gold flex items-center justify-center text-[13px] font-bold ${className}`}>
      {count}
    </span>
  );
}

function BottomNav({ role }) {
  const { pathname } = useLocation();
  const pending = usePendingCount(role);
  if (!role) return null;
  const isParent = role === 'PARENT';
  const items = (isParent ? PARENT_NAV : CHILD_NAV).filter(item => !item.desktopOnly);

  return (
    <nav
      aria-label="Navigation principale"
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2 pt-2 pb-safe
        ${isParent ? 'bg-nav text-on-nav on-dark-field' : 'bg-surface border-t-2 border-line'}`}
    >
      {items.map(item => {
        const active = isActive(item, pathname);
        const Icon = item.MobileIcon || item.Icon;
        const idle = isParent ? 'text-on-nav-muted' : 'text-on-surface-variant';
        const pill = active ? (isParent ? 'bg-nav-active text-white' : 'bg-gold text-on-gold') : '';
        const label = active ? (isParent ? 'text-on-nav' : 'text-on-surface') : idle;
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-[3px] min-w-[62px] min-h-[60px] text-xs ${active ? 'font-bold' : 'font-medium'} ${label}`}
          >
            <span className={`flex items-center justify-center w-[46px] h-8 rounded-xl ${pill}`}>
              <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span>{item.shortLabel || item.label}</span>
            {item.badge && pending > 0 && <CountBadge count={pending} className="absolute top-0 right-1.5" />}
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar({ role }) {
  const { pathname } = useLocation();
  const { user, family } = useApp();
  const pending = usePendingCount(role);
  if (!role) return null;
  const items = role === 'PARENT' ? PARENT_NAV : CHILD_NAV;

  return (
    <aside className="hidden lg:flex flex-col gap-7 w-64 h-screen fixed left-0 top-0 z-40 bg-nav text-on-nav px-3 py-6 on-dark-field">
      <Link to={role === 'PARENT' ? '/parent' : '/child'} className="flex items-center gap-2.5 px-2">
        <span className="w-[38px] h-[38px] rounded-full bg-gold border-[3px] border-gold-edge text-on-gold flex items-center justify-center font-headline font-extrabold text-lg">€</span>
        <span className="font-headline font-extrabold text-[21px] tracking-tight">PocketMoney</span>
      </Link>

      <nav aria-label="Navigation principale" className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {items.map(item => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 min-h-[46px] px-3 rounded-xl text-base transition-colors
                ${active ? 'bg-nav-active text-white font-bold' : 'text-on-nav-muted font-medium hover:text-on-nav'}`}
            >
              <item.Icon size={20} strokeWidth={2.2} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.badge && pending > 0 && <CountBadge count={pending} />}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2.5 px-2">
        <Avatar letter={user?.avatar || user?.name?.charAt(0).toUpperCase()} color={user?.color} size="xs" />
        <div className="min-w-0">
          <p className="text-[15px] font-bold truncate">{user?.name}</p>
          <p className="text-sm text-on-nav-muted truncate">{family?.name}</p>
        </div>
      </div>
    </aside>
  );
}

// `bare` : l'écran gère tout son espace (héros en pleine largeur) et son propre titre.
// Bandeau des familles de démo : rappelle que tout sera effacé et permet de voir
// l'app côté parent ou côté enfant sans mot de passe.
function DemoBar() {
  const { user, family, switchDemoUser } = useApp();
  const navigate = useNavigate();
  if (!user || !family?.demoExpiresAt) return null;

  const switchTo = async member => {
    if (member.id === user.id) return;
    try {
      await switchDemoUser(member.id);
      navigate(member.role === 'PARENT' ? '/parent' : '/child');
    } catch { /* le toast est déjà affiché */ }
  };

  return (
    <div role="region" aria-label="Mode démo" className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-6 lg:px-12 py-2.5 bg-gold text-on-gold border-b-2 border-gold-edge text-sm">
      <span className="font-bold">Démo</span>
      <span className="hidden sm:inline">Données fictives, effacées sous 24 h.</span>
      <span className="ml-auto font-semibold">Voir en tant que</span>
      <div className="flex gap-1.5">
        {family.users.map(member => (
          <button
            key={member.id}
            type="button"
            onClick={() => switchTo(member)}
            aria-pressed={member.id === user.id}
            className={`px-3 min-h-[36px] rounded-full font-bold border-2 border-gold-edge ${member.id === user.id ? 'bg-on-gold text-gold' : 'bg-transparent'}`}
          >
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Layout({ children, title, bare = false, showBack = false, onBack, headerRight, width }) {
  const { user, theme, toggleTheme, toast } = useApp();
  const hasNav = !!user;
  const defaultWidth = hasNav ? (user.role === 'CHILD' ? 'max-w-2xl' : 'max-w-6xl') : 'max-w-md';

  useEffect(() => {
    document.title = title ? `${title} · PocketMoney` : 'PocketMoney';
  }, [title]);

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[400] focus:px-6 focus:py-3 focus:rounded-full focus:bg-primary focus:text-on-primary focus:font-bold">
        Aller au contenu
      </a>

      {!hasNav && (
        <div className="fixed top-4 right-4 z-[100]">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      )}

      <Sidebar role={user?.role} />

      <div className={hasNav ? 'lg:ml-64' : ''}>
        <DemoBar />
        {bare ? (
          <main id="contenu" tabIndex={-1} className={`outline-none ${hasNav ? 'pb-28 lg:pb-12' : ''}`}>{children}</main>
        ) : (
          <main id="contenu" tabIndex={-1} className={`outline-none px-4 sm:px-6 lg:px-12 ${hasNav ? 'pt-6 lg:pt-10 pb-32 lg:pb-12' : 'pt-20 pb-12'}`}>
            <div className={`mx-auto w-full ${width || defaultWidth} animate-fade-in`}>
              {(title || showBack || headerRight) && (
                <header className="flex flex-wrap items-center gap-3 mb-6">
                  {showBack && (
                    <button type="button" onClick={onBack} aria-label="Retour" className="w-12 h-12 flex-shrink-0 rounded-[14px] bg-surface border-2 border-line text-on-surface flex items-center justify-center active:translate-y-px transition-transform">
                      <ChevronLeft size={24} strokeWidth={2.6} />
                    </button>
                  )}
                  {title && <h1 className="flex-1 min-w-[12rem] font-headline font-extrabold text-[32px] lg:text-[40px] leading-[1.05] tracking-tight">{title}</h1>}
                  {headerRight}
                </header>
              )}
              {children}
            </div>
          </main>
        )}
      </div>

      <BottomNav role={user?.role} />
      <Toast toast={toast} />
    </div>
  );
}
