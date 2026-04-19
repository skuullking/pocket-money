import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, ListChecks, Users, BarChart2, Settings,
  Target, Wallet, User, ChevronLeft, Sparkles, Star, LogOut, ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context';
import { Avatar, Toast, ThemeToggle } from './ui';

const PARENT_NAV = [
  { id: 'parent_dashboard',         path: '/parent',           label: 'Accueil',    Icon: Home },
  { id: 'parent_chores',            path: '/parent/chores',    label: 'Corvées',    Icon: ListChecks },
  { id: 'parent_children',          path: '/parent/children',  label: 'Enfants',    Icon: Users },
  { id: 'parent_analytics',         path: '/parent/analytics', label: 'Stats',      Icon: BarChart2 },
  { id: 'parent_settings',          path: '/parent/settings',  label: 'Paramètres', Icon: Settings },
];

const CHILD_NAV = [
  { id: 'child_dashboard',        path: '/child',                 label: 'Accueil',   Icon: Home },
  { id: 'child_available_chores', path: '/child/available-chores', label: 'Quêtes',    Icon: ListChecks },
  { id: 'child_goals',            path: '/child/goals',            label: 'Objectifs', Icon: Target },
  { id: 'child_balance',          path: '/child/balance',          label: 'Trésor',    Icon: Wallet },
  { id: 'child_profile',          path: '/child/profile',          label: 'Moi',       Icon: User },
];

function BottomNav({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  if (!role) return null;
  const items = role === 'PARENT' ? PARENT_NAV : CHILD_NAV;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center
      px-4 pb-safe pt-3 bg-white/80 dark:bg-surface-container-high/90 backdrop-blur-xl rounded-t-[2.5rem]
      shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-white/20 dark:border-white/5">
      {items.map(({ id, path, label, Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={id}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center gap-1 min-h-[64px] min-w-[64px] px-2 py-1 rounded-3xl transition-all duration-300
              ${active 
                ? 'bg-primary text-on-primary scale-110 shadow-clay-primary' 
                : 'text-on-surface-variant/60 hover:bg-primary/5 active:scale-90'}`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, theme, toggleTheme } = useApp();
  if (!role) return null;
  const items = role === 'PARENT' ? PARENT_NAV : CHILD_NAV;

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen fixed left-0 top-0 z-40
      bg-white/70 dark:bg-surface-container-high/80 backdrop-blur-xl shadow-clay border-r border-white/20 dark:border-white/5">
      <div className="px-8 py-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-clay-primary text-on-primary">
            <Wallet size={28} />
          </div>
          <div>
            <span className="font-headline font-extrabold text-primary text-2xl tracking-tighter">PocketMoney</span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Mode {role === 'PARENT' ? 'Parent' : 'Enfant'}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {items.map(({ id, path, label, Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all duration-300 text-left group
                ${active 
                  ? 'bg-primary text-on-primary font-bold shadow-clay-primary translate-x-2' 
                  : 'text-on-surface-variant/70 hover:bg-primary/10 hover:text-primary'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? '' : 'group-hover:scale-110 transition-transform'} />
              <span className="font-headline text-base tracking-tight">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 mt-auto space-y-4">
        {/* Theme Toggle in Sidebar */}
        <div className="flex justify-center py-2">
           <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        
        <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-surface-container-highest/40 rounded-[2rem] shadow-clay border border-white/40 dark:border-white/10">
          <Avatar
            letter={user?.avatar || user?.name?.charAt(0).toUpperCase()}
            color={user?.color || '#835500'}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-sm font-extrabold font-headline text-on-surface truncate">{user?.name}</p>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">Ma Famille</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function Layout({ children, title, noPadding = false, showBack = false, onBack, headerRight }) {
  const { user, theme, toggleTheme, toast } = useApp();
  const hasNav = !!user;

  return (
    <div className="min-h-screen bg-background dark:bg-surface text-on-surface relative transition-colors duration-500 overflow-x-hidden">
      {/* Floating background decorations */}
      <div className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-10 overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[30%] h-[30%] rounded-full bg-secondary/20 blur-[100px]" />
      </div>

      {/* Theme toggle for guest users (Welcome screen) */}
      {!hasNav && (
        <div className="fixed top-5 right-6 z-[100]">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      )}
      
      <Sidebar role={user?.role} />

      <div className={`flex flex-col flex-1 ${hasNav ? 'lg:ml-72' : ''} min-h-screen relative z-10`}>
        {hasNav && (
          <header className="lg:hidden flex items-center gap-4 px-6 h-20 bg-white/70 dark:bg-surface-container-high/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5 sticky top-0 z-40">
            {showBack && (
              <button onClick={onBack} className="p-3 -ml-3 bg-white dark:bg-surface-container rounded-full shadow-clay active:scale-90 transition-transform">
                <ChevronLeft size={24} className="text-primary" />
              </button>
            )}
            <h1 className="flex-1 font-headline font-extrabold text-xl text-primary truncate tracking-tight text-left">
              {title || 'PocketMoney'}
            </h1>
            
            <div className="flex items-center gap-3">
               {headerRight}
               <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </header>
        )}
        
        <main className={`flex-1 flex flex-col ${noPadding ? '' : 'px-6 py-8 lg:px-12 lg:py-12'} ${hasNav ? '' : 'justify-center min-h-screen pt-20'} pb-32 lg:pb-12`}>
          {hasNav && title && (
            <div className="hidden lg:flex items-center justify-between mb-10">
              <h1 className="text-4xl font-extrabold font-headline text-primary tracking-tighter">{title}</h1>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                   {headerRight}
                   <ThemeToggle theme={theme} onToggle={toggleTheme} />
                </div>
              </div>
            </div>
          )}
          <div className={`w-full ${hasNav ? 'max-w-6xl' : 'max-w-md mx-auto'} animate-fade-in`}>
            {children}
          </div>
        </main>
      </div>

      <BottomNav role={user?.role} />
      <Toast toast={toast} />
    </div>
  );
}
