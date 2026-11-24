import { Suspense, lazy, useState } from 'react'
import { ArrowRightLeft, Blend, BookOpen, Cpu, Layers, ListTree, Sparkles, Workflow } from 'lucide-react'
import { useDocument } from './hooks/useDocument'
import { emptyFA, normalizeFA } from './lib/fa'
import { ensurePositions } from './lib/graph'
import { emptyPDA, normalizePDA } from './lib/pda'
import { emptyTM, normalizeTM } from './lib/tm'
import ConvertPage from './pages/ConvertPage'
import FAPage from './pages/FAPage'
import PDAPage from './pages/PDAPage'
import TMPage from './pages/TMPage'

const AIPage = lazy(() => import('./pages/AIPage'))
const CFGPage = lazy(() => import('./pages/CFGPage'))
const AlgebraPage = lazy(() => import('./pages/AlgebraPage'))
const TheoryPage = lazy(() => import('./pages/TheoryPage'))

const TABS = [
  { id: 'fa', label: 'Sonlu Otomat', icon: Workflow },
  { id: 'convert', label: 'Dönüşümler', icon: ArrowRightLeft },
  { id: 'algebra', label: 'Dil İşlemleri', icon: Blend },
  { id: 'pda', label: 'Yığıtlı Otomat', icon: Layers },
  { id: 'tm', label: 'Turing Makinesi', icon: Cpu },
  { id: 'cfg', label: 'Gramer (CNF)', icon: ListTree },
  { id: 'ai', label: 'Yapay Zeka', icon: Sparkles },
  { id: 'theory', label: 'Konu Anlatımı', icon: BookOpen },
]

const preparer = (normalize, empty) => (data) => {
  const automaton = normalize(data.automaton ?? empty())
  return {
    id: data.id,
    name: data.name ?? '',
    ...(data.templateId ? { templateId: data.templateId } : {}),
    ...(data.input !== undefined ? { input: data.input } : {}),
    automaton,
    positions: ensurePositions(automaton, data.positions ?? {}),
  }
}

const prepareFA = preparer(normalizeFA, emptyFA)
const preparePDA = preparer(normalizePDA, emptyPDA)
const prepareTM = preparer(normalizeTM, emptyTM)

export default function App() {
  const [tab, setTab] = useState('fa')
  const fa = useDocument('fa', prepareFA)
  const pda = useDocument('pda', preparePDA)
  const tm = useDocument('tm', prepareTM)
  const [aiState, setAiState] = useState({ prompt: '', generated: null, explanation: null, explainSource: '' })
  const [imageState, setImageState] = useState({ image: null, task: 'grammar', question: '', result: null })
  const [cfgState, setCfgState] = useState({
    mode: 'cnf',
    grammar: 'S → aSb | ε',
    result: null,
    regular: { grammar: 'S → aA | bB\nA → cA | cD\nB → aC\nC → bA\nD → bD | cD | ε', nfa: null, fromFa: null },
  })
  const [algebraState, setAlgebraState] = useState({
    alphabet: '0, 1',
    languages: [
      { name: 'A', combine: 'and', conditions: [{ kind: 'contains', value: '00' }, { kind: 'not_contains', value: '11' }] },
      { name: 'B', combine: 'and', conditions: [{ kind: 'not_contains', value: '11' }] },
      { name: 'C', combine: 'and', conditions: [{ kind: 'not_contains', value: '000' }] },
    ],
    expression: '(A∪B)*C',
    result: null,
  })
  const [autoExplain, setAutoExplain] = useState(false)

  const importAutomaton = ({ name, automaton, positions }) => {
    fa.loadDoc({ name, automaton, positions })
    setTab('fa')
  }

  const openGrammar = (grammar) => {
    setCfgState((s) => ({ ...s, mode: 'cnf', grammar, result: null }))
    setTab('cfg')
  }

  const explainFa = () => {
    setAutoExplain(true)
    setTab('ai')
  }

  const importGenerated = (generated) => {
    fa.loadDoc({ name: `YZ: ${generated.prompt.slice(0, 48)}`, automaton: generated.automaton, positions: generated.positions })
    setTab('fa')
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
              <circle cx="16" cy="16" r="13" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="8.5" fill="none" stroke="#4f46e5" strokeWidth="2" />
            </svg>
            <div className="leading-tight">
              <h1 className="font-semibold text-slate-900">Otomata Teorisi Laboratuvarı</h1>
              <p className="text-xs text-slate-500">Biçimsel diller ve otomatlar için interaktif çalışma alanı</p>
            </div>
          </div>
          <nav className="-mb-px flex flex-wrap gap-1" aria-label="Modüller">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4">
        {tab === 'fa' && (
          <FAPage {...fa} onGoConvert={() => setTab('convert')} onExplain={explainFa} />
        )}
        {tab === 'convert' && <ConvertPage doc={fa.doc} loadDoc={fa.loadDoc} onGoEditor={() => setTab('fa')} />}
        {tab === 'pda' && <PDAPage {...pda} />}
        {tab === 'tm' && <TMPage {...tm} />}
        {tab === 'algebra' && (
          <Suspense fallback={<p className="p-6 text-sm text-slate-400">Yükleniyor…</p>}>
            <AlgebraPage state={algebraState} setState={setAlgebraState} faDoc={fa.doc} onImport={importAutomaton} />
          </Suspense>
        )}
        {tab === 'cfg' && (
          <Suspense fallback={<p className="p-6 text-sm text-slate-400">Yükleniyor…</p>}>
            <CFGPage state={cfgState} setState={setCfgState} faDoc={fa.doc} onImport={importAutomaton} />
          </Suspense>
        )}
        {tab === 'ai' && (
          <Suspense fallback={<p className="p-6 text-sm text-slate-400">Yükleniyor…</p>}>
            <AIPage
              state={aiState}
              setState={setAiState}
              imageState={imageState}
              setImageState={setImageState}
              faDoc={fa.doc}
              onImport={importGenerated}
              onOpenGrammar={openGrammar}
              autoExplain={autoExplain}
              onAutoExplainDone={() => setAutoExplain(false)}
            />
          </Suspense>
        )}
        {tab === 'theory' && (
          <Suspense fallback={<p className="p-6 text-sm text-slate-400">Yükleniyor…</p>}>
            <TheoryPage onNavigate={setTab} />
          </Suspense>
        )}
      </main>
    </div>
  )
}
