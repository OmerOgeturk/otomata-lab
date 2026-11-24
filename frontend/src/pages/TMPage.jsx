import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleCheck, CircleX, Cpu, FlaskConical, Info, Maximize, Table2, Timer } from 'lucide-react'
import AutomatonCanvas from '../components/AutomatonCanvas'
import FileMenu from '../components/FileMenu'
import StepControls from '../components/StepControls'
import TapeView from '../components/TapeView'
import { Alert, Badge, Button, IconButton, Panel, inputClass } from '../components/ui'
import { useStepper } from '../hooks/useStepper'
import { useTemplates } from '../hooks/useTemplates'
import { edgeId, toCanvas } from '../lib/graph'
import { tmRule, tmTable, withAbsolutePositions } from '../lib/tm'
import { api } from '../services/api'

const EXAMPLES = { anbncn: 'aabbcc', '0n1n': '0011', 'binary-increment': '1011' }

const RESULTS = {
  accepted: { tone: 'green', label: 'KABUL', icon: CircleCheck },
  rejected: { tone: 'red', label: 'RED', icon: CircleX },
  limit: { tone: 'amber', label: 'ADIM SINIRI', icon: Timer },
}

function MachineTable({ tm, state, next }) {
  const { symbols, rows } = tmTable(tm)
  if (!rows.length) return <p className="text-sm text-slate-400">Önce bir şablon seçin.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="border-b border-slate-200 px-1.5 py-1.5 text-left font-sans font-semibold">δ</th>
            {symbols.map((s) => (
              <th key={s} className="border-b border-slate-200 px-1.5 py-1.5 text-center font-semibold">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.state} className={row.state === state ? 'bg-amber-50' : ''}>
              <th className="whitespace-nowrap border-b border-slate-100 px-1.5 py-1.5 text-left font-medium text-slate-700">
                <span className="inline-block w-3 text-indigo-500">{row.start ? '→' : ''}</span>
                <span className="inline-block w-2.5 text-emerald-600">{row.accept ? '*' : ''}</span>
                {row.state}
              </th>
              {row.cells.map((t, i) => (
                <td
                  key={symbols[i]}
                  className={`whitespace-nowrap border-b border-slate-100 px-1.5 py-1.5 text-center ${
                    t && t === next ? 'bg-amber-300 font-semibold text-amber-950' : t ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {t ? `${t.write},${t.move},${t.to}` : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">Hücre: yaz, hareket, hedef · vurgulu hücre sıradaki geçiştir.</p>
    </div>
  )
}

export default function TMPage({ doc, setDoc, loadDoc, fitKey }) {
  const tm = doc.automaton
  const canvasRef = useRef(null)
  const [input, setInput] = useState(doc.input ?? '')
  const [maxSteps, setMaxSteps] = useState(2000)
  const [simulation, setSimulation] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const { templates, error: templateError } = useTemplates(api.tm.templates)

  useEffect(() => setSimulation(null), [tm])
  useEffect(() => setInput(doc.input ?? ''), [fitKey])

  const stepper = useStepper(simulation?.steps.length ?? 0, simulation)
  const step = simulation?.steps[stepper.index]
  const nextTransition = simulation?.steps[stepper.index + 1]?.transition
  const next = nextTransition && tm.transitions.find((t) => t.from === nextTransition.from && t.read === nextTransition.read)
  const graph = useMemo(() => toCanvas(tm, tmRule, '\n'), [tm])
  const template = templates.find((t) => t.id === doc.templateId)

  const highlight = useMemo(() => {
    if (!step) return null
    const end = stepper.atEnd
    return {
      nodes: [step.state],
      edges: step.transition ? [edgeId(step.transition.from, step.transition.to)] : [],
      result: end && simulation.result !== 'limit' ? (simulation.result === 'accepted' ? 'accept' : 'reject') : null,
    }
  }, [step, stepper.atEnd, simulation])

  const applyTemplate = (id) => {
    const t = templates.find((x) => x.id === id)
    if (t) loadDoc({ name: t.name, templateId: t.id, automaton: t.automaton, input: EXAMPLES[t.id] ?? '' })
  }

  const run = async () => {
    setError('')
    setRunning(true)
    try {
      const result = await api.tm.simulate(tm, input, maxSteps)
      setSimulation({ ...result, steps: withAbsolutePositions(result.steps), input })
      setDoc((d) => ({ ...d, input }))
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const finished = simulation && stepper.atEnd
  const result = finished ? RESULTS[simulation.result] : null
  const headSymbol = step ? (step.tape[step.head] ?? tm.blank_symbol) : null

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Turing makinesi şablonları">
            {templateError && <span className="text-sm text-red-600">Şablonlar yüklenemedi: {templateError}</span>}
            {templates.map((t) => (
              <Button key={t.id} active={doc.templateId === t.id} onClick={() => applyTemplate(t.id)}>
                {t.name}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <FileMenu kind="tm" doc={doc} onLoad={loadDoc} onError={setError} />
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <IconButton icon={Maximize} label="Ekrana sığdır" onClick={() => canvasRef.current?.fit()} />
          </div>
        </div>

        {error && <Alert onClose={() => setError('')}>{error}</Alert>}

        {(template || doc.name) && (
          <p className="flex items-start gap-2 px-1 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <span>
              <b className="text-slate-800">{template?.name ?? doc.name}</b>
              {template ? ` — ${template.description}` : ' — içe aktarılan makine (sunucuda doğrulanır).'}
            </span>
          </p>
        )}

        <div className="relative h-[340px] overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:22px_22px]">
          <AutomatonCanvas
            ref={canvasRef}
            nodes={graph.nodes}
            edges={graph.edges}
            positions={doc.positions}
            highlight={highlight}
            fitKey={fitKey}
            onMove={(id, pos) => setDoc((d) => ({ ...d, positions: { ...d.positions, [id]: pos } }))}
          />
          {tm.states.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-400">
              <Cpu className="h-8 w-8" />
              Matematiksel doğruluğu kesin klasik makinelerden birini yukarıdan seçin.
            </div>
          )}
          <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-slate-400">Etiket: okunan → yazılan, hareket</span>
        </div>

        <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} w-48 font-mono`}
              placeholder="Şerit girdisi"
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              aria-label="Şerit girdisi"
            />
            <label className="flex items-center gap-1.5 text-sm text-slate-500">
              En çok
              <input
                type="number"
                min={1}
                max={100000}
                className={`${inputClass} w-24 tabular-nums`}
                value={maxSteps}
                onChange={(e) => setMaxSteps(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
                aria-label="Adım sınırı"
              />
              adım
            </label>
            <Button variant="primary" icon={FlaskConical} onClick={run} disabled={running || !tm.states.length}>
              {running ? 'Çalışıyor…' : 'Çalıştır'}
            </Button>
            <StepControls stepper={stepper} disabled={!simulation} />
            {result && (
              <Badge tone={result.tone}>
                <result.icon className="h-3.5 w-3.5" />
                {result.label}
              </Badge>
            )}
          </div>

          {simulation && step ? (
            <div className="mt-4 space-y-3">
              <TapeView steps={simulation.steps} index={stepper.index} blank={tm.blank_symbol} />
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                <span>
                  Durum: <span className="font-mono font-medium text-slate-800">{step.state}</span>
                </span>
                <span>
                  Kafanın altındaki sembol: <span className="font-mono font-medium text-slate-800">{headSymbol}</span>
                </span>
                <span>
                  Son geçiş:{' '}
                  <span className="font-mono font-medium text-slate-800">
                    {step.transition
                      ? `${step.transition.from} → ${step.transition.to}  [${tmRule(step.transition)}]  ${step.transition.move === 'L' ? '← sola' : 'sağa →'}`
                      : '— (başlangıç)'}
                  </span>
                </span>
              </div>
              {finished && simulation.result === 'rejected' && (
                <p className="text-sm text-slate-500">
                  <span className="font-mono">{step.state}</span> durumunda <span className="font-mono">'{headSymbol}'</span> için geçiş tanımlı
                  değil; makine kabul durumuna ulaşmadan durdu.
                </p>
              )}
              {finished && simulation.result === 'limit' && (
                <Alert tone="warning">
                  {maxSteps} adımda durmadı. Makine sonsuz döngüde olabilir ya da daha fazla adım gerekebilir.
                </Alert>
              )}
              {finished && simulation.result === 'accepted' && (
                <p className="text-sm text-slate-600">
                  Şerit çıktısı: <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-800">{simulation.output || 'ε'}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Girdiyi yazıp “Çalıştır”a basın; şerit, okuma/yazma kafası ve durum değişimleri adım adım burada görünür.
            </p>
          )}
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <Panel title="Geçiş tablosu" icon={Table2}>
          <MachineTable tm={tm} state={step?.state} next={next} />
        </Panel>
        <Panel title="Makine tanımı" icon={Cpu}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Q</dt>
            <dd className="font-mono text-slate-700">{`{${tm.states.join(', ')}}`}</dd>
            <dt className="text-slate-500">Σ</dt>
            <dd className="font-mono text-slate-700">{`{${tm.input_alphabet.join(', ')}}`}</dd>
            <dt className="text-slate-500">Γ</dt>
            <dd className="font-mono text-slate-700">{`{${tm.tape_alphabet.join(', ')}}`}</dd>
            <dt className="text-slate-500">Boşluk</dt>
            <dd className="font-mono text-slate-700">{tm.blank_symbol}</dd>
            <dt className="text-slate-500">Başlangıç</dt>
            <dd className="font-mono text-slate-700">{tm.start_state || '—'}</dd>
            <dt className="text-slate-500">Kabul</dt>
            <dd className="font-mono text-slate-700">{`{${tm.accept_states.join(', ')}}`}</dd>
          </dl>
          <p className="mt-3 text-xs text-slate-400">Tüm adımlar sunucuda automata-lib DTM sınıfıyla hesaplanır.</p>
        </Panel>
      </aside>
    </div>
  )
}
