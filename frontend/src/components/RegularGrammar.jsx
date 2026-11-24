import { useState } from 'react'
import { ArrowLeft, ArrowRight, Info, Workflow, Wand2 } from 'lucide-react'
import { normalizeFA } from '../lib/fa'
import { autoLayout } from '../lib/graph'
import { api } from '../services/api'
import { GrammarBlock } from './CNFResult'
import GrammarInput from './GrammarInput'
import MiniCanvas from './MiniCanvas'
import { Alert, Badge, Button, Panel } from './ui'

const EXAMPLES = [
  { name: 'Kitap Örnek 7-10', grammar: 'S → aA | bB\nA → cA | cD\nB → aC\nC → bA\nD → bD | cD | ε' },
  { name: '(10)*', grammar: 'S → 1A | ε\nA → 0S' },
  { name: '0 ile başlayıp 1 ile biten', grammar: 'S → 0A\nA → 0A | 1A | 1' },
]

export default function RegularGrammar({ state, setState, faDoc, onImport }) {
  const { grammar, nfa, fromFa } = state
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const toNfa = async (text = grammar) => {
    setError('')
    setBusy('nfa')
    try {
      const data = await api.cfg.regularToNfa(text)
      const automaton = normalizeFA(data.automaton)
      set({ grammar: text, nfa: { ...data, automaton, positions: autoLayout(automaton.states, automaton.transitions, automaton.start_state), key: Date.now() } })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const fromCanvas = async () => {
    setError('')
    setBusy('grammar')
    try {
      set({ fromFa: { ...(await api.cfg.nfaToRegular(faDoc.automaton)), source: faDoc.name || 'Sonlu Otomat sekmesindeki otomat' } })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-indigo-50/60 p-3 text-sm text-slate-700 ring-1 ring-indigo-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <p>
          <strong>Düzenli gramer (regular grammar):</strong> her kural <code className="font-mono">A → aB</code>, <code className="font-mono">A → a</code> ya da{' '}
          <code className="font-mono">A → ε</code> biçimindedir. <strong>Teorem:</strong> bir dil ancak ve ancak bir düzenli gramerle üretilebiliyorsa düzenlidir. Her değişken bir
          NFA durumudur; <code className="font-mono">A → a</code> ve <code className="font-mono">A → ε</code> kuralları tek bir ek kabul durumuna gider.
        </p>
      </div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Düzenli gramer → NFA" icon={Workflow}>
          <div className="space-y-3">
            <GrammarInput
              className="min-h-32"
              value={grammar}
              onChange={(v) => set({ grammar: v })}
              onSubmit={() => toNfa()}
              aria-label="Düzenli gramer"
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => toNfa(ex.grammar)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {ex.name}
                </button>
              ))}
            </div>
            <Button variant="primary" icon={Wand2} onClick={() => toNfa()} disabled={!!busy || !grammar.trim()}>
              {busy === 'nfa' ? 'Dönüştürülüyor…' : "NFA'ya dönüştür"}
            </Button>
            {nfa && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <Badge tone="indigo">{nfa.automaton.type === 'ENFA' ? 'ε-NFA' : 'NFA'}</Badge>
                  {nfa.automaton.states.length} durum · ek kabul durumu <span className="font-mono">{nfa.accept_state}</span>
                </div>
                <MiniCanvas key={nfa.key} fa={nfa.automaton} positions={nfa.positions} fitKey={nfa.key} />
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="border-b border-slate-200 py-1 font-semibold">Kural</th>
                      <th className="border-b border-slate-200 py-1 font-semibold">Geçiş</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {nfa.mapping.map((m, i) => (
                      <tr key={i}>
                        <td className="border-b border-slate-100 py-1">{m.rule}</td>
                        <td className="border-b border-slate-100 py-1 text-slate-600">{m.transition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button icon={ArrowRight} onClick={() => onImport({ automaton: nfa.automaton, positions: nfa.positions, name: 'Düzenli gramerden NFA' })}>
                  Tuvale aktar ve dizelerle test et
                </Button>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="NFA → düzenli gramer" icon={Workflow}>
          <div className="space-y-3">
            {faDoc.automaton.states.length ? (
              <>
                <p className="text-sm text-slate-600">
                  Kaynak: {faDoc.name || 'Sonlu Otomat sekmesindeki otomat'} · {faDoc.automaton.states.length} durum
                </p>
                <Button variant="primary" icon={Wand2} onClick={fromCanvas} disabled={!!busy}>
                  {busy === 'grammar' ? 'Üretiliyor…' : 'Tuvaldeki otomattan gramer üret'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Sonlu Otomat sekmesinde bir otomat çizin ya da şablon yükleyin; burada düzenli gramerini üretebilirsiniz.</p>
            )}
            {fromFa && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">Kaynak: {fromFa.source}</p>
                <GrammarBlock text={fromFa.grammar} highlight />
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {fromFa.mapping.map((m) => (
                    <span key={m.state} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                      {m.state} ↦ {m.variable}
                      {m.accepting ? ' (kabul → ε)' : ''}
                    </span>
                  ))}
                </div>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
                  <li>Her geçiş δ(q, a) = p için Q → aP kuralı; her kabul durumu için Q → ε kuralı yazıldı.</li>
                  {fromFa.removed_epsilon && <li>ε-geçişleri önce ε-kapanışlarıyla kaldırıldı (A → B birim kuralları düzenli gramerde yoktur).</li>}
                  {fromFa.unreachable.length > 0 && <li>Kullanılmayan durumlar atlandı: {fromFa.unreachable.join(', ')}.</li>}
                  {fromFa.empty_language && <li>Otomat hiçbir dizeyi kabul etmiyor (boş dil).</li>}
                </ul>
                {!fromFa.empty_language && (
                  <Button icon={ArrowLeft} onClick={() => toNfa(fromFa.grammar)}>
                    Bu grameri NFA'ya geri çevir
                  </Button>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
