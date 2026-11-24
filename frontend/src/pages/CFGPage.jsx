import { useEffect, useState } from 'react'
import { FileText, Info, ListTree, Wand2 } from 'lucide-react'
import CNFResult from '../components/CNFResult'
import { Alert, Button, Panel, inputClass } from '../components/ui'
import { api } from '../services/api'

const EXAMPLES = [
  { name: 'aⁿbⁿ', grammar: 'S → aSb | ε' },
  { name: 'Dengeli parantez', grammar: 'S → SS | (S) | ε' },
  { name: 'Çift palindrom', grammar: 'S → aSa | bSb | ε' },
  { name: 'Sipser örneği', grammar: 'S → ASA | aB\nA → B | S\nB → b | ε' },
  { name: 'Aritmetik ifade', grammar: 'E → E+T | T\nT → T*F | F\nF → (E) | a' },
]

export default function CFGPage({ state, setState }) {
  const { grammar, result } = state
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const convert = async (text = grammar) => {
    setError('')
    setBusy(true)
    try {
      set({ result: await api.cfg.cnf(text) })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (grammar.trim() && !result) convert()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ListTree className="h-5 w-5 text-indigo-500" /> Bağlamdan Bağımsız Gramer
        </h2>
        <p className="text-sm text-slate-500">Grameri yazın; Chomsky normal formuna adım adım dönüştürülsün ve CYK ile dize testi yapın. Yapay zeka gerektirmez.</p>
      </div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Gramer" icon={FileText}>
          <div className="space-y-3">
            <textarea
              className={`${inputClass} block min-h-40 w-full resize-y font-mono`}
              value={grammar}
              spellCheck={false}
              placeholder={'S → aSb | ε'}
              onChange={(e) => set({ grammar: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && convert()}
              aria-label="Gramer kuralları"
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => {
                    set({ grammar: ex.grammar })
                    convert(ex.grammar)
                  }}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {ex.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" icon={Wand2} onClick={() => convert()} disabled={busy || !grammar.trim()}>
                {busy ? 'Dönüştürülüyor…' : "CNF'ye dönüştür"}
              </Button>
              <span className="text-xs text-slate-400">Ctrl+Enter</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <ul className="space-y-0.5">
                <li>Her satıra bir değişken: <code className="font-mono">S → aSb | ε</code> (ok için <code className="font-mono">-&gt;</code> da yazılabilir).</li>
                <li>Değişkenler büyük harf (<code className="font-mono">A, S₀, S_0, A'</code>) ya da <code className="font-mono">&lt;İfade&gt;</code>; diğer her karakter bir terminaldir.</li>
                <li>Boş dize için <code className="font-mono">ε</code>, <code className="font-mono">λ</code> veya <code className="font-mono">eps</code>. İlk satırın solu başlangıç değişkenidir.</li>
              </ul>
            </div>
          </div>
        </Panel>
        <Panel title="Sonuç" icon={ListTree}>
          {result ? <CNFResult result={result} /> : <p className="text-sm text-slate-500">Bir gramer yazıp dönüştürün ya da soldaki örneklerden birini seçin.</p>}
        </Panel>
      </div>
    </div>
  )
}
