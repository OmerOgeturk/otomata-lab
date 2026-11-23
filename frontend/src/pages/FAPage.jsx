import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  CircleCheck,
  CircleX,
  Eraser,
  FlaskConical,
  Maximize,
  MousePointer2,
  PlusCircle,
  Spline,
  Table2,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import AutomatonCanvas from '../components/AutomatonCanvas'
import FAInspector from '../components/FAInspector'
import FileMenu from '../components/FileMenu'
import InputTape from '../components/InputTape'
import StepControls from '../components/StepControls'
import TransitionTable from '../components/TransitionTable'
import { Alert, Badge, Button, Dialog, IconButton, Panel, inputClass } from '../components/ui'
import { useStepper } from '../hooks/useStepper'
import { useTemplates } from '../hooks/useTemplates'
import { FA_TYPES, dfaWarnings, faLabel, parseAlphabet, parseSymbols, setEdgeSymbols, symbolProblems } from '../lib/fa'
import { EPS, edgeId, nextStateName, removeEdgeIn, removeStateIn, renameIn, toCanvas, toggleAcceptIn } from '../lib/graph'
import { api } from '../services/api'

const MODES = [
  { id: 'select', label: 'Seç / Taşı', icon: MousePointer2 },
  { id: 'addState', label: 'Durum ekle', icon: PlusCircle },
  { id: 'addEdge', label: 'Geçiş ekle', icon: Spline },
  { id: 'delete', label: 'Sil', icon: Eraser },
]

export default function FAPage({ doc, setDoc, loadDoc, fitKey, onGoConvert }) {
  const fa = doc.automaton
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('select')
  const [selected, setSelected] = useState(null)
  const [edgeDialog, setEdgeDialog] = useState(null)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [simulation, setSimulation] = useState(null)
  const [running, setRunning] = useState(false)
  const { templates, error: templateError } = useTemplates(api.fa.templates)
  const [alphabetText, setAlphabetText] = useState(fa.alphabet.join(','))

  useEffect(() => setAlphabetText(fa.alphabet.join(',')), [fa.alphabet])
  useEffect(() => setSimulation(null), [fa])
  useEffect(() => setSelected(null), [fitKey])

  const stepper = useStepper(simulation?.steps.length ?? 0, simulation)
  const step = simulation?.steps[stepper.index]
  const graph = useMemo(() => toCanvas(fa, faLabel, ','), [fa])
  const warnings = useMemo(() => dfaWarnings(fa), [fa])

  const highlight = useMemo(() => {
    if (!step) return null
    return {
      nodes: step.active_states,
      edges: step.transitions.map((t) => edgeId(t.from, t.to)),
      result: stepper.atEnd ? (simulation.accepted ? 'accept' : 'reject') : null,
    }
  }, [step, stepper.atEnd, simulation])

  const update = (fn) => setDoc((d) => ({ ...d, automaton: fn(d.automaton) }))
  const setPositions = (fn) => setDoc((d) => ({ ...d, positions: fn(d.positions) }))

  const addState = (position) => {
    const name = nextStateName(fa.states)
    setPositions((p) => ({ ...p, [name]: position }))
    update((a) => ({ ...a, states: [...a.states, name], start_state: a.start_state || name }))
  }

  const rename = (oldName, newName) => {
    if (fa.states.includes(newName)) return setError(`'${newName}' adında bir durum zaten var.`)
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
    const current = fa.transitions.filter((t) => t.from === from && t.to === to).map((t) => t.symbol)
    setEdgeDialog({ from, to, text: current.join(','), problems: [] })
  }

  const saveEdge = () => {
    const symbols = parseSymbols(edgeDialog.text)
    const problems = symbolProblems(symbols, fa)
    if (problems.length) return setEdgeDialog({ ...edgeDialog, problems })
    update((a) => setEdgeSymbols(a, edgeDialog.from, edgeDialog.to, symbols))
    setSelected(symbols.length ? { kind: 'edge', id: edgeId(edgeDialog.from, edgeDialog.to) } : null)
    setEdgeDialog(null)
  }

  const commitAlphabet = () => {
    const alphabet = parseAlphabet(alphabetText)
    const bad = alphabet.find((s) => [...s].length !== 1)
    if (bad) {
      setError(`Alfabe sembolleri tek karakter olmalı: '${bad}'.`)
      return setAlphabetText(fa.alphabet.join(','))
    }
    update((a) => ({ ...a, alphabet }))
  }

  const changeType = (type) => {
    if (type !== 'ENFA' && fa.transitions.some((t) => t.symbol === EPS)) {
      return setError('Önce ε-geçişlerini kaldırın ya da Dönüşümler sekmesiyle DFA\'ya çevirin.')
    }
    update((a) => ({ ...a, type }))
  }

  const applyTemplate = (id) => {
    const template = templates.find((t) => t.id === id)
    if (template) loadDoc({ name: template.name, automaton: template.automaton })
  }

  const run = async () => {
    setError('')
    setRunning(true)
    try {
      const result = await api.fa.simulate(fa, input)
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

  const symbolsOf = (id) => graph.edges.find((e) => e.id === id)?.label ?? ''

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-[560px] min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
          <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Araç">
            {MODES.map((m) => (
              <IconButton key={m.id} icon={m.icon} label={m.label} active={mode === m.id} onClick={() => setMode(m.id)} />
            ))}
          </div>
          <select
            className={`${inputClass} w-auto`}
            value={fa.type}
            onChange={(e) => changeType(e.target.value)}
            aria-label="Otomat türü"
          >
            {FA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-500">
            Σ =
            <input
              className={`${inputClass} w-24 font-mono`}
              value={alphabetText}
              onChange={(e) => setAlphabetText(e.target.value)}
              onBlur={commitAlphabet}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              aria-label="Alfabe"
            />
          </label>
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
            <FileMenu kind="fa" doc={doc} onLoad={loadDoc} onError={setError} />
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <IconButton icon={Maximize} label="Ekrana sığdır" onClick={() => canvasRef.current?.fit()} />
            <IconButton
              icon={Trash2}
              label="Tuvali temizle"
              onClick={() => loadDoc({ name: '', automaton: { ...fa, states: [], start_state: '', accept_states: [], transitions: [] } })}
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
          {fa.states.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400">
              Başlamak için araç çubuğundan “Durum ekle” modunu seçip tuvale tıklayın ya da bir şablon yükleyin.
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} w-56 font-mono`}
              placeholder="Girdi dizesi, örn. 01011"
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              aria-label="Girdi dizesi"
            />
            <Button variant="primary" icon={FlaskConical} onClick={run} disabled={running || !fa.states.length}>
              {running ? 'Hesaplanıyor…' : 'Test et'}
            </Button>
            <StepControls stepper={stepper} disabled={!simulation} />
            {simulation && stepper.atEnd && (
              <Badge tone={simulation.accepted ? 'green' : 'red'}>
                {simulation.accepted ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
                {simulation.accepted ? 'KABUL' : 'RED'}
              </Badge>
            )}
          </div>
          {simulation && step && (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <InputTape input={simulation.input} position={step.index} />
              <span className="text-slate-500">
                Aktif durum{step.active_states.length > 1 ? 'lar' : ''}:{' '}
                <span className="font-mono font-medium text-slate-800">
                  {step.active_states.length ? `{${step.active_states.join(', ')}}` : '∅ (takıldı)'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <Panel title={selected ? (selected.kind === 'node' ? 'Durum' : 'Geçiş') : 'Nasıl kullanılır?'}>
          <FAInspector
            fa={fa}
            selected={selected}
            labelFor={symbolsOf}
            onRename={rename}
            onSetStart={(id) => update((a) => ({ ...a, start_state: id }))}
            onToggleAccept={(id) => update((a) => toggleAcceptIn(a, id))}
            onDelete={remove}
            onEditEdge={openEdgeDialog}
          />
        </Panel>
        <Panel title="Geçiş tablosu" icon={Table2}>
          <TransitionTable fa={fa} activeStates={step?.active_states} />
          {warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {warnings.map((w) => (
                <p key={w} className="flex gap-1.5 text-xs text-amber-700">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
        </Panel>
        <Button icon={ArrowRightLeft} onClick={onGoConvert} disabled={!fa.states.length}>
          Dönüşüm merkezinde aç
        </Button>
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
            <input
              className={`${inputClass} w-full font-mono`}
              value={edgeDialog.text}
              placeholder="0,1"
              onChange={(e) => setEdgeDialog({ ...edgeDialog, text: e.target.value, problems: [] })}
              onKeyDown={(e) => e.key === 'Enter' && saveEdge()}
              aria-label="Geçiş sembolleri"
            />
            <div className="flex flex-wrap gap-1">
              {fa.alphabet.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm hover:bg-indigo-100"
                  onClick={() => setEdgeDialog({ ...edgeDialog, text: [...parseSymbols(edgeDialog.text), s].join(','), problems: [] })}
                >
                  {s}
                </button>
              ))}
              {fa.type === 'ENFA' && (
                <button
                  type="button"
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm hover:bg-indigo-100"
                  onClick={() => setEdgeDialog({ ...edgeDialog, text: [...parseSymbols(edgeDialog.text), EPS].join(','), problems: [] })}
                >
                  ε
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Sembolleri virgülle ayırın. {fa.type === 'ENFA' ? 'ε için “ε” veya “eps” yazın. ' : ''}Boş bırakırsanız geçiş silinir.
            </p>
            {edgeDialog.problems.map((p) => (
              <Alert key={p}>{p}</Alert>
            ))}
          </>
        )}
      </Dialog>
    </div>
  )
}
