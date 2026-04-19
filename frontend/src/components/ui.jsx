import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X, Check, Sparkles, Sun, Moon, ChevronRight } from 'lucide-react';

// ── Theme Toggle — Puffy Squishy Pill ─────────────────────────────────────
export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={`relative w-16 h-10 rounded-full cursor-pointer flex-shrink-0 transition-all duration-500 active:scale-90 shadow-clay-well border-2 border-transparent
        ${isDark ? 'bg-primary/20' : 'bg-surface-container'}`}
    >
      <span className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
        <Sun size={14} className={`transition-all duration-500 ${isDark ? 'opacity-20 scale-50' : 'opacity-100 scale-100 text-primary'}`} />
        <Moon size={14} className={`transition-all duration-500 ${isDark ? 'opacity-100 scale-100 text-primary' : 'opacity-20 scale-50'}`} />
      </span>
      <span
        className={`absolute top-1 left-1 w-7 h-7 rounded-full shadow-clay flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isDark ? 'translate-x-6 bg-primary' : 'translate-x-0 bg-white'}`}
      >
        {isDark ? <Moon size={14} className="text-on-primary" /> : <Sun size={14} className="text-primary" />}
      </span>
    </button>
  );
}

// ── Button ────────────────────────────────────────────────────────────────
export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  loading = false,
  icon: Icon,
  onClick,
  type = 'button',
  className = '',
}) {
  const base =
    'inline-flex items-center justify-center gap-3 font-headline font-black rounded-full cursor-pointer ' +
    'transition-all duration-300 select-none border-0 active:scale-95 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

  const variants = {
    primary:   'bg-primary text-on-primary shadow-clay-primary hover:brightness-110',
    secondary: 'bg-secondary text-on-secondary shadow-clay-secondary hover:brightness-110',
    success:   'bg-secondary-container text-on-secondary-container shadow-clay hover:brightness-105 border border-secondary/10',
    danger:    'bg-error text-on-error shadow-clay hover:brightness-110',
    ghost:     'bg-transparent text-on-surface-variant hover:bg-surface-container-highest',
    outline:   'bg-white/50 dark:bg-white/10 text-on-surface border-2 border-on-surface/10 shadow-clay hover:bg-white dark:hover:bg-white/20',
  };

  const sizes = {
    sm: 'text-xs px-5 py-2.5 min-h-[42px]',
    md: 'text-sm px-8 py-3.5 min-h-[52px]',
    lg: 'text-base px-10 py-5 min-h-[64px] tracking-tight',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon && <Icon size={size === 'lg' ? 20 : 18} strokeWidth={2.5} />}
      <span className="leading-none">{children}</span>
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default', size = 'md' }) {
  const variants = {
    default: 'bg-surface-container-highest text-on-surface-variant border border-on-surface/5',
    primary: 'bg-primary text-on-primary shadow-sm',
    success: 'bg-secondary-container text-on-secondary-container border border-secondary/20',
    warning: 'bg-primary-container text-on-primary-container border border-primary/20',
    danger:  'bg-error-container text-on-error-container border border-error/20',
  };
  const sizes = {
    sm: 'text-[10px] px-3 py-1',
    md: 'text-xs px-4 py-1.5',
    lg: 'text-sm px-6 py-2',
  };
  return (
    <span className={`inline-flex items-center justify-center font-label font-black rounded-full border-0 uppercase tracking-widest ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending:   { label: 'En attente', variant: 'default' },
    submitted: { label: 'À valider',    variant: 'warning' },
    completed: { label: 'Terminé',    variant: 'success' },
    rejected:  { label: 'Refusé',    variant: 'danger' },
  };
  const s = status?.toLowerCase();
  const { label, variant } = map[s] || { label: status, variant: 'default' };
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-surface-container-highest rounded-[2.5rem] border-0 shadow-clay transition-all duration-500
        ${hover ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1 active:scale-95 shadow-2xl' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────
export function Input({ label, error, prefix, suffix, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {label && <label className="text-sm font-black text-on-surface tracking-tight ml-4">{label}</label>}
      <div className="relative flex items-center group">
        {prefix && <span className="absolute left-6 text-on-surface-variant font-black">{prefix}</span>}
        <input
          className={`w-full bg-surface-container-lowest dark:bg-surface-container-highest rounded-[1.5rem] px-6 h-16 border-2 border-transparent
            text-base font-bold text-on-surface shadow-clay-well focus:bg-white dark:focus:bg-surface-container-highest focus:border-primary/40 focus:outline-none transition-all
            ${error ? 'border-error/50 bg-error-container/10' : ''} ${prefix ? 'pl-12' : ''} ${suffix ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {suffix && <div className="absolute right-4">{suffix}</div>}
      </div>
      {error && <p className="text-xs text-error font-black ml-4 animate-fade-in">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {label && <label className="text-sm font-black text-on-surface tracking-tight ml-4">{label}</label>}
      <textarea
        className={`w-full bg-surface-container-lowest dark:bg-surface-container-highest rounded-[2rem] px-6 py-6 border-2 border-transparent
          text-base font-bold text-on-surface shadow-clay-well focus:bg-white dark:focus:bg-surface-container-highest focus:border-primary/40 focus:outline-none transition-all resize-none min-h-[140px]
          ${error ? 'border-error/50 bg-error-container/10' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-error font-black ml-4 animate-fade-in">{error}</p>}
    </div>
  );
}

export function Select({ label, options = [], ...props }) {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {label && <label className="text-sm font-black text-on-surface tracking-tight ml-4">{label}</label>}
      <div className="relative group">
        <select
          className="w-full bg-surface-container-lowest dark:bg-surface-container-highest rounded-[1.5rem] px-6 h-16 border-2 border-transparent
            text-base font-bold text-on-surface shadow-clay-well focus:bg-white dark:focus:bg-surface-container-highest focus:border-primary/40 focus:outline-none appearance-none transition-all cursor-pointer"
          {...props}
        >
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-focus-within:text-primary transition-colors">
           <ChevronRight size={20} className="rotate-90" />
        </div>
      </div>
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────
export function Avatar({ letter, color = '#835500', size = 'md' }) {
  const sizes = {
    xs: 'w-10 h-10 text-sm', sm: 'w-12 h-12 text-base', md: 'w-16 h-16 text-xl', lg: 'w-24 h-24 text-3xl', xl: 'w-32 h-32 text-5xl',
  };
  return (
    <div
      className={`${sizes[size]} rounded-[1.5rem] sm:rounded-[2rem] border-4 border-white/40 dark:border-white/10 shadow-clay flex items-center justify-center font-headline font-black text-white flex-shrink-0 relative overflow-hidden`}
      style={{ backgroundColor: color }}
    >
      <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 blur-[1px] opacity-30" />
      {letter}
    </div>
  );
}

// ── ProgressBar ──────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, height = 'md', color = 'primary' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const heights = { sm: 'h-3', md: 'h-5', lg: 'h-8' };
  return (
    <div className={`w-full bg-surface-container-highest rounded-full shadow-clay-well border-2 border-on-surface/5 ${heights[height]} overflow-hidden p-1`}>
      <div
        className="h-full rounded-full bg-primary shadow-clay-primary transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative overflow-hidden"
        style={{ width: `${pct}%` }}
      >
         <div className="absolute inset-0 bg-white/20 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      </div>
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────
export function StatCard({ title, value, sub, icon: Icon, color = 'primary', onClick }) {
  return (
    <Card hover={!!onClick} onClick={onClick} className="p-8 group">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-60 leading-none mb-2">{title}</p>
          <p className="text-4xl font-mono-num font-black text-on-surface tracking-tighter leading-none">{value}</p>
          {sub && <p className="text-xs font-bold text-on-surface-variant mt-3 opacity-90">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-clay ${color === 'primary' ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'}`}>
            <Icon size={32} strokeWidth={2.5} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose} />
      <div className="relative bg-background dark:bg-surface-container-low w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-pop-in border-4 border-white/20">
        <div className="px-10 py-8 border-b border-on-surface/10 flex items-center justify-between">
          <h2 className="text-2xl font-headline font-black text-on-surface tracking-tight">{title}</h2>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-error hover:text-white transition-all active:scale-90 shadow-clay"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">{children}</div>
        {footer && <div className="px-10 py-8 bg-surface-container/50 border-t border-on-surface/10">{footer}</div>}
      </div>
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-8 animate-fade-in">
      <div className="w-32 h-32 rounded-[3rem] bg-primary/10 flex items-center justify-center text-primary relative shadow-clay">
        <Icon size={56} strokeWidth={2} />
      </div>
      <div className="space-y-2 max-w-sm mx-auto">
        <h3 className="text-3xl font-headline font-black text-on-surface tracking-tight">{title}</h3>
        <p className="text-on-surface-variant font-medium opacity-80 leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null;
  const configs = {
    success: { bg: 'bg-primary text-on-primary shadow-clay-primary', Icon: CheckCircle },
    error:   { bg: 'bg-error text-on-error shadow-clay', Icon: XCircle },
    info:    { bg: 'bg-secondary text-on-secondary shadow-clay-secondary', Icon: Info },
  };
  const { bg, Icon } = configs[toast.type] || configs.info;
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] w-max max-w-[90vw] animate-pop-in">
      <div className={`${bg} rounded-3xl px-10 py-5 flex items-center gap-4 border-2 border-white/30 shadow-2xl scale-110`}>
        <Icon size={24} strokeWidth={3} className="shrink-0" />
        <p className="text-lg font-black tracking-tight leading-none">{toast.message}</p>
      </div>
    </div>
  );
}

// ── Amount ───────────────────────────────────────────────────────────────
export function Amount({ value, size = 'md' }) {
  const isPositive = value >= 0;
  const sizes = { sm: 'text-sm px-5 py-2.5', md: 'text-xl px-8 py-4', lg: 'text-5xl px-12 py-8' };
  return (
    <span className={`font-mono-num font-black rounded-[1.5rem] shadow-clay whitespace-nowrap transition-transform hover:scale-105 ${sizes[size]} 
      ${isPositive 
        ? 'bg-secondary-container text-on-secondary-container border-2 border-secondary/20' 
        : 'bg-error-container text-on-error-container border-2 border-error/20'}`}>
      {isPositive ? '+' : ''}{value.toFixed(2)}€
    </span>
  );
}

// ── Checkbox & Radio ───────────────────────────────────────────────────────
export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-4 cursor-pointer group select-none">
      <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300
        ${checked ? 'bg-primary border-primary shadow-clay-primary' : 'bg-surface-container-highest border-on-surface/10 shadow-clay-well group-hover:border-primary/50'}`}>
        {checked && <Check size={20} className="text-on-primary" strokeWidth={3} />}
      </div>
      {label && <span className="text-base font-bold text-on-surface opacity-80 group-hover:opacity-100 transition-opacity">{label}</span>}
      <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export function Radio({ label, name, value, checked, onChange }) {
  return (
    <label className="flex items-center gap-4 cursor-pointer group select-none">
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
        ${checked ? 'bg-primary border-primary shadow-clay-primary' : 'bg-surface-container-highest border-on-surface/10 shadow-clay-well group-hover:border-primary/50'}`}>
        {checked && <div className="w-3.5 h-3.5 rounded-full bg-on-primary shadow-sm" />}
      </div>
      {label && <span className="text-base font-bold text-on-surface opacity-80 group-hover:opacity-100 transition-opacity">{label}</span>}
      <input type="radio" className="hidden" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
    </label>
  );
}
