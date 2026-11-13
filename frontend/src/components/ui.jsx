import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCircle, ChevronDown, Info, Moon, Sun, X, XCircle } from 'lucide-react';

// ── Montants ──────────────────────────────────────────────────────────────
const NBSP = ' ';

export const euro = value => `${(Number(value) || 0).toFixed(2).replace('.', ',')}${NBSP}€`;

// Pour les récompenses : « 5 € » plutôt que « 5,00 € ».
export const euroShort = value => {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? `${number}${NBSP}€` : euro(number);
};

// Les échéances sont du texte libre (« Demain ») ou une date ISO, lisible une fois formatée.
export const formatDeadline = deadline =>
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(deadline || '')
    ? new Date(deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    : deadline;

// ── Interrupteurs ─────────────────────────────────────────────────────────
function SwitchTrack({ on, danger }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block w-[58px] h-[34px] rounded-full transition-colors ${on ? (danger ? 'bg-error' : 'bg-primary') : 'bg-outline'}`}
    >
      <span
        className={`absolute top-1 left-1 w-[26px] h-[26px] rounded-full bg-white transition-transform ${on ? 'translate-x-6 !bg-surface' : ''}`}
      />
    </span>
  );
}

export function Switch({ checked, onChange, label, danger = false }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="flex-shrink-0 rounded-full">
      <SwitchTrack on={checked} danger={danger} />
    </button>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="w-11 h-11 rounded-full flex items-center justify-center bg-surface text-on-surface border-2 border-line flex-shrink-0 active:translate-y-px transition-transform"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

// ── Bouton ────────────────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: 'bg-primary text-on-primary shadow-press active:translate-y-1 active:shadow-none',
  gold: 'bg-gold text-on-gold shadow-press active:translate-y-1 active:shadow-none',
  secondary: 'bg-secondary text-on-secondary',
  danger: 'bg-error text-on-error shadow-press active:translate-y-1 active:shadow-none',
  dangerOutline: 'bg-surface text-error border-2 border-error',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container',
  dangerGhost: 'bg-transparent text-error hover:bg-error-container',
  outline: 'bg-surface text-on-surface border-[1.5px] border-outline hover:border-on-surface',
};

const BTN_SIZES = {
  sm: 'text-[15px] px-4 min-h-[44px] rounded-[13px]',
  md: 'text-[17px] px-6 min-h-[52px] rounded-[15px]',
  lg: 'text-[19px] px-8 min-h-[60px] rounded-[18px]',
};

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
  ...rest
}) {
  const flat = variant === 'outline' || variant.endsWith('host') || variant === 'dangerOutline' || variant === 'secondary';
  const font = flat ? 'font-bold' : 'font-headline font-extrabold';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer select-none transition-all duration-100
        disabled:bg-outline-variant disabled:text-on-surface-variant disabled:shadow-none disabled:border-transparent disabled:cursor-not-allowed
        ${font} ${BTN_VARIANTS[variant] || BTN_VARIANTS.primary} ${BTN_SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        Icon && <Icon size={size === 'lg' ? 22 : 20} strokeWidth={2.5} aria-hidden="true" />
      )}
      <span className="leading-none">{children}</span>
    </button>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────
const BADGE_VARIANTS = {
  default: 'bg-surface-container text-on-surface-variant',
  primary: 'bg-primary-container text-on-primary-container',
  success: 'bg-gain-container text-gain',
  warning: 'bg-primary-container text-on-primary-container',
  danger: 'bg-error-container text-on-error-container',
};

export function Badge({ children, variant = 'default' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${BADGE_VARIANTS[variant]}`}>
      {children}
    </span>
  );
}

const STATUS = {
  pending: { label: 'En attente', variant: 'default' },
  submitted: { label: 'À valider', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'success' },
  approved: { label: 'Approuvée', variant: 'success' },
  rejected: { label: 'Refusé', variant: 'danger' },
};

export function StatusBadge({ status }) {
  const { label, variant } = STATUS[status?.toLowerCase()] || { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Carte ────────────────────────────────────────────────────────────────
// `sticker` : contour épais et ombre dure, réservé à l'espace enfant.
export function Card({ children, className = '', onClick, hover = false, sticker = false, as: Tag = 'div' }) {
  // Clavier : seule la carte ciblée réagit, pas un bouton placé à l'intérieur.
  const keyboard = onClick && {
    role: 'button',
    tabIndex: 0,
    onKeyDown: e => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e);
      }
    },
  };
  return (
    <Tag
      onClick={onClick}
      {...keyboard}
      className={`bg-surface rounded-[22px] ${sticker ? 'border-2 border-line shadow-press-lg' : 'border border-outline-variant'}
        ${hover || onClick ? 'cursor-pointer transition-transform active:translate-y-px' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}

// ── Champs ───────────────────────────────────────────────────────────────
const FIELD = 'w-full bg-surface rounded-[14px] border-[1.5px] border-outline text-[17px] text-on-surface placeholder:text-on-surface-variant focus:border-primary transition-colors';
const LABEL = 'text-[15px] font-bold text-on-surface';

export function Input({ label, error, prefix, suffix, className = '', ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={id} className={LABEL}>{label}</label>}
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-4 text-on-surface-variant font-bold">{prefix}</span>}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${FIELD} h-[54px] px-4 ${error ? '!border-error' : ''} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {suffix && <div className="absolute right-2">{suffix}</div>}
      </div>
      {error && <p id={errorId} className="text-sm text-error font-bold">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={id} className={LABEL}>{label}</label>}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${FIELD} px-4 py-3 resize-none min-h-[96px] ${error ? '!border-error' : ''} ${className}`}
        {...props}
      />
      {error && <p id={errorId} className="text-sm text-error font-bold">{error}</p>}
    </div>
  );
}

export function Select({ label, options = [], ...props }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={id} className={LABEL}>{label}</label>}
      <div className="relative">
        <select id={id} className={`${FIELD} h-[54px] px-4 pr-10 appearance-none cursor-pointer`} {...props}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown size={20} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group min-h-[44px]">
      <div className={`w-7 h-7 flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors group-focus-within:outline group-focus-within:outline-[3px] group-focus-within:outline-primary group-focus-within:outline-offset-2
        ${checked ? 'bg-primary border-primary' : 'bg-surface border-outline'}`}>
        {checked && <Check size={18} className="text-on-primary" strokeWidth={3} />}
      </div>
      {label && <span className="text-[15px] leading-snug text-on-surface">{label}</span>}
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export function Radio({ label, name, value, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group min-h-[44px]">
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center group-focus-within:outline group-focus-within:outline-[3px] group-focus-within:outline-primary group-focus-within:outline-offset-2
        ${checked ? 'border-primary' : 'bg-surface border-outline'}`}>
        {checked && <div className="w-3.5 h-3.5 rounded-full bg-primary" />}
      </div>
      {label && <span className="text-base font-bold text-on-surface">{label}</span>}
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
    </label>
  );
}

// Choix court, un seul à la fois : quêtes, rôle à la connexion…
export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5 p-[5px] bg-surface border-2 border-line rounded-2xl">
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-h-[44px] px-2 rounded-[11px] text-[15px] font-bold transition-colors ${active ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`min-h-[46px] px-4 rounded-full border-[1.5px] text-[15px] font-bold transition-colors ${active ? 'bg-secondary border-secondary text-on-secondary' : 'bg-surface border-outline text-on-surface'}`}
    >
      {children}
    </button>
  );
}

// ── La pièce : récompense, montant, progression ───────────────────────────
export function Coin({ children, size = 'md', className = '' }) {
  const sizes = { sm: 'w-14 h-14', md: 'w-16 h-16', lg: 'w-20 h-20' };
  const long = String(children).length > 6;
  const text = long ? 'text-[13px]' : size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <span className={`flex-shrink-0 inline-flex items-center justify-center text-center leading-none rounded-full bg-gold border-[3px] border-gold-edge text-on-gold font-headline font-extrabold ${sizes[size]} ${text} ${className}`}>
      {children}
    </span>
  );
}

export function CoinButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`w-[62px] h-[62px] rounded-full border-[3px] font-headline font-extrabold text-lg text-on-surface transition-colors ${active ? '!text-on-gold bg-gold border-line' : 'bg-surface border-gold-edge'}`}
    >
      {children}
    </button>
  );
}

export function BigCoin({ label, value }) {
  return (
    <div className="coin-ridge w-[232px] h-[232px] rounded-full shadow-coin flex items-center justify-center animate-pop-in">
      <div className="w-[206px] h-[206px] rounded-full bg-gold border-[3px] border-gold-edge flex flex-col items-center justify-center gap-0.5 px-3">
        <span className="text-[15px] font-bold text-gold-label">{label}</span>
        <span className={`font-headline font-extrabold tracking-tight leading-tight text-on-gold whitespace-nowrap ${value.length > 9 ? 'text-[34px]' : 'text-[46px]'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

const coinsFilled = (value, max) => {
  const ratio = max > 0 ? Math.min(1, (Number(value) || 0) / max) : 0;
  if (ratio >= 1) return 10;
  if (ratio <= 0) return 0;
  return Math.min(9, Math.max(1, Math.floor(ratio * 10)));
};

export function CoinRow({ value, max }) {
  const filled = coinsFilled(value, max);
  return (
    <div role="img" aria-label={`${filled} pièces sur 10 remplies`} className="flex justify-between">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`w-[26px] h-[26px] rounded-full border-2 ${i < filled ? 'bg-gold border-gold-edge' : 'border-dashed border-outline'}`} />
      ))}
    </div>
  );
}

export function CoinStack({ value, max }) {
  const filled = coinsFilled(value, max);
  return (
    <div role="img" aria-label={`${filled} pièces sur 10 empilées`} className="flex-shrink-0 flex flex-col-reverse gap-0.5 w-[92px]">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`h-3 rounded-md border-2 ${i < filled ? `bg-gold border-gold-edge ${i % 3 === 1 ? 'ml-1.5' : i % 3 === 2 ? 'ml-0.5' : ''}` : 'border-dashed border-outline'}`}
        />
      ))}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────
// Le texte s'adapte à la couleur choisie par la famille pour rester lisible.
const readableOn = color => {
  const match = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!match) return '#FFFFFF';
  const channel = shift => {
    const value = ((parseInt(match[1], 16) >> shift) & 255) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return luminance > 0.2 ? '#1A1640' : '#FFFFFF';
};

export function Avatar({ letter, color = '#6A4DF5', size = 'md' }) {
  const sizes = {
    xs: 'w-9 h-9 rounded-[11px] text-base',
    sm: 'w-11 h-11 rounded-[13px] text-lg',
    md: 'w-[60px] h-[60px] rounded-[18px] text-[28px]',
    lg: 'w-24 h-24 rounded-[28px] text-5xl',
  };
  const background = color || '#6A4DF5';
  return (
    <div
      className={`${sizes[size]} flex items-center justify-center font-headline font-extrabold flex-shrink-0`}
      style={{ backgroundColor: background, color: readableOn(background) }}
    >
      {letter}
    </div>
  );
}

// ── Progression ──────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, label = 'Progression' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="w-full h-3 bg-outline-variant rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({ title, value, sub, onClick }) {
  return (
    <Card hover={!!onClick} onClick={onClick} className="px-[22px] py-[18px]">
      <p className="text-[15px] font-semibold text-on-surface-variant">{title}</p>
      <p className="font-headline font-extrabold text-4xl tracking-tight">{value}</p>
      {sub && <p className="text-[15px] text-on-surface-variant">{sub}</p>}
    </Card>
  );
}

// ── Fenêtre ──────────────────────────────────────────────────────────────
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

// Feuille en bas d'écran sur mobile, fenêtre centrée à partir de sm.
export function Modal({ open, onClose, title, children, footer }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Le focus entre dans la fenêtre, y reste, puis revient sur le bouton d'origine.
  useEffect(() => {
    if (!open) return undefined;
    const previous = /** @type {HTMLElement | null} */ (document.activeElement);
    dialogRef.current?.focus();
    const onKeyDown = e => {
      if (e.key === 'Escape') onCloseRef.current?.();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  // Rendue sur <body> pour passer au-dessus de la navigation, mais sous les toasts (z-[300]).
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-[#1A1640]/60 backdrop-blur-xl animate-fade-in" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-surface text-on-surface w-full sm:max-w-lg max-h-[85vh] rounded-t-[28px] sm:rounded-3xl flex flex-col animate-sheet outline-none"
      >
        <div className="px-5 sm:px-6 pt-6 pb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-headline font-extrabold text-2xl tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-11 h-11 flex-shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
            <X size={20} strokeWidth={2.6} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-2">{children}</div>
        {footer && <div className="px-5 sm:px-6 pt-3 pb-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2.5">
          <Btn full variant="outline" onClick={onClose}>Annuler</Btn>
          <Btn full variant="danger" onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      }
    >
      <p className="text-base leading-relaxed">{message}</p>
    </Modal>
  );
}

// ── États ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center py-14 px-6 text-center gap-4 animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-gold border-4 border-gold-edge shadow-press-lg flex items-center justify-center text-on-gold">
        <Icon size={42} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h2 className="font-headline font-extrabold text-[26px] tracking-tight">{title}</h2>
        <p className="text-on-surface-variant leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Toast({ toast }) {
  const configs = {
    success: { bg: 'bg-primary text-on-primary', Icon: CheckCircle },
    error: { bg: 'bg-error text-on-error', Icon: XCircle },
    info: { bg: 'bg-secondary text-on-secondary', Icon: Info },
  };
  const { bg, Icon } = (toast && configs[toast.type]) || configs.info;
  // La zone reste montée : un lecteur d'écran n'annonce que les changements d'une zone existante.
  return (
    <div role="status" aria-live="polite">
      {toast && (
        // L'animation anime `transform` : sur l'enveloppe, elle écraserait le centrage.
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] w-max max-w-[90vw]">
          <div className={`${bg} rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-press animate-pop-in`}>
            <Icon size={22} strokeWidth={2.6} className="shrink-0" aria-hidden="true" />
            <p className="text-base font-bold leading-snug">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// « − » typographique, et le signe s'ajoute à la couleur : le sens ne repose pas que sur elle.
export function Amount({ value, className = '' }) {
  const positive = value >= 0;
  return (
    <span className={`font-bold whitespace-nowrap ${positive ? 'text-gain' : 'text-error'} ${className}`}>
      {positive ? '+' : '−'}{euro(Math.abs(value))}
    </span>
  );
}
