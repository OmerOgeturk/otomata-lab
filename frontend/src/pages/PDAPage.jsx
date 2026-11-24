import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleCheck,
  CircleX,
  Eraser,
  FlaskConical,
  Layers,
  ListOrdered,
  Maximize,
  MousePointer2,
  PlusCircle,
  ShieldCheck,
  Spline,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import AutomatonCanvas from '../components/AutomatonCanvas'
import FAInspector from '../components/FAInspector'
import FileMenu from '../components/FileMenu'
import InputTape from '../components/InputTape'
import StackView from '../components/StackView'
import StepControls from '../components/StepControls'
import { Alert, Badge, Button, Dialog, IconButton, Panel, inputClass } from '../components/ui'
import { useStepper } from '../hooks/useStepper'
import { useTemplates } from '../hooks/useTemplates'
import { parseAlphabet } from '../lib/fa'
import { EPS, edgeId, nextStateName, removeEdgeIn, removeStateIn, renameIn, toCanvas, toggleAcceptIn } from '../lib/graph'
import { parseRules, pdaRule, setEdgeRules } from '../lib/pda'
import { api } from '../services/api'

const MODES = [
  { id: 'select', label: 'Seç / Taşı', icon: MousePointer2 },
  { id: 'addState', label: 'Durum ekle', icon: PlusCircle },
  { id: 'addEdge', label: 'Geçiş ekle', icon: Spline },
  { id: 'delete', label: 'Sil', icon: Eraser },
]

const sameRule = (a, b) => a && b && a.from === b.from && a.to === b.to && pdaRule(a) === pdaRule(b)

function SymbolsField({ label, title, value, onCommit, width = 'w-20' }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-500" title={title}>
      {label}
      <input
        className={`${inputClass} ${width} font-mono`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(text, () => setText(value))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={title}
      />
    </label>
  )
}

export default function PDAPage({ doc, setDoc, loadDoc, fitKey }) {
  const pda = doc.automaton
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('select')
  const [selected, setSelected] = useState(null)
  const [edgeDialog, setEdgeDialog] = useState(null)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [simulation, setSimulation] = useState(null)
  const [running, setRunning] = useState(false)
  const { templates, error: templateError } = useTemplates(api.pda.templates)

  useEffect(() => setSimulation(null), [pda])
  useEffect(() => setSelected(null), [fitKey])

  const stepper = useStepper(simulation?.steps.length ?? 0, simulation)
  const step = simulation?.steps[stepper.index]
  const graph = useMemo(() => toCanvas(pda, pdaRule, '\n'), [pda])

  const highlight = useMemo(() => {
    if (!step) return null
    return {
      nodes: [step.state],
      edges: step.transition ? [edgeId(step.transition.from, step.transition.to)] : [],
      result: stepper.atEnd ? (simulation.accepted ? 'accept' : 'reject') : null,
    }
  }, [step, stepper.atEnd, simulation])

  const update = (fn) => setDoc((d) => ({ ...d, automaton: fn(d.automaton) }))
  const setPositions = (fn) => setDoc((d) => ({ ...d, positions: fn(d.positions) }))

  const addState = (position) => {
    const name = nextStateName(pda.states)
    setPositions((p) => ({ ...p, [name]: position }))
    update((a) => ({ ...a, states: [...a.states, name], start_state: a.start_state || name }))
  }

  const rename = (oldName, newName) => {
    if (pda.states.includes(newName)) return setError(`'${newName}' adında bir durum zaten var.`)
    setPositions((p) => {
      const { [oldName]: pos, ...rest } = p
      return { ...rest, [newName]: pos }
    })
    update((a) => renameIn(a, oldName, newName))
    setSelected({ kind: 'node', id: newName })
  }

  const remove = ({ kind, id }) => {
    if (kind === 'node') update((a) => removeStateIn(a, id))
    else update((a) => removeEdgeIn(a, id))
    setSelected(null)
  }

  const openEdgeDialog = (from, to) => {
    const current = pda.transitions.filter((t) => t.from === from && t.to === to).map(pdaRule)
    setEdgeDialog({ from, to, text: current.join('\n'), problems: [] })
  }

  const saveEdge = () => {
    const { rules, problems } = parseRules(edgeDialog.text)
    if (problems.length) return setEdgeDialog({ ...edgeDialog, problems })
    update((a) => setEdgeRules(a, edgeDialog.from, edgeDialog.to, rules))
    setSelected(rules.length ? { kind: 'edge', id: edgeId(edgeDialog.from, edgeDialog.to) } : null)
    setEdgeDialog(null)
  }

  const insertIntoDialog = (snippet) => {
    const text = edgeDialog.text
    setEdgeDialog({ ...edgeDialog, text: text + snippet, problems: [] })
  }

  const commitSymbols = (key, label) => (text, revert) => {
    const symbols = parseAlphabet(text)
    const bad = symbols.find((s) => [...s].length !== 1)
    if (bad) {
      setError(`${label} sembolleri tek karakter olmalı: '${bad}'.`)
      return revert()
    }
    if (key === 'stack_alphabet' && !symbols.includes(pda.initial_stack_symbol)) symbols.push(pda.initial_stack_symbol)
    update((a) => ({ ...a, [key]: symbols }))
  }

  const commitInitial = (text, revert) => {
    const symbol = text.trim()
    if ([...symbol].length !== 1 || symbol === EPS) {
      setError('Başlangıç yığıt sembolü tek bir karakter olmalı (örn. $).')
      return revert()
    }
    update((a) => ({
      ...a,
      initial_stack_symbol: symbol,
      stack_alphabet: a.stack_alphabet.includes(symbol) ? a.stack_alphabet : [...a.stack_alphabet, symbol],
    }))
  }

  const applyTemplate = (id) => {
    const template = templates.find((t) => t.id === id)
    if (template) loadDoc({ name: template.name, automaton: template.automaton })
  }

  const run = async () => {
    setError('')
    setRunning(true)
    try {
      const result = await api.pda.simulate(pda, input)
      setSimulation({ ...result, input })
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select, [role="dialog"]')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) remove(selected)
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rulesOf = (id) => graph.edges.find((e) => e.id === id)?.label ?? ''
  const finished = simulation && stepper.atEnd

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-[560px] min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Araç">
            {MODES.map((m) => (
              <IconButton key={m.id} icon={m.icon} label={m.label} active={mode === m.id} onClick={() => setMode(m.id)} />
            ))}
          </div>
          <SymbolsField label="Σ =" title="Girdi alfabesi" value={pda.alphabet.join(',')} onCommit={commitSymbols('alphabet', 'Girdi alfabesi')} />
          <SymbolsField
            label="Γ ="
            title="Yığıt alfabesi"
            value={pda.stack_alphabet.join(',')}
            onCommit={commitSymbols('stack_alphabet', 'Yığıt alfabesi')}
            width="w-24"
          />
          <SymbolsField label="Z₀ =" title="Başlangıç yığıt sembolü" value={pda.initial_stack_symbol} onCommit={commitInitial} width="w-11" />
          <select
            className={`${inputClass} w-auto max-w-56`}
            value=""
            onChange={(e) => applyTemplate(e.target.value)}
            disabled={!templates.length}
            title={templateError || 'Hazır şablon yükle'}
            aria-label="Şablon"
          >
            <option value="">{templateError ? 'Şablonlar yüklenemedi' : 'Şablon yükle…'}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-0.5">
            <FileMenu kind="pda" doc={doc} onLoad={loadDoc} onError={setError} />
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <IconButton icon={Maximize} label="Ekrana sığdır" onClick={() => canvasRef.current?.fit()} />
            <IconButton
              icon={Trash2}
              label="Tuvali temizle"
              onClick={() => loadDoc({ name: '', automaton: { ...pda, states: [], start_state: '', accept_states: [], transitions: [] } })}
            />
          </div>
        </div>

        {error && <Alert onClose={() => setError('')}>{error}</Alert>}

        <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:22px_22px]">
          <AutomatonCanvas
            ref={canvasRef}
            nodes={graph.nodes}
            edges={graph.edges}
            positions={doc.positions}
            highlight={highlight}
            mode={mode}
            selected={selected}
            fitKey={fitKey}
            onAddState={addState}
            onConnect={openEdgeDialog}
            onSelect={setSelected}
            onDelete={remove}
            onMove={(id, pos) => setPositions((p) => ({ ...p, [id]: pos }))}
          />
          {pda.states.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400">
              “Durum ekle” modunda tuvale tıklayın ya da aⁿbⁿ gibi bir şablon yükleyin. Geçiş etiketleri “girdi, çek → at” biçimindedir.
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} w-56 font-mono`}
              placeholder="Girdi dizesi, örn. aabb"
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              aria-label="Girdi dizesi"
            />
            <Button variant="primary" icon={FlaskConical} onClick={run} disabled={running || !pda.states.length}>
              {running ? 'Hesaplanıyor…' : 'Test et'}
            </Button>
            <StepControls stepper={stepper} disabled={!simulation} />
            {finished && (
              <Badge tone={simulation.accepted ? 'green' : 'red'}>
                {simulation.accepted ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
                {simulation.accepted ? 'KABUL' : 'RED'}
              </Badge>
            )}
            {finished && simulation.verified === true && (
              <span className="flex items-center gap-1 text-xs text-emerald-700" title="Sonuç automata-lib NPDA motoruyla karşılaştırıldı">
                <ShieldCheck className="h-3.5 w-3.5" /> automata-lib ile doğrulandı
              </span>
            )}
          </div>
          {simulation && step && (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <InputTape input={simulation.input} position={step.consumed.length} />
                <span className="text-slate-500">
                  Durum: <span className="font-mono font-medium text-slate-800">{step.state}</span>
                </span>
                <span className="text-slate-500">
                  Uygulanan geçiş:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {step.transition ? `${step.transition.from} → ${step.transition.to}  [${pdaRule(step.transition)}]` : '— (başlangıç yapılandırması)'}
                  </span>
                </span>
              </div>
              {finished && !simulation.accepted && !simulation.limit_reached && (
                <p className="text-xs text-slate-500">Girdiyi tüketip kabul durumuna ulaşan hiçbir hesaplama yolu yok.</p>
              )}
              {simulation.limit_reached && (
                <Alert tone="warning">
                  Arama sınırına ulaşıldı (çok fazla yapılandırma ya da sınırsız büyüyen yığıt). Sonuç kesin olmayabilir.
                </Alert>
              )}
              {finished && simulation.verified === false && (
                <Alert tone="warning">Uyarı: automata-lib doğrulaması farklı bir sonuç verdi.</Alert>
              )}
            </div>
          )}
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <Panel title="Canlı yığıt" icon={Layers}>
          <StackView stack={step?.stack} initialSymbol={pda.initial_stack_symbol} />
        </Panel>
        <Panel title={selected ? (selected.kind === 'node' ? 'Durum' : 'Geçiş') : 'Nasıl kullanılır?'}>
          <FAInspector
            fa={pda}
            selected={selected}
            labelFor={rulesOf}
            editLabel="Kuralları düzenle"
            onRename={rename}
            onSetStart={(id) => update((a) => ({ ...a, start_state: id }))}
            onToggleAccept={(id) => update((a) => toggleAcceptIn(a, id))}
            onDelete={remove}
            onEditEdge={openEdgeDialog}
          />
        </Panel>
        <Panel title="Geçişler (δ)" icon={ListOrdered}>
          {pda.transitions.length === 0 ? (
            <p className="text-sm text-slate-400">Henüz geçiş yok.</p>
          ) : (
            <ul className="max-h-64 space-y-0.5 overflow-y-auto font-mono text-xs">
              {pda.transitions.map((t, i) => (
                <li
                  key={i}
                  className={`rounded px-2 py-1 ${sameRule(t, step?.transition) ? 'bg-amber-100 text-amber-900' : 'text-slate-600'}`}
                >
                  δ({t.from}, {t.input}, {t.pop}) ∋ ({t.to}, {t.push})
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">Kabul: girdi bitince kabul durumunda olmak.</p>
        </Panel>
      </aside>

      <Dialog
        open={!!edgeDialog}
        title={edgeDialog ? `Geçiş: ${edgeDialog.from} → ${edgeDialog.to}` : ''}
        onClose={() => setEdgeDialog(null)}
        footer={
          <>
            <Button onClick={() => setEdgeDialog(null)}>Vazgeç</Button>
            <Button variant="primary" onClick={saveEdge}>
              Kaydet
            </Button>
          </>
        }
      >
        {edgeDialog && (
          <>
            <textarea
              className={`${inputClass} block min-h-28 w-full resize-y font-mono`}
              value={edgeDialog.text}
              placeholder={'a, ε → A\nε, $ → $'}
              onChange={(e) => setEdgeDialog({ ...edgeDialog, text: e.target.value, problems: [] })}
              onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && saveEdge()}
              aria-label="Geçiş kuralları"
            />
            <div className="flex flex-wrap gap-1">
              {['ε', '→', ', ', ...pda.alphabet, ...pda.stack_alphabet].map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm hover:bg-indigo-100"
                  onClick={() => insertIntoDialog(s === '→' ? ' → ' : s)}
                >
                  {s.trim() || '␣'}
                </button>
              ))}
              <button
                type="button"
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs hover:bg-indigo-100"
                onClick={() => insertIntoDialog(edgeDialog.text && !edgeDialog.text.endsWith('\n') ? '\n' : '')}
              >
                yeni satır
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Her satıra bir kural yazın: <span className="font-mono">girdi, çek → at</span>. ε için “ε” veya “eps”; “-&gt;” de kabul edilir.
              Çoklu atmada ilk karakter yığıtın tepesine gelir (örn. <span className="font-mono">a, $ → A$</span>). Boş bırakırsanız geçiş silinir.
              Kaydetmek için Ctrl+Enter.
            </p>
            {edgeDialog.problems.map((p) => (
              <Alert key={p}>
                <span className="flex gap-1.5">
                  <TriangleAlert className="h-4 w-4 shrink-0" /> {p}
                </span>
              </Alert>
            ))}
          </>
        )}
      </Dialog>
    </div>
  )
}
