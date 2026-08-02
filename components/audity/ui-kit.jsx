'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- micro label ---------- */
export function MicroLabel({ children, className, as: Tag = 'span' }) {
  return (
    <Tag
      className={cn(
        'font-mono text-[10px] uppercase leading-none tracking-[0.18em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/* ---------- pixel divider ---------- */
export function PixelDivider({ className, accent = false }) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-[3px] w-full', className)}
      style={{
        backgroundImage: `linear-gradient(to right, ${
          accent ? 'var(--primary)' : 'var(--border-strong)'
        } 0 3px, transparent 3px 6px)`,
        backgroundSize: '6px 3px',
        backgroundRepeat: 'repeat-x',
      }}
    />
  )
}

/* ---------- corner-marked panel ---------- */
export function Panel({ children, className, label, right, dense = false, accent = false }) {
  return (
    <section
      className={cn(
        'relative border border-border bg-surface',
        accent && 'border-primary/40',
        className,
      )}
    >
      <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-primary" />
      <span className="pointer-events-none absolute -right-px -top-px h-2 w-2 border-r-2 border-t-2 border-primary" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-2 w-2 border-b-2 border-l-2 border-primary" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2 border-primary" />
      {(label || right) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <MicroLabel className="text-foreground">{label}</MicroLabel>
          {right}
        </header>
      )}
      <div className={dense ? '' : 'p-4'}>{children}</div>
    </section>
  )
}

/* ---------- section heading ---------- */
export function SectionHeading({ index, title, description, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <MicroLabel className="text-primary">{index}</MicroLabel>
          <PixelDivider className="w-10" accent />
          <h2 className="text-xl font-bold uppercase tracking-tight text-foreground sm:text-2xl">
            {title}
          </h2>
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}

/* ---------- button ---------- */
const buttonVariants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-[#e6c200] border border-primary disabled:hover:bg-primary',
  outline:
    'border border-border-strong bg-transparent text-foreground hover:border-primary hover:text-primary',
  ghost: 'border border-transparent bg-transparent text-muted-foreground hover:text-foreground',
  danger:
    'border border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground',
  secondary:
    'border border-secondary/60 bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 font-mono uppercase tracking-[0.14em] transition-colors duration-150',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' && 'px-3 py-1.5 text-[10px]',
        size === 'md' && 'px-4 py-2.5 text-[11px]',
        size === 'lg' && 'px-6 py-3.5 text-xs',
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ---------- form fields ---------- */
export function Field({ label, children, className, hint }) {
  return (
    <label className={cn('block', className)}>
      <MicroLabel className="mb-2 block">{label}</MicroLabel>
      {children}
      {hint && <span className="mt-1.5 block font-mono text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

const controlBase =
  'w-full border border-border bg-input px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-40'

export function Input({ className, ...props }) {
  return <input className={cn(controlBase, className)} {...props} />
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(controlBase, 'min-h-[84px] resize-y leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(controlBase, 'appearance-none pr-8 uppercase tracking-[0.1em]', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%238a8a85' stroke-width='1.5'><path d='M1 1l4 4 4-4'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
      {...props}
    >
      {children}
    </select>
  )
}

/* ---------- status pill ---------- */
const toneMap = {
  neutral: 'border-border-strong text-muted-foreground',
  primary: 'border-primary/60 bg-primary/10 text-primary',
  secondary: 'border-secondary/60 bg-secondary/10 text-secondary',
  success: 'border-success/50 bg-success/10 text-success',
  warning: 'border-warning/50 bg-warning/10 text-warning',
  danger: 'border-destructive/50 bg-destructive/10 text-destructive',
}

export function Pill({ children, tone = 'neutral', className, dot = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.14em]',
        toneMap[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 bg-current" />}
      {children}
    </span>
  )
}

/* ---------- stat block ---------- */
export function StatBlock({ label, value, sub, tone = 'default', icon: Icon }) {
  return (
    <div className="group relative border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <span
        className={cn(
          'absolute left-0 top-0 h-full w-[3px]',
          tone === 'primary' && 'bg-primary',
          tone === 'secondary' && 'bg-secondary',
          tone === 'success' && 'bg-success',
          tone === 'danger' && 'bg-destructive',
          tone === 'default' && 'bg-border-strong',
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <MicroLabel>{label}</MicroLabel>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />}
      </div>
      <p className="mt-3 font-mono text-2xl font-medium tabular-nums tracking-tight text-foreground lg:text-3xl">
        {value}
      </p>
      {sub && <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ---------- progress bar ---------- */
export function CapacityBar({ percent, tone = 'success' }) {
  return (
    <div className="h-2 w-full border border-border bg-background">
      <div
        className={cn(
          'h-full transition-all duration-300',
          tone === 'success' && 'bg-success',
          tone === 'warning' && 'bg-warning',
          tone === 'danger' && 'bg-destructive',
        )}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg', tone = 'primary' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden border bg-surface',
          tone === 'danger' ? 'border-destructive/50' : 'border-border-strong',
          width,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={cn('h-2 w-2', tone === 'danger' ? 'bg-destructive' : 'bg-primary')}
            />
            <MicroLabel className="text-foreground">{title}</MicroLabel>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="cursor-pointer border border-border p-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-border bg-surface-2 px-4 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- drawer ---------- */
export function Drawer({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-100 flex justify-end">
      <div
        className="absolute inset-0 bg-background/85 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex h-full w-full flex-col border-l border-border-strong bg-surface sm:max-w-md"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-primary" />
            <MicroLabel className="text-foreground">{title}</MicroLabel>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="cursor-pointer border border-border p-1 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-border bg-surface-2 p-4">{footer}</div>}
      </aside>
    </div>
  )
}

/* ---------- empty state ---------- */
export function EmptyState({ title, description, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border-strong px-6 py-14 text-center">
      {Icon && <Icon className="mb-4 h-8 w-8 text-muted-foreground/50" strokeWidth={1.25} />}
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-foreground">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ---------- tabs ---------- */
export function TabBar({ tabs, active, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap border border-border bg-surface', className)}>
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'flex-1 cursor-pointer border-r border-border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors last:border-r-0',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  return d
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString(
    'en-GB',
    { hour: '2-digit', minute: '2-digit' },
  )}`.toUpperCase()
}

export function seatStatus(event) {
  const remaining = Math.max(0, event.maxCapacity - event.registeredCount)
  const pct = event.maxCapacity ? (remaining / event.maxCapacity) * 100 : 0
  if (event.status === 'CANCELLED') return { remaining, pct, tone: 'danger', label: 'CANCELLED' }
  if (remaining === 0) return { remaining, pct, tone: 'danger', label: 'SOLD OUT' }
  if (pct <= 30) return { remaining, pct, tone: 'warning', label: 'FILLING FAST' }
  return { remaining, pct, tone: 'success', label: 'AVAILABLE' }
}
