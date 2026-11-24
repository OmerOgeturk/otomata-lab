import { ArrowRight } from 'lucide-react'
import { Button } from './ui'

export function Card({ title, children, tone = 'default' }) {
  const tones = {
    default: 'bg-white ring-slate-200',
    example: 'bg-emerald-50/50 ring-emerald-200',
    note: 'bg-indigo-50/60 ring-indigo-200',
  }
  return (
    <section className={`rounded-xl p-5 shadow-sm ring-1 ${tones[tone]}`}>
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

export function Steps({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
          <div className="pt-0.5">{item}</div>
        </li>
      ))}
    </ol>
  )
}

export function TryIt({ label, onClick }) {
  return (
    <Button icon={ArrowRight} onClick={onClick} className="mt-1">
      {label}
    </Button>
  )
}
