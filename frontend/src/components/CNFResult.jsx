import { useEffect, useState } from 'react'
import { Check, ChevronDown, CircleCheck, CircleX, Copy, Play } from 'lucide-react'
import { api } from '../services/api'
import { Alert, Badge, Button, inputClass } from './ui'

export function GrammarBlock({ text, highlight = false }) {
  if (!text) return <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400 ring-1 ring-slate-200">Kural kalmadı (boş dil).</p>
  return (
    <pre
      className={`overflow-x-auto rounded-lg px-3 py-2 font-mono text-sm leading-6 ring-1 ${
        highlight ? 'bg-indigo-50 text-indigo-950 ring-indigo-100' : 'bg-slate-50 text-slate-800 ring-slate-200'
      }`}
    >
      {text}
    </pre>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Button variant="ghost" icon={copied ? Check : Copy} onClick={copy}>
      {copied ? 'Kopyalandı' : 'Kopyala'}
    </Button>
  )
}

function Step({ step, open, onToggle }) {
  return (
    <li className="rounded-lg ring-1 ring-slate-200">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-3 py-2 text-left" aria-expanded={open}>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="flex-1 text-sm font-medium text-slate-700">{step.title}</span>
        {step.changed === false && <Badge>değişiklik yok</Badge>}
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 px-3 py-2">
          <p className="text-sm text-slate-600">{step.description}</p>
          {step.changed !== false && <GrammarBlock text={step.grammar} />}
        </div>
      )}
    </li>
  )
}

function CYKTable({ result }) {
  const n = result.word.length
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse font-mono text-xs">
        <tbody>
          {[...result.table].reverse().map((row, r) => (
            <tr key={r}>
              <th className="pr-2 text-right font-sans font-normal text-slate-400">{n - r}</th>
              {row.map((cell, i) => (
                <td key={i} className={`min-w-14 border border-slate-200 px-1.5 py-1 text-center ${r === 0 && i === 0 ? (result.accepted ? 'bg-emerald-50' : 'bg-red-50') : ''}`}>
                  {cell.length ? cell.join(', ') : '∅'}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th />
            {[...result.word].map((ch, i) => (
              <td key={i} className="px-1.5 pt-1 text-center font-semibold text-slate-700">
                {ch}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function CYKTester({ grammar }) {
  const [word, setWord] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => setResult(null), [grammar])
  const run = async () => {
    setError('')
    try {
      setResult(await api.cfg.cyk(grammar, word))
    } catch (e) {
      setResult(null)
      setError(e.message)
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">Dize testi (CYK algoritması)</p>
      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1 font-mono`}
          value={word}
          maxLength={40}
          placeholder="Boş bırakırsanız ε test edilir"
          onChange={(e) => setWord(e.target.value.replace(/\s/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          aria-label="CYK dizesi"
        />
        <Button icon={Play} onClick={run}>
          Test et
        </Button>
      </div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      {result && (
        <div className="space-y-2">
          <p className={`flex items-center gap-1.5 text-sm font-medium ${result.accepted ? 'text-emerald-700' : 'text-red-700'}`}>
            {result.accepted ? <CircleCheck className="h-4 w-4" /> : <CircleX className="h-4 w-4" />}“{result.word || 'ε'}” {result.accepted ? 'gramerin dilinde' : 'gramerin dilinde değil'}
          </p>
          {result.table.length > 0 && <CYKTable result={result} />}
        </div>
      )}
    </div>
  )
}

export default function CNFResult({ result }) {
  const [open, setOpen] = useState(() => new Set(result.steps.filter((s) => s.changed !== false).map((s) => s.key)))
  useEffect(() => setOpen(new Set(result.steps.filter((s) => s.changed !== false).map((s) => s.key))), [result])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  return (
    <div className="space-y-4">
      <div className="rounded-lg ring-1 ring-indigo-200">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="flex flex-1 flex-wrap items-center gap-2 py-0.5 text-left"
            aria-expanded={summaryOpen}
          >
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${summaryOpen ? '' : '-rotate-90'}`} />
            <span className="text-sm font-semibold text-slate-700">Chomsky normal formu</span>
            {result.empty_language ? <Badge tone="amber">Dil boş (∅)</Badge> : <Badge tone="green">CNF ✓</Badge>}
            <span className="text-xs text-slate-500">
              {result.rule_count} kural · {result.variables.length} değişken · başlangıç {result.start}
            </span>
            {!summaryOpen && <span className="text-xs text-indigo-600">göster</span>}
          </button>
          {result.cnf && <CopyButton text={result.cnf} />}
        </div>
        {summaryOpen && (
          <div className="border-t border-indigo-100 p-2">
            <GrammarBlock text={result.cnf} highlight />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Dönüşüm adımları</p>
        <ol className="space-y-1.5">
          {result.steps.map((step) => (
            <Step key={step.key} step={step} open={open.has(step.key)} onToggle={() => toggle(step.key)} />
          ))}
        </ol>
      </div>
      {!result.empty_language && <CYKTester grammar={result.cnf} />}
    </div>
  )
}
