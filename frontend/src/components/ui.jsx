import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-200/70 disabled:text-slate-300',
  danger: 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50',
}

export function Button({ variant = 'secondary', icon: Icon, children, className = '', active, ...props }) {
  const activeClass = active ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300 hover:bg-indigo-100' : VARIANTS[variant]
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed ${activeClass} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, active, className = '', ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:text-slate-300 ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200/70'
      } ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}

export function Panel({ title, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            {Icon && <Icon className="h-4 w-4 text-indigo-500" aria-hidden />}
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'rounded-lg border-0 bg-white px-3 py-1.5 text-sm text-slate-800 ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none'

export function Alert({ tone = 'error', children, onClose }) {
  const tones = {
    error: 'bg-red-50 text-red-700 ring-red-200',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  }
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${tones[tone]}`} role="alert">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Kapat" className="opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function Dialog({ open, title, onClose, children, footer }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    const body = ref.current?.querySelector('[data-dialog-body]')
    ;(body?.querySelector('input, textarea, select, button') ?? ref.current?.querySelector('button'))?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-slate-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <IconButton icon={X} label="Kapat" onClick={onClose} />
        </header>
        <div data-dialog-body className="space-y-3 px-5 py-4">
          {children}
        </div>
        {footer && <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-700',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function Placeholder({ icon: Icon, title, children }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-10 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-400" aria-hidden />}
      <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
      <p className="max-w-md text-sm text-slate-500">{children}</p>
    </div>
  )
}
